import { useId, useRef, useState } from 'react';
import {
  BOARD_TILES, FREIGHT_TENDER_MIN_BID, FREIGHT_TENDER_MAX_BID, getTenderBidAction,
  type CargoKind, type FreightContract, type FreightTender, type GameAction, type GameState,
} from '@one-monopoly/shared';
import { Award, Check, ChevronDown, Clock3, Gavel, LockKeyhole } from 'lucide-react';
import { portGuide } from './ports/portGuide.js';
import './tender-desk.css';

interface Props {
  state: GameState;
  viewerId: string | null;
  canAct: boolean;
  busy: boolean;
  submit: (action: GameAction, after?: () => void) => void;
}

function place(tileId: number) {
  const tile = BOARD_TILES[tileId];
  return portGuide[tile.code] ?? { name: tile.name, country: '' };
}
const cargoName = (kind: CargoKind) => kind === 'empty' ? 'Container rỗng' : 'Hàng xuất';
const midpoint = Math.round((FREIGHT_TENDER_MIN_BID + FREIGHT_TENDER_MAX_BID) / 2);

function CurrentTender({ state, tender, viewerId, canAct, busy, submit }: Props & { tender: FreightTender }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(String(midpoint));
  const formId = useId(), amountId = useId();
  const opener = useRef<HTMLButtonElement>(null);
  const target = place(tender.destinationTileId);
  const own = viewerId ? tender.bids[viewerId] : undefined;
  const parsed = draft.trim() === '' ? NaN : Number(draft);
  const valid = Number.isInteger(parsed) && parsed >= FREIGHT_TENDER_MIN_BID && parsed <= FREIGHT_TENDER_MAX_BID;
  const action = viewerId && canAct && valid ? getTenderBidAction(state, viewerId, parsed) : null;
  const priority = state.players.find(player => player.id === tender.priorityPlayerId);
  const participants = tender.bidderIds.map(id => state.players.find(player => player.id === id)?.name).filter(Boolean);
  function toggle() {
    if (!open) setDraft(String(own ?? midpoint));
    setOpen(!open);
  }
  return <section className="tender-current" data-tender-id={tender.id} aria-label="Gói thầu đang mở">
    <div className="tender-topline"><span><Gavel aria-hidden="true" />Đấu thầu vận tải</span>
      <span className="tender-deadline"><Clock3 aria-hidden="true" />Chốt cuối vòng {tender.round}</span></div>
    <div className="tender-target"><strong>{target.name}</strong>
      {target.country && target.country !== target.name && <span>{target.country}</span>}</div>
    <div className="tender-meta"><span>{cargoName(tender.kind)} · Giao vòng {tender.round + 1}</span></div>
    <div className="tender-controls-row">
      <div>{participants.length ? <details className="tender-bidders"><summary className="tender-participation">{tender.bidCount} hãng đã báo giá</summary>
          <p>{participants.join(', ')}</p></details> : <span className="tender-participation">{tender.bidCount} hãng đã báo giá</span>}
        {own !== undefined && <span className="tender-own-quote" role="status"><LockKeyhole aria-hidden="true" />Giá của bạn <strong>${own}M</strong></span>}</div>
      {canAct && <button type="button" className="tender-open" ref={opener} data-tender-toggle disabled={busy} onClick={toggle}
        aria-expanded={open} aria-controls={formId}>{open ? 'Đóng' : own === undefined ? 'Báo giá kín' : 'Sửa báo giá'}<ChevronDown aria-hidden="true" /></button>}
    </div>
    {open && canAct && <form className="tender-form" id={formId} onSubmit={event => {
      event.preventDefault();
      if (action && !busy) submit(action, () => {
        setOpen(false);
        opener.current?.focus({ preventScroll: true });
      });
    }}>
      <p>Giao đúng loại hàng tại cảng đích trong vòng sau để nhận phụ phí. Chuẩn bị sẵn hàng hoặc kết thúc lượt tại bến có hàng.</p>
      <p>Gửi hoặc sửa giá trước khi kết thúc lượt của bạn. Cuối vòng, chủ hàng chọn phụ phí thấp nhất.{priority && <> Nếu bằng giá, xét thứ tự từ {priority.name}.</>}</p>
      <label htmlFor={amountId}>Phụ phí đề nghị <span>(triệu đô la)</span></label>
      <div className="tender-price-row">
        <input data-tender-amount id={amountId} type="number" inputMode="numeric" step="1"
          min={FREIGHT_TENDER_MIN_BID} max={FREIGHT_TENDER_MAX_BID} required value={draft}
          onChange={event => setDraft(event.target.value)} aria-describedby={formId + '-limit'} />
        <div className="tender-presets" aria-label="Phụ phí gợi ý">
          {[FREIGHT_TENDER_MIN_BID, midpoint, FREIGHT_TENDER_MAX_BID].map(n => (
            <button key={n} type="button" onClick={() => setDraft(String(n))} aria-label={`Chọn ${n} triệu đô la`}
              aria-pressed={parsed === n}>${n}M</button>
          ))}
        </div>
      </div>
      <div className="tender-form-foot"><span id={formId + '-limit'}>Số nguyên · ${FREIGHT_TENDER_MIN_BID}M–${FREIGHT_TENDER_MAX_BID}M</span>
        <button type="submit" data-tender-submit data-cargo-action="BID_FREIGHT_TENDER" disabled={!action || busy}>
          {own === undefined ? 'Gửi báo giá' : 'Cập nhật báo giá'}</button></div>
    </form>}
  </section>;
}

function Contract({ state, contract, viewerId, historical = false }: {
  state: GameState; contract: FreightContract; viewerId: string | null; historical?: boolean;
}) {
  const captain = state.players.find(p => p.id === contract.playerId);
  const target = place(contract.destinationTileId);
  const settled = contract.status === 'fulfilled', expired = contract.status === 'expired';
  const status = settled ? 'Đã giao đúng hợp đồng' : expired ? 'Hết hạn giao hàng'
    : contract.playerId === viewerId ? 'Hợp đồng của bạn' : 'Đã trao hợp đồng';
  return <div className="tender-contract" role={historical ? undefined : 'status'} data-tender-contract={historical ? undefined : contract.status}
    data-tender-history-status={historical ? contract.status : undefined}>
    <div className="tender-contract-title">{settled ? <Check aria-hidden="true" /> : <Award aria-hidden="true" />}
      <strong>{status}</strong><span>Vòng {contract.deliveryRound}</span></div>
    <p><strong>{captain?.name ?? 'Hãng tàu'}</strong> · {cargoName(contract.kind)} → {target.name}{target.country && target.name !== target.country ? `, ${target.country}` : ''}</p>
    <p className="tender-contract-payment">{settled ? 'Đã trả phụ phí' : expired ? 'Phụ phí không được trả' : 'Phụ phí khi giao đúng hạn'}
      {expired ? ` · $${contract.amount}M` : <strong> +${contract.amount}M</strong>}</p>
    {!historical && !settled && <p className="tender-consequence">{expired
      ? 'Hãng không đủ điều kiện trúng phiên thầu chốt cùng vòng.'
      : 'Trễ hạn sẽ bị loại khỏi phiên thầu chốt cùng vòng.'}</p>}
  </div>;
}

export function TenderDesk(props: Props) {
  const { state, viewerId } = props;
  const market = state.logistics?.market;
  if (!market) return null;
  const award = market.contract;
  const history = (market.history ?? []).filter(item => item.tenderId !== award?.tenderId).slice().reverse();
  if (!market.tender && !award && !history.length) return null;
  return <section className="tender-desk" aria-label="Đấu thầu của chủ hàng">
    {award && <Contract state={state} contract={award} viewerId={viewerId} />}
    {market.tender && <CurrentTender {...props} tender={market.tender} key={`${market.tender.id}-${viewerId}`} />}
    {history.length > 0 && <details className="tender-history"><summary>Kết quả hợp đồng trước ({history.length})</summary>
      <ul>{history.map(contract => <li key={contract.tenderId}><Contract state={state} viewerId={viewerId} contract={contract} historical /></li>)}</ul>
    </details>}
  </section>;
}
