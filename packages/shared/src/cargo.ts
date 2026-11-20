import { BOARD_TILES } from './boardData.js';
import type {
  CargoAction, CargoKind, DestinationChange, EngineResult, FreightQuote, GameAction, GameEvent,
  GameState, LogisticsState, Player, PortStock, SailAction,
} from './types.js';

export const LOGISTICS_DELIVERY_TARGET = 3;
export const LOGISTICS_ROUND_LIMIT = 8;
export const LOGISTICS_PORT_CAPACITY = 4;

export const PORT_COORDINATES: Readonly<Record<string, { latitude: number; longitude: number }>> = {
  SGSIN: { latitude: 1.263, longitude: 103.85 },
  VNSGN: { latitude: 10.757, longitude: 106.79 },
  VNVUT: { latitude: 10.51, longitude: 107.019 },
  THLCH: { latitude: 13.083, longitude: 100.884 },
  AEJEA: { latitude: 24.991, longitude: 55.055 },
  GRPIR: { latitude: 37.943, longitude: 23.632 },
  ITGOA: { latitude: 44.411, longitude: 8.914 },
  ESVLC: { latitude: 39.448, longitude: -.32 },
  DEHAM: { latitude: 53.532, longitude: 9.955 },
  NLRTM: { latitude: 51.949, longitude: 4.138 },
  KRPUS: { latitude: 35.104, longitude: 129.044 },
  CNYTN: { latitude: 22.573, longitude: 114.269 },
  USOAK: { latitude: 37.797, longitude: -122.315 },
  USLAX: { latitude: 33.738, longitude: -118.273 },
  USSAV: { latitude: 32.126, longitude: -81.154 },
  BRSSZ: { latitude: -23.96, longitude: -46.3 },
  HKHKG: { latitude: 22.342, longitude: 114.128 },
  JPTYO: { latitude: 35.617, longitude: 139.787 },
};

const ports = BOARD_TILES.filter(tile => tile.type === 'PORT' || tile.type === 'GO');
const radians = Math.PI / 180;

export function getFreightQuote(originTileId: number, destinationTileId: number, kind: CargoKind = 'laden'): FreightQuote | null {
  if (originTileId === destinationTileId || !Number.isInteger(originTileId) || !Number.isInteger(destinationTileId)) return null;
  const a = PORT_COORDINATES[BOARD_TILES[originTileId]?.code], b = PORT_COORDINATES[BOARD_TILES[destinationTileId]?.code];
  if (!a || !b || (kind !== 'laden' && kind !== 'empty')) return null;
  const haversine = Math.sin((b.latitude - a.latitude) * radians / 2) ** 2
    + Math.cos(a.latitude * radians) * Math.cos(b.latitude * radians) * Math.sin((b.longitude - a.longitude) * radians / 2) ** 2;
  const miles = 2 * 3440.065 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))));
  const fullRate = Math.min(40, 12 + 2 * Math.floor(miles / 1000));
  return { distanceNm: Math.round(miles), reward: kind === 'empty' ? fullRate / 2 : fullRate };
}

export function getEmptyNeed(stock: PortStock): number {
  return Math.max(0, stock.emptyTarget - stock.empties);
}

export function createLogisticsState(players: Player[]): LogisticsState {
  const score = () => Object.fromEntries(players.map(player => [player.id, 0]));
  const stocks: Record<number, PortStock> = {};
  ports.forEach((port, i) => {
    stocks[port.id] = i === 0
      ? { supply: Math.min(players.length, LOGISTICS_PORT_CAPACITY), demand: 2, empties: 4, emptyTarget: 1 }
      : { supply: [1, 2, 0, 2][(i - 1) % 4], demand: [1, 2, 1, 0][(i - 1) % 4],
          empties: [0, 1, 3, 4][(i - 1) % 4], emptyTarget: 2 };
  });
  return { ports: stocks, deliveries: score(), emptyDeliveries: score(), earnings: score(), hasSailed: false };
}

export function isFinalLogisticsRound(state: GameState): boolean {
  return state.mode === 'logistics' && !!state.logistics && (state.turnCount >= LOGISTICS_ROUND_LIMIT ||
    Object.values(state.logistics.deliveries).some(count => count >= LOGISTICS_DELIVERY_TARGET));
}

export function getLogisticsStandings(state: GameState) {
  const logistics = state.logistics;
  if (!logistics) return [];
  // Stable sorting retains starting seat order in an exact tie.
  return state.players.map(player => ({ playerId: player.id, deliveries: logistics.deliveries[player.id],
    emptyDeliveries: logistics.emptyDeliveries[player.id], earnings: logistics.earnings[player.id] }))
    .sort((a, b) => b.deliveries - a.deliveries || b.earnings - a.earnings);
}

function activeCaptain(state: GameState, playerId: string) {
  const player = state.players[state.activePlayerIndex];
  if (state.mode !== 'logistics' || !state.logistics || !state.gameStarted || state.winnerId !== null ||
      (state.phase !== 'AWAITING_SAIL' && state.phase !== 'END_OF_TURN') || state.pendingDebt || state.pendingSlotCharter ||
      state.auction || !player || player.id !== playerId || player.isBankrupt || player.inHold || player.balance < 0) return null;
  return player;
}

function canReceive(stock: PortStock, kind: CargoKind) {
  return kind === 'laden' ? stock.demand > 0 : getEmptyNeed(stock) > 0;
}

type Load = Extract<CargoAction, { type: 'LOAD_CARGO' }>;
interface BookingChoice<Action> { tileId: number; quote: FreightQuote; action: Action }

export function getCargoBookings(state: GameState, playerId: string, kind: CargoKind): BookingChoice<Load>[] {
  const player = activeCaptain(state, playerId);
  if (!player || player.cargo || (kind !== 'laden' && kind !== 'empty')) return [];
  const stocks = state.logistics!.ports;
  const from = stocks[player.position];
  if (!from || (kind === 'laden' ? from.supply <= 0 : from.empties <= from.emptyTarget)) return [];
  return ports.flatMap(({ id }) => {
    const quote = getFreightQuote(player.position, id, kind);
    return quote && canReceive(stocks[id], kind) ? [{ tileId: id, quote, action: {
      type: 'LOAD_CARGO' as const, tileId: player.position, kind, destinationTileId: id, revision: state.cargoRevision ?? 0,
    } }] : [];
  });
}

export function getCargoRedirections(state: GameState, playerId: string): BookingChoice<DestinationChange>[] {
  const booking = activeCaptain(state, playerId)?.cargo;
  if (!booking) return [];
  return ports.flatMap(({ id }) => {
    const quote = getFreightQuote(booking.originTileId, id, booking.kind);
    return id !== booking.destinationTileId && quote && canReceive(state.logistics!.ports[id], booking.kind)
      ? [{ tileId: id, quote, action: { type: 'CHANGE_DESTINATION' as const,
          bookingId: booking.bookingId, destinationTileId: id, revision: state.cargoRevision ?? 0 } }]
      : [];
  });
}

export interface CargoOpportunity { action: CargoAction; quote: FreightQuote | null }

export function getCargoOpportunity(state: GameState, playerId: string): CargoOpportunity | null {
  const player = activeCaptain(state, playerId);
  if (!player) return null;
  const booking = player.cargo;
  if (!booking) {
    const suggested = getCargoBookings(state, playerId, 'laden')[0] ?? getCargoBookings(state, playerId, 'empty')[0];
    return suggested ? { action: suggested.action, quote: null } : null;
  }
  const stock = state.logistics!.ports[player.position];
  if (!stock || player.position !== booking.destinationTileId || !canReceive(stock, booking.kind)) return null;
  const quote = getFreightQuote(booking.originTileId, player.position, booking.kind);
  return quote ? { action: { type: 'UNLOAD_CARGO', tileId: player.position, originTileId: booking.originTileId,
    bookingId: booking.bookingId, revision: state.cargoRevision ?? 0 }, quote } : null;
}

export interface LogisticsRoute {
  tileId: number; supply: number; demand: number; distanceNm: number; quote: FreightQuote | null; action: SailAction;
}

export function getLogisticsRoutes(state: GameState, playerId: string): LogisticsRoute[] {
  const player = activeCaptain(state, playerId);
  if (!player || state.phase !== 'AWAITING_SAIL' || state.logistics!.hasSailed) return [];
  return ports.flatMap(({ id }) => {
    const leg = getFreightQuote(player.position, id);
    if (!leg) return [];
    const stock = state.logistics!.ports[id];
    const booking = player.cargo;
    const quote = booking?.destinationTileId === id && canReceive(stock, booking.kind)
      ? getFreightQuote(booking.originTileId, id, booking.kind) : null;
    return [{ tileId: id, supply: stock.supply, demand: stock.demand, distanceNm: leg.distanceNm, quote,
      action: { type: 'SAIL_TO_PORT' as const, tileId: id, revision: state.cargoRevision ?? 0 } }];
  });
}

// The rotating truck schedule adds individual import orders and packs available empty
// equipment into new export loads. Existing cargo and unfilled orders stay in the yard.
function replenish(logistics: LogisticsState, round: number) {
  ports.forEach((port, index) => {
    const stock = logistics.ports[port.id];
    if ((index + round) % 3 === 0 && stock.supply < LOGISTICS_PORT_CAPACITY && stock.empties > 0) {
      stock.supply++;
      stock.empties--;
    }
    if (index % 3 === round % 3 && stock.demand < LOGISTICS_PORT_CAPACITY) stock.demand++;
  });
}

export function dispatchLogistics(state: GameState, action: GameAction, playerId: string): EngineResult {
  const unchanged = { state, events: [] };
  const player = activeCaptain(state, playerId);
  if (!player) return unchanged;
  const revision = state.cargoRevision ?? 0;
  if (action.type !== 'END_TURN' && (!('revision' in action) || action.revision !== revision)) return unchanged;
  // Clone only after the operation is validated. A declined request always returns the original snapshot.
  const next = () => {
    const stateCopy = structuredClone(state);
    stateCopy.cargoRevision = revision + 1;
    return stateCopy;
  };
  const at = player.position;
  switch (action.type) {
    case 'LOAD_CARGO': {
      if (at !== action.tileId || !getCargoBookings(state, playerId, action.kind).some(item => item.tileId === action.destinationTileId)) return unchanged;
      const result = next();
      const booking = { bookingId: revision + 1, originTileId: at, destinationTileId: action.destinationTileId, kind: action.kind };
      result.players[state.activePlayerIndex].cargo = booking;
      const stock = result.logistics!.ports[at];
      if (booking.kind === 'laden') stock.supply--; else stock.empties--;
      return { state: result, events: [{ type: 'CARGO_LOADED', playerId, tileId: at, ...booking }] };
    }
    case 'CHANGE_DESTINATION': {
      const booking = player.cargo;
      if (!booking || booking.bookingId !== action.bookingId ||
          !getCargoRedirections(state, playerId).some(item => item.tileId === action.destinationTileId)) return unchanged;
      const result = next();
      const updated = { ...booking, destinationTileId: action.destinationTileId };
      result.players[state.activePlayerIndex].cargo = updated;
      return { state: result, events: [{ type: 'CARGO_DESTINATION_CHANGED', playerId, tileId: at,
        previousDestinationTileId: booking.destinationTileId, ...updated }] };
    }
    case 'SAIL_TO_PORT': {
      if (!getLogisticsRoutes(state, playerId).some(route => route.tileId === action.tileId)) return unchanged;
      const result = next();
      result.players[state.activePlayerIndex].position = action.tileId;
      result.logistics!.hasSailed = true;
      result.phase = 'END_OF_TURN';
      return { state: result, events: [{ type: 'SHIP_STEPPED', playerId, from: at, to: action.tileId }] };
    }
    case 'UNLOAD_CARGO': {
      const offer = getCargoOpportunity(state, playerId);
      const booking = player.cargo;
      if (!booking || !offer?.quote || action.tileId !== at || booking.bookingId !== action.bookingId ||
          booking.originTileId !== action.originTileId) return unchanged;
      const result = next();
      const captain = result.players[state.activePlayerIndex];
      const logistics = result.logistics!;
      const stock = logistics.ports[at];
      const receipt = { ...booking, tileId: at, ...offer.quote };
      delete captain.cargo;
      captain.lastDelivery = receipt;
      captain.balance += receipt.reward;
      logistics.deliveries[playerId]++;
      logistics.earnings[playerId] += receipt.reward;
      if (booking.kind === 'laden') stock.demand--; else logistics.emptyDeliveries[playerId]++;
      stock.empties = Math.min(LOGISTICS_PORT_CAPACITY, stock.empties + 1);
      const events: GameEvent[] = [{ type: 'CARGO_UNLOADED', playerId, ...receipt },
        { type: 'BALANCE_CHANGED', playerId, newBalance: captain.balance, delta: receipt.reward, reason: 'Cước giao container' }];
      return { state: result, events };
    }
    case 'END_TURN': {
      const result = next();
      const ended: GameEvent = { type: 'LOGISTICS_TURN_ENDED', playerId, sailed: state.logistics!.hasSailed };
      if (state.activePlayerIndex === state.players.length - 1 && isFinalLogisticsRound(state)) {
        result.winnerId = getLogisticsStandings(result)[0].playerId;
        return { state: result, events: [ended, { type: 'GAME_OVER', winnerId: result.winnerId }] };
      }
      result.activePlayerIndex = (state.activePlayerIndex + 1) % state.players.length;
      if (result.activePlayerIndex === 0) replenish(result.logistics!, ++result.turnCount);
      result.phase = 'AWAITING_SAIL';
      result.logistics!.hasSailed = false;
      return { state: result, events: [ended] };
    }
    default: return unchanged;
  }
}
