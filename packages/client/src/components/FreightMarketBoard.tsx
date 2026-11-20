import { useId, useMemo, useState } from 'react';
import { ArrowUpRight, Award, Container, MapPin, Ship, Truck, X } from 'lucide-react';
import { BOARD_TILES, type GameState } from '@one-monopoly/shared';
import { BoardDialog } from './BoardDialog.js';
import { freightMarketRows, type MarketFilter, type MarketSort } from './freightMarketRows.js';
import { portGuide } from './ports/portGuide.js';
import './freight-market-board.css';

interface Props {
  gameState: GameState;
  myPlayerId: string | null;
  onClose: () => void;
  onSelectPort: (tileId: number) => void;
}

const filters: { key: MarketFilter; label: string }[] = [
  { key: 'all', label: 'Tất cả' }, { key: 'export', label: 'Có hàng xuất' },
  { key: 'surplus', label: 'Dư vỏ rỗng' }, { key: 'shortage', label: 'Thiếu vỏ rỗng' },
  { key: 'import', label: 'Có xe nhận' },
];
const number = new Intl.NumberFormat('vi-VN');
const columns = [
  { key: 'supply', label: 'Xe hàng xuất' }, { key: 'surplus', label: 'Vỏ dư' },
  { key: 'shortage', label: 'Thiếu vỏ' }, { key: 'demand', label: 'Xe nhận' },
] as const;

export function FreightMarketBoard({ gameState, myPlayerId, onClose, onSelectPort }: Props) {
  const heading = useId(), sortId = useId();
  const [filter, setFilter] = useState<MarketFilter>('all');
  const [sort, setSort] = useState<MarketSort>('opportunity');
  const captain = gameState.players.find(p => p.id === myPlayerId) ?? gameState.players[gameState.activePlayerIndex];
  const berth = captain && portGuide[BOARD_TILES[captain.position]?.code];
  const rows = useMemo(() => freightMarketRows(gameState, myPlayerId, filter, sort), [gameState, myPlayerId, filter, sort]);
  const hasActivity = rows.some(row => row.incoming.length || row.award);
  function inspect(tileId: number) {
    onClose();
    onSelectPort(tileId);
  }

  return <BoardDialog onClose={onClose} labelledBy={heading}>
    <section className="freight-market-board">
      <header className="market-board-heading">
        <div><h2 id={heading}>Thị trường cảng</h2>
          {berth && <p><MapPin aria-hidden="true" />Khoảng cách từ {captain.id === myPlayerId ? 'tàu của bạn' : `tàu của ${captain.name}`} tại <strong>{berth.name}</strong></p>}</div>
        <button type="button" className="chart-dialog-close" aria-label="Đóng thị trường cảng" onClick={onClose}><X aria-hidden="true" /></button>
      </header>
      <div className="market-board-toolbar">
        <div className="market-board-filters" role="group" aria-label="Lọc theo nhu cầu tại cảng">
          {filters.map(({ key, label }) => <button type="button" key={key} data-market-filter={key}
            aria-pressed={filter === key} onClick={() => setFilter(key)}>{label}</button>)}
        </div>
        <label htmlFor={sortId} className="market-board-sort">Sắp xếp
          <select id={sortId} data-market-sort value={sort} onChange={event => setSort(event.target.value as MarketSort)}>
            <option value="opportunity">Theo cơ hội</option><option value="distance">Gần tàu nhất</option>
          </select>
        </label>
      </div>
      <div className="market-board-context">
        <strong role="status">{rows.length} cảng</strong>
        {sort === 'opportunity' && <span>{filter !== 'all' ? 'Số lượng lớn nhất xếp trước.'
          : captain?.cargo ? 'Ưu tiên đích vận đơn, hợp đồng và bến còn chỗ nhận hàng.'
          : 'Ưu tiên hợp đồng, sau đó đến bến có nhiều hàng xuất hoặc vỏ dư.'}</span>}
      </div>
      {rows.length ? <div className="market-board-list" tabIndex={0} role="region" aria-label="So sánh các cảng">
        <table><thead><tr>
          <th scope="col">Cảng</th>{columns.map(column => <th scope="col" key={column.key}>{column.label}</th>)}
          <th scope="col" className="market-distance">Hải lý</th>{hasActivity && <th scope="col" className="market-activity-header">Hàng đặt tại bến</th>}
        </tr></thead>
        <tbody>{rows.map(row => <tr key={row.tileId} data-market-row={row.tileId} data-market-current={row.current || undefined}>
          <th scope="row" className="market-port-cell">
            <button type="button" data-market-port={row.tileId} aria-label={`Xem cảng ${row.name}, ${row.country}`} onClick={() => inspect(row.tileId)}>
              <span className="market-port-title">{row.name}<ArrowUpRight aria-hidden="true" /></span>
              <span className="market-port-location">{row.code} · {row.country}</span>
            </button>
            {(row.current || row.booked) && <span className="market-row-mark"><Ship aria-hidden="true" />{row.current ? 'Đang neo' : ''}{row.current && row.booked ? ' · ' : ''}{row.booked ? 'Đích vận đơn' : ''}</span>}
          </th>
          {columns.map(column => <td key={column.key} className="market-quantity" data-zero={row[column.key] === 0 || undefined}>
            <span className="market-mobile-label" aria-hidden="true">{column.label}</span>{row[column.key]}</td>)}
          <td className="market-distance"><span className="market-mobile-label" aria-hidden="true">Hải lý</span>
            {row.distanceNm === null ? '—' : number.format(row.distanceNm)}</td>
          {hasActivity && <td className="market-activity" data-empty={!row.award && !row.incoming.length || undefined}>
            {row.award && <div className="market-award"><Award aria-hidden="true" /><span>{row.award.own ? 'Hợp đồng của bạn' : `Hợp đồng · ${row.award.name}`} · {row.award.kind === 'empty' ? 'vỏ rỗng' : 'hàng xuất'} +${row.award.amount}M</span></div>}
            {row.incoming.map((shipment, index) => <div className="market-inbound" key={index}>{shipment.kind === 'empty'
              ? <Container aria-hidden="true" /> : <Truck aria-hidden="true" />}<span>{shipment.captain} · {shipment.refrigerated ? 'hàng lạnh' : shipment.kind === 'empty' ? 'vỏ rỗng' : 'hàng xuất'}</span></div>)}
            {!row.award && !row.incoming.length && <span aria-label="Chưa có lô đặt tại bến">—</span>}
          </td>}
        </tr>)}</tbody></table>
      </div> : <p className="market-board-empty">Hiện chưa có cảng đáp ứng bộ lọc này.</p>}
    </section>
  </BoardDialog>;
}
