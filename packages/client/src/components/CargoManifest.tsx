import { useId, useRef, useState } from 'react';
import {
  BOARD_TILES, LOGISTICS_DELIVERY_TARGET, getCargoBookings, getCargoOpportunity, getCargoRedirections,
  getEmptyNeed, getFreightQuote, getLogisticsRoutes, isFinalLogisticsRound, type CargoKind, type GameAction, type GameState, type Player,
} from '@one-monopoly/shared';
import { ArrowRight, Check, Container, Flag, MapPin, Route, Ship, Truck } from 'lucide-react';
import { portGuide } from './ports/portGuide.js';
import './cargo-manifest.css';

interface DeskProps {
  gameState: GameState;
  myPlayerId: string | null;
  onAction: (action: GameAction, onFailure?: () => void, onSuccess?: () => void) => void;
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

function PortSelect({ label, value, options, onChange, purpose }: {
  label: string; value: number; options: { tileId: number; description?: string }[];
  onChange: (id: number) => void; purpose: 'booking' | 'destination' | 'redirect';
}) {
  return (
    <label className="freight-field">
      <span>{label}</span>
      <select value={value} onChange={event => onChange(Number(event.target.value))}
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
    </label>
  );
}

function receiving(stock: PortStock, kind: CargoKind) {
  return kind === 'empty' ? `Cần ${getEmptyNeed(stock)} vỏ rỗng` : `${stock.demand} xe chờ nhận`;
}

function Quote({ nm, reward }: { nm: number; reward?: number }) {
  return <span className="freight-quote"><Route aria-hidden="true" />
    {distance.format(nm)} hải lý{reward !== undefined && <strong>+${reward}M</strong>}
  </span>;
}

function CargoBooking({ state, player, busy, submit }: { state: GameState; player: Player; busy: boolean; submit: Submit }) {
  const radioName = useId();
  const [kind, setKind] = useState<CargoKind>('laden');
  const [targetId, setTargetId] = useState<number | undefined>();
  const bookings = getCargoBookings(state, player.id, kind);
  const choice = bookings.find(b => b.tileId === targetId) ?? bookings[0];
  const stocks = state.logistics!.ports;
  const local = stocks[player.position];
  return (
    <div className="freight-booking">
      <fieldset className="freight-kind">
        <legend>Chọn lô hàng để xếp</legend>
        {(['laden', 'empty'] as const).map(value => (
          <label key={value}><input type="radio" name={radioName} value={value} checked={kind === value}
            onChange={() => { setKind(value); setTargetId(undefined); }} />
            <span>{value === 'laden' ? <Truck aria-hidden="true" /> : <Container aria-hidden="true" />}{typeName(value)}</span>
          </label>
        ))}
      </fieldset>
      {choice ? <>
        <PortSelect label="Cảng đích của lô hàng" value={choice.tileId} purpose="booking" onChange={setTargetId}
          options={bookings.map(b => ({ tileId: b.tileId, description: receiving(stocks[b.tileId], kind) }))} />
        <div className="freight-terms"><span>Cước dự kiến</span>
          <Quote nm={choice.quote.distanceNm} reward={choice.quote.reward} /></div>
        <button type="button" className="chart-button freight-handling" disabled={busy} data-cargo-action="LOAD_CARGO"
          onClick={() => submit(choice.action)}><Container aria-hidden="true" />Xếp {kind === 'empty' ? 'container rỗng' : 'container hàng xuất'}</button>
      </> : <p className="freight-note">{kind === 'laden'
        ? local.supply === 0 ? 'Bến này đã hết xe chở hàng xuất.' : 'Chưa có bến đích còn xe nhận hàng nhập.'
        : local.empties <= local.emptyTarget ? 'Bến này cần giữ lại số vỏ rỗng đang có.' : 'Chưa có bến đích thiếu vỏ rỗng.'}</p>}
    </div>
  );
}

function ChangeDestination({ choices, booked, state, busy, submit }: {
  choices: ReturnType<typeof getCargoRedirections>; booked: NonNullable<Player['cargo']>; state: GameState; busy: boolean; submit: Submit;
}) {
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState<number | undefined>();
  const fieldId = useId();
  const choice = choices.find(b => b.tileId === chosen) ?? choices[0];
  return (
    <div className="freight-amend">
      <button type="button" className="freight-link" aria-expanded={open} aria-controls={fieldId}
        onClick={() => setOpen(!open)}><Route aria-hidden="true" />{open ? 'Hủy đổi cảng đích' : 'Đổi cảng đích'}</button>
      {open && <div className="freight-amend-form" id={fieldId}>
        <strong lang="en">Change of Destination (COD)</strong>
        <span className="freight-note">Đích hiện tại của lô hàng <strong>{port(booked.destinationTileId).name}</strong></span>
        {choice ? <>
          <PortSelect label="Cảng đích mới của lô hàng" value={choice.tileId} onChange={setChosen} purpose="redirect"
            options={choices.map(b => ({ tileId: b.tileId, description: receiving(state.logistics!.ports[b.tileId], booked.kind) }))} />
          <div className="freight-terms"><span>{port(booked.destinationTileId).name} → {port(choice.tileId).name}</span>
            <Quote nm={choice.quote.distanceNm} reward={choice.quote.reward} /></div>
          <button type="button" className="chart-button freight-handling" disabled={busy} data-cargo-action="CHANGE_DESTINATION"
            onClick={() => submit(choice.action, () => setOpen(false))}><Check aria-hidden="true" />Xác nhận đổi cảng đích</button>
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
  const contents = <>
    <PortSelect label="Cảng ghé tiếp theo của tàu" value={choice.tileId} purpose="destination" onChange={setChosen}
      options={routes.map(r => ({ tileId: r.tileId, description: `${r.supply} xe xuất · ${r.demand} xe nhận` }))} />
    <div className="freight-terms">
      <span>{player.cargo ? choice.tileId === preferred ? choice.quote ? 'Đến cảng đã đặt' : 'Bến đích đã hết chỗ nhận' : 'Ghé bến, giữ hàng trên tàu'
        : `${state.logistics!.ports[choice.tileId].empties} vỏ rỗng tại bến`}</span>
      <Quote nm={choice.distanceNm} />
    </div>
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

function CargoTicket({ player }: { player: Player }) {
  const cargo = player.cargo!;
  const quote = getFreightQuote(cargo.originTileId, cargo.destinationTileId, cargo.kind);
  return <div className="freight-ticket" data-booked-port={cargo.destinationTileId} data-cargo-kind={cargo.kind}>
    <div className="freight-ticket-type"><Container aria-hidden="true" /><span>Trên tàu · {typeName(cargo.kind)}</span></div>
    <div className="freight-ticket-route"><strong>{port(cargo.originTileId).name}</strong><ArrowRight aria-label="đến" />
      <strong>{port(cargo.destinationTileId).name}</strong></div>
    {quote && <Quote nm={quote.distanceNm} reward={quote.reward} />}
  </div>;
}

function CaptainDesk({ gameState, myPlayerId, onAction, player }: DeskProps & { player: Player }) {
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
    <div className="freight-berth"><MapPin aria-hidden="true" /><span>Bến hiện tại <strong>{location.name}</strong></span>
      <span className="freight-port-code">{location.code}</span></div>
    {stock && <Stock stock={stock} />}
    {cargo ? <CargoTicket player={player} /> : <p className="freight-empty"><Container aria-hidden="true" />Khoang tàu trống</p>}
    {canAct && (cargo ? <>
      {unload && <button type="button" className="chart-button freight-handling" data-cargo-action="UNLOAD_CARGO" disabled={busy}
        onClick={() => submit(unload.action)}><Truck aria-hidden="true" />Dỡ {cargo.kind === 'empty' ? 'container rỗng' : 'hàng lên xe'}{unload.quote && <strong>+${unload.quote.reward}M</strong>}</button>}
      {target && !unload && <p className="freight-note">{cargo.kind === 'empty' ? 'Bến đã đủ vỏ rỗng.' : 'Bến đã hết xe chờ nhận hàng.'} Bạn có thể đổi cảng đích.</p>}
      <ChangeDestination key={cargo.bookingId} choices={getCargoRedirections(gameState, player.id)} booked={cargo}
        state={gameState} busy={busy} submit={submit} />
    </> : <CargoBooking state={gameState} player={player} busy={busy} submit={submit} />)}
    {!!routes.length && <Sailing key={cargo?.destinationTileId ?? 'empty'} state={gameState} player={player}
      routes={routes} busy={busy} submit={submit} />}
    {canAct && (gameState.phase === 'AWAITING_SAIL' || gameState.phase === 'END_OF_TURN') && <button type="button" className={`chart-button freight-end${gameState.phase === 'AWAITING_SAIL' ? ' freight-pass' : ''}`}
      data-cargo-action="END_TURN" disabled={busy} onClick={() => submit({ type: 'END_TURN' })}><Flag aria-hidden="true" />{gameState.phase === 'AWAITING_SAIL' ? 'Không đi chuyến này · Kết thúc lượt' : 'Kết thúc lượt'}</button>}
    {!mine && !gameState.winnerId && <p className="freight-wait" role="status">Đang chờ {player.name} điều độ tàu.</p>}
    {receipt && <p className="freight-receipt"><Check aria-hidden="true" /><span>Đã giao {typeName(receipt.kind).toLocaleLowerCase('vi')} · {port(receipt.originTileId).name} → {port(receipt.tileId).name}</span><strong>+${receipt.reward}M</strong></p>}
    {me?.cargo && <p className="freight-own-cargo">Hàng của bạn <strong>{port(me.cargo.originTileId).name} → {port(me.cargo.destinationTileId).name}</strong></p>}
  </section>;
}

export function FreightDesk(props: DeskProps) {
  const player = props.gameState.players[props.gameState.activePlayerIndex];
  if (!props.gameState.logistics || !player) return null;
  return <CaptainDesk key={player.id} {...props} player={player} />;
}
