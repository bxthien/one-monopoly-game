import { useEffect, useId, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, RotateCcw, X } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { BOARD_TILES, getVoyagePayment, type GameState, type VoyageLogEntry } from '@one-monopoly/shared';
import { BoardDialog } from './BoardDialog.js';
import { portGuide } from './ports/portGuide.js';
import { voyageRoute } from './ports/voyageRoute.js';
import './voyage-log.css';

const number = new Intl.NumberFormat('vi-VN');
const money = (amount: number) => `$${number.format(amount)}M`;
const guide = (id: number) => portGuide[BOARD_TILES[id].code];
const cargoName = (entry: VoyageLogEntry) =>
  entry.kind === 'empty' ? 'Container rỗng' : entry.reeferBonus !== undefined ? 'Hàng lạnh' : 'Hàng khô';

function VoyageMap({ entry }: { entry: VoyageLogEntry }) {
  const from = guide(entry.originTileId), to = guide(entry.destinationTileId);
  const route = useMemo(() => voyageRoute(from, to), [from, to]);
  const [play, setPlay] = useState(0);
  const reduceMotion = useReducedMotion();
  const pattern = useId();
  const [progress, setProgress] = useState(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (reduceMotion) { setProgress(1); return; }
    let start: number | undefined;
    setProgress(0);
    let frame: number;
    const advance = (now: number) => {
      start ??= now;
      const t = Math.min(1, (now - start) / 2100);
      setProgress(t);
      if (t < 1) frame = requestAnimationFrame(advance);
    };
    frame = requestAnimationFrame(advance);
    return () => cancelAnimationFrame(frame);
  }, [play, reduceMotion]);

  const first = route.points[0], last = route.points[route.points.length - 1];
  const step = progress * (route.points.length - 1);
  const i = Math.floor(step), next = route.points[Math.min(i + 1, route.points.length - 1)];
  const here = route.points[i];
  const x = here.x + (next.x - here.x) * (step - i);
  const y = here.y + (next.y - here.y) * (step - i);
  const gridSpacing = [1, 5, 15, 30].find(degrees => degrees * route.scale >= 42) ?? 30;

  return <figure className="voyage-map">
    <svg viewBox="0 0 480 224" role="img" aria-label={`Tuyến hàng từ ${from.name} đến ${to.name}, ${number.format(entry.distanceNm)} hải lý`}
      data-voyage-route={entry.bookingId} data-voyage-progress={progress.toFixed(3)}>
      <defs><pattern id={pattern} width={gridSpacing} height={gridSpacing} patternUnits="userSpaceOnUse">
        <path d={`M${gridSpacing} 0H0V${gridSpacing}`} fill="none" stroke="#719891" strokeWidth={.65 / route.scale} />
      </pattern></defs>
      <g transform={`translate(${route.left} ${route.top}) scale(${route.scale})`}>
        {route.mapOffsets.map(offset => <g key={offset} transform={`translate(${offset} 0)`}>
          <image href="/images/world-atlas.svg" width="360" height="180" />
          <rect width="360" height="180" fill={`url(#${pattern})`} opacity=".5" />
        </g>)}
      </g>
      <path d={route.path} fill="none" stroke="#5f847c" strokeWidth="1.6" strokeDasharray="3 4" />
      <path d={route.path} fill="none" stroke="#a2255d" strokeWidth="2.3"
        pathLength="1" strokeDasharray="1" strokeDashoffset={1 - progress} />
      <circle cx={first.x} cy={first.y} r="4.3" fill="#164b52" stroke="#fff9e7" strokeWidth="1.8" />
      <circle cx={last.x} cy={last.y} r="5.3" fill="#fff9e7" stroke="#9e225a" strokeWidth="2" />
      <circle cx={last.x} cy={last.y} r="2" fill="#9e225a" />
      {progress < 1 && <circle cx={x} cy={y} r="3.3" fill="#a2255d" stroke="#fff9e7" strokeWidth="1.2" />}
      {[{ point: first, code: from.code, side: first.x <= last.x ? -1 : 1 },
        { point: last, code: to.code, side: first.x <= last.x ? 1 : -1 }].map(({ point, code, side }) =>
        <text key={code} x={point.x + 8 * side} y={point.y - 7} textAnchor={side < 0 ? 'end' : 'start'}
          className="voyage-port-label">{code}</text>)}
    </svg>
    <figcaption><span>Tuyến minh họa từ cảng xếp đến cảng dỡ.</span>
      {!reduceMotion && <button type="button" data-voyage-replay onClick={() => setPlay(n => n + 1)}>
        <RotateCcw size={13} aria-hidden="true" /> Phát lại</button>}
    </figcaption>
  </figure>;
}

function Fare({ entry }: { entry: VoyageLogEntry }) {
  return <dl className="voyage-fare">
    <div data-voyage-fare="base"><dt>Cước cơ bản</dt><dd>{money(entry.baseFreight)}</dd></div>
    {entry.reeferBonus !== undefined && <div data-voyage-fare="reefer"><dt>{entry.reeferBonus ? 'Phụ phí lạnh' : 'Phụ phí lạnh · trễ hạn'}</dt>
      <dd>{money(entry.reeferBonus)}</dd></div>}
    {entry.tenderBonus !== undefined && <div data-voyage-fare="tender"><dt>Thưởng hợp đồng</dt><dd>{money(entry.tenderBonus)}</dd></div>}
    {entry.backhaulBonus !== undefined && <div data-voyage-fare="backhaul"><dt>Thưởng chiều về</dt><dd>{money(entry.backhaulBonus)}</dd></div>}
    <div data-voyage-fare="total"><dt>Tổng đã nhận</dt><dd>{money(getVoyagePayment(entry))}</dd></div>
  </dl>;
}

interface Props { gameState: GameState; myPlayerId: string | null; onClose: () => void }

export function VoyageLog({ gameState, myPlayerId, onClose }: Props) {
  const titleId = useId();
  const [captain, setCaptain] = useState(myPlayerId ?? gameState.players[0]?.id ?? '');
  const [selected, setSelected] = useState<number | null>(null);
  const log = gameState.logistics?.voyageLog ?? [];
  const entries = log.filter(v => v.playerId === captain).reverse();
  const active = entries.find(v => v.bookingId === selected) ?? entries[0];
  const miles = entries.reduce((sum, v) => sum + v.distanceNm, 0);
  const total = entries.reduce((sum, v) => sum + getVoyagePayment(v), 0);
  const incomplete = (gameState.logistics?.deliveries[captain] ?? 0) > entries.length;
  return <BoardDialog labelledBy={titleId} onClose={onClose}>
    <section className="chart-dialog-sheet voyage-log">
      <header className="voyage-log-heading">
        <h2 className="chart-dialog-title" id={titleId}>Nhật ký hành trình</h2>
        <button type="button" onClick={onClose} aria-label="Đóng nhật ký hành trình" className="chart-dialog-close"><X /></button>
      </header>
      <div className="voyage-log-toolbar">
        <label>Thuyền trưởng <select value={captain} data-voyage-captain
          onChange={e => { setCaptain(e.target.value); setSelected(null); }}>
          {gameState.players.map(p => <option key={p.id} value={p.id}>{p.name}{p.id === myPlayerId ? ' (bạn)' : ''}</option>)}
        </select></label>
        <dl className="voyage-summary">
          <div><dt>Chuyến đã ghi</dt><dd>{entries.length}</dd></div>
          <div><dt>Hải lý</dt><dd>{number.format(miles)}</dd></div>
          <div><dt>Tổng đã ghi</dt><dd>{money(total)}</dd></div>
        </dl>
      </div>
      {active ? <div className="voyage-log-content">
        <article className="voyage-selected" aria-label="Chuyến đang xem">
          <div className="voyage-log-meta">Vòng {active.round} <span>·</span> {cargoName(active)}</div>
          <h3>{guide(active.originTileId).name} <ArrowRight aria-label="đến" /> {guide(active.destinationTileId).name}</h3>
          <p className="voyage-distance">{number.format(active.distanceNm)} hải lý</p>
          <VoyageMap key={`${active.playerId}:${active.bookingId}`} entry={active} />
          {active.streetTurn && <p className="voyage-distance" data-voyage-street-turn>Vỏ nhập được chuyển thẳng đến nhà xuất khẩu, tạo 1 lô hàng tại {guide(active.destinationTileId).name}.</p>}
          <Fare entry={active} />
        </article>
        <section className="voyage-entries" aria-label="Các chuyến đã giao">
          <h3>Các chuyến đã giao</h3>
          <ol>{entries.map(entry => <li key={entry.bookingId}><button type="button" data-voyage-booking={entry.bookingId}
            aria-pressed={active.bookingId === entry.bookingId} onClick={() => setSelected(entry.bookingId)}>
            <span>Vòng {entry.round} · {cargoName(entry)}</span>
            <strong>{guide(entry.originTileId).code} → {guide(entry.destinationTileId).code}</strong>
            <small>{money(getVoyagePayment(entry))}</small>
          </button></li>)}</ol>
        </section>
      </div> : <div className="voyage-empty"><BookOpen aria-hidden="true" />
        <p>Chưa có chuyến giao nào được ghi cho thuyền trưởng này.</p></div>}
      {incomplete && <p className="voyage-partial">Các chuyến giao trước khi có nhật ký chưa có biên nhận chi tiết.</p>}
    </section>
  </BoardDialog>;
}
