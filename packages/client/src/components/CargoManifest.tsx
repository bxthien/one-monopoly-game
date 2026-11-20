import { useEffect, useId, useRef, useState } from 'react';
import {
  BOARD_TILES, LOGISTICS_DELIVERY_TARGET, getCargoBookings, getCargoOpportunity, getCargoRedirections,
  getEmptyNeed, getFeederDistanceNm, getFreightQuote, getLogisticsRoutes, getTenderBonus, isFinalLogisticsRound, type CargoKind, type GameAction, type GameState, type Player,
} from '@one-monopoly/shared';
import { ArrowRight, Check, Container, Flag, MapPin, Route, Ship, Snowflake, Store, Truck } from 'lucide-react';
import { portGuide } from './ports/portGuide.js';
import './cargo-manifest.css';
import { DiversionComparison } from './DiversionComparison.js';
import { FreightMarketBoard } from './FreightMarketBoard.js';
import { TenderDesk } from './TenderDesk.js';
import { BackhaulDesk } from './BackhaulDesk.js';
import { EarlyTruckDesk } from './EarlyTruckDesk.js';
import { FeederSailing } from './FeederSailing.js';
import { ReeferBookingTerms, ReeferDeadline, ReeferReceipt } from './ReeferCargo.js';

interface DeskProps {
  gameState: GameState;
  myPlayerId: string | null;
  onAction: (action: GameAction, onFailure?: () => void, onSuccess?: () => void) => void;
}

type BookingService = CargoKind | 'reefer';
interface DestinationDraft {
  service: BookingService;
  tileId?: number;
  redirectOpen?: boolean;
  fromMarket?: boolean;
}
interface DraftControls {
  draft: DestinationDraft;
  editDraft: (draft: DestinationDraft) => void;
  onOpenMarket: () => void;
}

type PortStock = NonNullable<GameState['logistics']>['ports'][number];
type Submit = (action: GameAction, after?: () => void) => void;
const distance = new Intl.NumberFormat('vi-VN');
const typeName = (kind: CargoKind) => kind === 'empty' ? 'Container rỗng' : 'Hàng xuất';

function port(id: number) {
  const tile = BOARD_TILES[id];
  return portGuide[tile.code] ?? { name: tile.name, country: '', code: tile.code };
}

function Stock({ stock }: { stock: PortStock }) {
  return (
    <dl className="freight-stock">
      <div><dt>Xe chở hàng xuất</dt><dd>{stock.supply}</dd></div>
      <div><dt>Xe nhận hàng nhập</dt><dd>{stock.demand}</dd></div>
      <div><dt>Vỏ rỗng tại bến</dt><dd>{stock.empties}
        <small>{stock.empties > stock.emptyTarget ? `dư ${stock.empties - stock.emptyTarget}` : getEmptyNeed(stock) ? `thiếu ${getEmptyNeed(stock)}` : 'đủ'}</small>
      </dd></div>
    </dl>
  );
}

function PortSelect({ label, value, options, onChange, purpose, onOpenMarket, focusDraft }: {
  label: string; value: number; options: { tileId: number; description?: string }[];
  onChange: (id: number) => void; purpose: 'booking' | 'destination' | 'redirect';
  onOpenMarket?: () => void;
  focusDraft?: DestinationDraft;
}) {
  const id = useId();
  const select = useRef<HTMLSelectElement>(null);
  useEffect(() => {
    if (!focusDraft) return;
    // The native market dialog restores focus to its opener as it closes.
    const frame = requestAnimationFrame(() => {
      select.current?.focus({ preventScroll: true });
      select.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusDraft]);

  return (
    <div className="freight-field">
      <div className="freight-field-heading">
        <label htmlFor={id}>{label}</label>
        {onOpenMarket && <button type="button" data-cargo-market aria-haspopup="dialog" onClick={onOpenMarket}>
          <Store aria-hidden="true" />So sánh cảng</button>}
      </div>
      <select id={id} ref={select} value={value} onChange={event => onChange(Number(event.target.value))}
        data-cargo-booking={purpose === 'booking' || undefined}
        data-cargo-destination={purpose === 'destination' || undefined}
        data-cargo-redirect={purpose === 'redirect' || undefined}>
        {options.map(({tileId, description}) => {
          const place = port(tileId);
          return <option key={tileId} value={tileId}>
            {place.name}{place.country && place.country !== place.name ? ` · ${place.country}` : ''}{description ? ` · ${description}` : ''}
          </option>;
        })}
      </select>
    </div>
  );
}

function receiving(state: GameState, playerId: string, tileId: number, kind: CargoKind) {
  const stock = state.logistics!.ports[tileId];
  const capacity = kind === 'empty' ? getEmptyNeed(stock) : stock.demand;
  const bonus = getTenderBonus(state, playerId, tileId, kind);
  const label = capacity === 0 && bonus > 0 ? 'Chỗ nhận riêng của chủ hàng'
    : kind === 'empty' ? `Cần ${capacity} vỏ rỗng` : `${capacity} xe chờ nhận`;
  return bonus > 0 ? `${label} · hợp đồng +$${bonus}M` : label;
}

function ContractRate({ amount }: { amount: number }) {
  return amount > 0 ? <span className="freight-contract-rate" data-contract-bonus={amount}>
    Phụ phí hợp đồng <strong>+${amount}M</strong>
  </span> : null;
}

function Quote({ nm, reward }: { nm: number; reward?: number }) {
  return <span className="freight-quote"><Route aria-hidden="true" />
    {distance.format(nm)} hải lý{reward !== undefined && <strong>+${reward}M</strong>}
  </span>;
}

function CargoBooking({ state, player, busy, submit, draft, editDraft, onOpenMarket }: {
  state: GameState; player: Player; busy: boolean; submit: Submit;
} & DraftControls) {
  const radioName = useId();
  const { service, tileId: targetId } = draft;
  const reefer = service === 'reefer';
  const kind = reefer ? 'laden' : service;
  const bookings = getCargoBookings(state, player.id, kind, reefer);
  const choice = bookings.find(b => b.tileId === targetId) ?? bookings.find(b => getTenderBonus(state, player.id, b.tileId, kind)) ?? bookings[0];
  const stocks = state.logistics!.ports;
  const local = stocks[player.position];
  return (
    <div className="freight-booking">
      <fieldset className="freight-kind">
        <legend>Chọn lô hàng để xếp</legend>
        {(['laden', 'empty', 'reefer'] as const).filter(value => value !== 'reefer' || state.logistics?.reeferSlots).map(value => (
          <label key={value}><input type="radio" name={radioName} value={value} data-cargo-kind={value} checked={service === value}
            onChange={() => editDraft({ service: value })} />
            <span>{value === 'reefer' ? <Snowflake aria-hidden="true" /> : value === 'laden' ? <Truck aria-hidden="true" /> : <Container aria-hidden="true" />}
              {value === 'reefer' ? 'Hàng lạnh' : typeName(value)}</span>
          </label>
        ))}
      </fieldset>
      {reefer && <ReeferBookingTerms state={state} tileId={player.position} destinationTileId={choice?.tileId} />}
      {choice ? <>
        <PortSelect label="Cảng đích của lô hàng" value={choice.tileId} purpose="booking" onChange={tileId => editDraft({ service, tileId })}
          onOpenMarket={onOpenMarket} focusDraft={draft.fromMarket ? draft : undefined}
          options={bookings.map(b => ({ tileId: b.tileId, description: receiving(state, player.id, b.tileId, kind) }))} />
        <div className="freight-terms"><span>Cước cơ bản</span>
          <Quote nm={choice.quote.distanceNm} reward={choice.quote.reward} /></div>
        <ContractRate amount={getTenderBonus(state, player.id, choice.tileId, kind)} />
        <button type="button" className="chart-button freight-handling" disabled={busy} data-cargo-action="LOAD_CARGO"
          onClick={() => submit(choice.action)}><Container aria-hidden="true" />Xếp {reefer ? 'container lạnh' : kind === 'empty' ? 'container rỗng' : 'container hàng xuất'}</button>
      </> : !reefer && <p className="freight-note">{kind === 'laden'
        ? local.supply === 0 ? 'Bến này đã hết xe chở hàng xuất.' : 'Chưa có bến đích còn xe nhận hàng nhập.'
        : local.empties <= local.emptyTarget ? 'Bến này cần giữ lại số vỏ rỗng đang có.' : 'Chưa có bến đích thiếu vỏ rỗng.'}</p>}
    </div>
  );
}

function ChangeDestination({ choices, booked, state, busy, submit, draft, editDraft, onOpenMarket }: {
  choices: ReturnType<typeof getCargoRedirections>; booked: NonNullable<Player['cargo']>; state: GameState; busy: boolean; submit: Submit;
} & DraftControls) {
  const open = !!draft.redirectOpen;
  const fieldId = useId();
  const playerId = state.players[state.activePlayerIndex].id;
  const choice = choices.find(b => b.tileId === draft.tileId) ?? choices.find(b => getTenderBonus(state, playerId, b.tileId, booked.kind)) ?? choices[0];
  return (
    <div className="freight-amend">
      <button type="button" className="freight-link" aria-expanded={open} aria-controls={fieldId}
        onClick={() => editDraft({ service: draft.service, redirectOpen: !open })}><Route aria-hidden="true" />{open ? 'Hủy đổi cảng đích' : 'Đổi cảng đích'}</button>
      {open && <div className="freight-amend-form" id={fieldId}>
        <strong lang="en">Change of Destination (COD)</strong>
        {booked.reeferDueRound !== undefined && <p className="freight-note">Hàng lạnh chỉ đổi sang cảng có kho lạnh. Hạn giao vẫn là vòng {booked.reeferDueRound}.</p>}
        {choice ? <>
          <PortSelect label="Cảng đích mới của lô hàng" value={choice.tileId} purpose="redirect"
            onChange={tileId => editDraft({ service: draft.service, redirectOpen: true, tileId })} onOpenMarket={onOpenMarket} focusDraft={draft.fromMarket ? draft : undefined}
            options={choices.map(b => ({ tileId: b.tileId, description: receiving(state, playerId, b.tileId, booked.kind) }))} />
          <DiversionComparison state={state} playerId={playerId} currentId={booked.destinationTileId} proposedId={choice.tileId} />
          <button type="button" className="chart-button freight-handling" disabled={busy} data-cargo-action="CHANGE_DESTINATION"
            onClick={() => submit(choice.action, () => editDraft({ service: draft.service }))}><Check aria-hidden="true" />Xác nhận đổi cảng đích</button>
        </> : <p className="freight-note">Chưa có bến khác nhận được lô hàng này.</p>}
      </div>}
    </div>
  );
}

function Sailing({ state, player, busy, routes, submit }: {
  state: GameState; player: Player; busy: boolean; routes: ReturnType<typeof getLogisticsRoutes>; submit: Submit;
}) {
  const [chosen, setChosen] = useState<number | undefined>();
  const preferred = player.cargo?.destinationTileId;
  const stocked = routes.find(route => {
    const stock = state.logistics!.ports[route.tileId];
    return stock.supply > 0 || stock.empties > stock.emptyTarget;
  });
  const choice = routes.find(r => r.tileId === chosen) ?? routes.find(r => r.tileId === preferred) ?? stocked ?? routes[0];
  if (!choice) return null;
  const feederDistance = preferred !== undefined && state.logistics?.feederAvailable?.[player.id] === true
    ? getFeederDistanceNm(choice.tileId, preferred) : null;
  const bonus = player.cargo && choice.tileId === preferred ? getTenderBonus(state, player.id, choice.tileId, player.cargo.kind) : 0;
  const reserved = bonus > 0 && player.cargo && (player.cargo.kind === 'empty'
    ? getEmptyNeed(state.logistics!.ports[choice.tileId]) : choice.demand) === 0;
  const contents = <>
    <PortSelect label="Cảng ghé tiếp theo của tàu" value={choice.tileId} purpose="destination" onChange={setChosen}
      options={routes.map(r => ({ tileId: r.tileId, description: `${r.supply} xe xuất · ${r.demand} xe nhận` }))} />
    <div className="freight-terms">
      <span>{player.cargo ? choice.tileId === preferred ? choice.quote ? reserved ? 'Chỗ nhận riêng của chủ hàng' : 'Đến cảng đã đặt' : 'Bến đích đã hết chỗ nhận' : 'Ghé bến, giữ hàng trên tàu'
        : `${state.logistics!.ports[choice.tileId].empties} vỏ rỗng tại bến`}</span>
      <Quote nm={choice.distanceNm} reward={choice.quote?.reward} />
    </div>
    {feederDistance !== null && preferred !== undefined && <p className="freight-feeder-preview" data-feeder-preview={preferred}>
      <Route aria-hidden="true" />
      <span>Từ {port(choice.tileId).name}, bạn có thể dùng chuyến nối cảng đến <strong>{port(preferred).name}</strong> · {distance.format(feederDistance)} hải lý.</span>
    </p>}
    <ContractRate amount={bonus} />
    <button type="button" className="chart-button freight-sail" disabled={busy} data-cargo-action="SAIL_TO_PORT"
      onClick={() => submit(choice.action)}><Ship aria-hidden="true" />Khởi hành đến {port(choice.tileId).name}</button>
  </>;
  if (!player.cargo) {
    const canBookHere = getCargoBookings(state, player.id, 'laden').length > 0 || getCargoBookings(state, player.id, 'empty').length > 0;
    if (!canBookHere) return <div className="freight-sailing">{contents}</div>;
    return <details className="freight-empty-sailing"><summary><Ship aria-hidden="true" />Chạy tàu không chở hàng</summary>{contents}</details>;
  }
  return <div className="freight-sailing">{contents}</div>;
}

function CargoTicket({ state, player }: { state: GameState; player: Player }) {
  const cargo = player.cargo!;
  const quote = getFreightQuote(cargo.originTileId, cargo.destinationTileId, cargo.kind);
  return <div className="freight-ticket" data-booked-port={cargo.destinationTileId} data-cargo-kind={cargo.kind}>
    <div className="freight-ticket-type">{cargo.reeferDueRound !== undefined ? <Snowflake aria-hidden="true" /> : <Container aria-hidden="true" />}
      <span>Trên tàu · {cargo.reeferDueRound !== undefined ? 'Hàng lạnh' : typeName(cargo.kind)}</span></div>
    <div className="freight-ticket-route"><strong>{port(cargo.originTileId).name}</strong><ArrowRight aria-label="đến" />
      <strong>{port(cargo.destinationTileId).name}</strong></div>
    {quote && <Quote nm={quote.distanceNm} reward={quote.reward} />}
    <ReeferDeadline booking={cargo} round={state.turnCount} />
    <ContractRate amount={getTenderBonus(state, player.id, cargo.destinationTileId, cargo.kind)} />
  </div>;
}

function CaptainDesk({ gameState, myPlayerId, onAction, player, ...planning }: DeskProps & DraftControls & { player: Player }) {
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const logistics = gameState.logistics!;
  const mine = player.id === myPlayerId;
  const canAct = mine && !gameState.winnerId && !player.isBankrupt;
  const location = port(player.position);
  const stock = logistics.ports[player.position];
  const cargo = player.cargo;
  const receipt = player.lastDelivery;
  const opportunity = canAct ? getCargoOpportunity(gameState, player.id) : null;
  const unload = opportunity?.action.type === 'UNLOAD_CARGO' ? opportunity : null;
  const dischargeBonus = unload && cargo ? getTenderBonus(gameState, player.id, player.position, cargo.kind) : 0;
  const reservedReceiver = dischargeBonus > 0 && cargo && (cargo.kind === 'empty' ? getEmptyNeed(stock) : stock.demand) === 0;
  const routes = canAct ? getLogisticsRoutes(gameState, player.id) : [];
  const delivered = logistics.deliveries[player.id] ?? 0;
  const finalRound = isFinalLogisticsRound(gameState);
  const me = mine ? undefined : gameState.players.find(p => p.id === myPlayerId);
  const target = cargo && cargo.destinationTileId === player.position;
  const submit: Submit = (action, after) => {
    if (!canAct || inFlight.current) return;
    inFlight.current = true; setBusy(true);
    const release = () => { inFlight.current = false; setBusy(false); };
    onAction(action, release, () => { release(); after?.(); });
  };
  return <section className="freight-desk" aria-label="Điều độ vận tải" data-captain={player.id} data-berth={player.position}>
    <header className="freight-desk-header">
      <div><h2>Điều độ vận tải</h2><p>{finalRound
        ? 'Vòng cuối · Nếu bằng số lô đã giao, cước cao hơn thắng.'
        : `Giao ${LOGISTICS_DELIVERY_TARGET} container để mở vòng cuối.`}</p></div>
      <span className="freight-progress"><Container aria-hidden="true" /><span className="sr-only">Đã giao </span>
        {delivered > LOGISTICS_DELIVERY_TARGET ? `${delivered} lô` : `${delivered}/${LOGISTICS_DELIVERY_TARGET}`}</span>
    </header>
    <TenderDesk state={gameState} viewerId={myPlayerId} canAct={canAct} busy={busy} submit={submit} />
    <div className="freight-berth"><MapPin aria-hidden="true" /><span>Bến hiện tại <strong>{location.name}</strong></span>
      <span className="freight-port-code">{location.code}</span></div>
    {stock && <Stock stock={stock} />}
    <EarlyTruckDesk state={gameState} player={player} canAct={canAct} busy={busy} submit={submit} />
    {cargo ? <CargoTicket state={gameState} player={player} /> : <p className="freight-empty"><Container aria-hidden="true" />Khoang tàu trống</p>}
    {canAct && (cargo ? <>
      {unload && <button type="button" className="chart-button freight-handling" data-cargo-action="UNLOAD_CARGO" disabled={busy}
        onClick={() => submit(unload.action)}><Truck aria-hidden="true" />Dỡ {cargo.kind === 'empty' ? 'container rỗng' : 'hàng lên xe'}{unload.quote && <strong>+${unload.quote.reward}M</strong>}</button>}
      {dischargeBonus > 0 && (
        <p className="freight-note freight-discharge-bonus">{reservedReceiver && 'Chủ hàng có chỗ nhận riêng. '}Dỡ tại đây nhận thêm ${dischargeBonus}M theo hợp đồng.</p>
      )}
      {target && !unload && <p className="freight-note">{cargo.kind === 'empty' ? 'Bến đã đủ vỏ rỗng.' : 'Bến đã hết xe chờ nhận hàng.'} Bạn có thể đổi cảng đích.</p>}
      <ChangeDestination key={cargo.bookingId} choices={getCargoRedirections(gameState, player.id)} booked={cargo}
        state={gameState} busy={busy} submit={submit} {...planning} />
    </> : <CargoBooking state={gameState} player={player} busy={busy} submit={submit} {...planning} />)}
    {!!routes.length && <Sailing key={cargo?.destinationTileId ?? 'empty'} state={gameState} player={player}
      routes={routes} busy={busy} submit={submit} />}
    {canAct && <FeederSailing key={player.position} state={gameState} captain={player} busy={busy} submit={submit} />}
    {canAct && (gameState.phase === 'AWAITING_SAIL' || gameState.phase === 'END_OF_TURN') && <button type="button" className={`chart-button freight-end${gameState.phase === 'AWAITING_SAIL' ? ' freight-pass' : ''}`}
      data-cargo-action="END_TURN" disabled={busy} onClick={() => submit({ type: 'END_TURN' })}><Flag aria-hidden="true" />{gameState.phase === 'AWAITING_SAIL' ? 'Không đi chuyến này · Kết thúc lượt' : 'Kết thúc lượt'}</button>}
    {!mine && !gameState.winnerId && <p className="freight-wait" role="status">Đang chờ {player.name} điều độ tàu.</p>}
    <BackhaulDesk state={gameState} viewerId={myPlayerId} busy={busy} submit={submit} />
    {receipt && <div className="freight-receipt-wrap"><p className="freight-receipt"><Check aria-hidden="true" /><span>Đã giao {receipt.reeferDueRound !== undefined ? 'hàng lạnh' : typeName(receipt.kind).toLocaleLowerCase('vi')} · {port(receipt.originTileId).name} → {port(receipt.tileId).name}</span><strong>{receipt.tenderBonus || receipt.reeferBonus !== undefined ? 'Cước ' : ''}+${receipt.reward}M</strong></p>
      <ReeferReceipt bonus={receipt.reeferBonus} />
      {!!receipt.tenderBonus && <span className="freight-contract-paid" data-paid-contract-bonus={receipt.tenderBonus}>Đã nhận phụ phí hợp đồng <strong>+${receipt.tenderBonus}M</strong></span>}
    </div>}
    {me?.cargo && <p className="freight-own-cargo">Hàng của bạn <strong>{port(me.cargo.originTileId).name} → {port(me.cargo.destinationTileId).name}</strong></p>}
  </section>;
}

interface FreightDeskProps extends DeskProps {
  marketOpen: boolean;
  onOpenMarket: () => void;
  onCloseMarket: () => void;
  onInspectPort: (tileId: number) => void;
}

export function FreightDesk({ marketOpen, onOpenMarket, onCloseMarket, onInspectPort, ...props }: FreightDeskProps) {
  const { gameState, myPlayerId } = props;
  const player = gameState.players[gameState.activePlayerIndex];
  const [saved, setSaved] = useState<{ scope: string; draft: DestinationDraft }>();
  if (!gameState.logistics || !player) return null;
  // Drafts belong to a particular turn, berth and manifest, including a newly emptied hold.
  const scope = [gameState.roomId, gameState.turnCount, player.id, player.position, player.lastDelivery?.bookingId,
    player.cargo?.bookingId, player.cargo?.destinationTileId].join('/');
  const contract = gameState.logistics.market?.contract;
  const defaultService = contract && getTenderBonus(gameState, player.id, contract.destinationTileId, contract.kind)
    ? contract.kind : 'laden';
  const draft = saved?.scope === scope ? saved.draft : { service: defaultService };
  const editDraft = (next: DestinationDraft) => setSaved({ scope, draft: next });

  return <>
    <CaptainDesk key={player.id} {...props} player={player} draft={draft} editDraft={editDraft} onOpenMarket={onOpenMarket} />
    {marketOpen && !gameState.winnerId && <FreightMarketBoard gameState={gameState} myPlayerId={myPlayerId}
      onClose={onCloseMarket} onSelectPort={onInspectPort} service={draft.service}
      onPlanPort={(tileId, service) => {
        const redirectOpen = service === 'redirect';
        editDraft({ service: service === 'redirect' ? draft.service : service, redirectOpen, tileId, fromMarket: true });
        onCloseMarket();
      }} />}
  </>;
}
