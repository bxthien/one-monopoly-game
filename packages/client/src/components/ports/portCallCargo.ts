import {
  BOARD_TILES, getCargoDestinationEstimate, getCargoOpportunity, getCargoRedirections, getEmptyNeed,
  getPortStockAfterDischarge, getTenderBonus, isReeferPort,
  type CargoAction, type CargoBooking, type CargoDestinationEstimate, type CargoKind, type DeliveryReceipt,
  type DestinationChange, type GameState, type PortStock,
} from '@one-monopoly/shared';
import type { PortDischarge } from './portArrival.js';

export interface PortCallCargo {
  tileId: number;
  playerId: string;
  playerName: string;
  active: boolean;
  stock: PortStock;
  stockAfterUnload: PortStock | null;
  booking: CargoBooking | null;
  cargoType: CargoKind | 'reefer' | null;
  bookedHere: boolean;
  receiver: 'public' | 'reserved' | 'unavailable' | null;
  publicSlots: number | null;
  estimate: CargoDestinationEstimate | null;
  unloadAction: Extract<CargoAction, { type: 'UNLOAD_CARGO' }> | null;
  redirectAction: DestinationChange | null;
  receipt: DeliveryReceipt | null;
}

/** The caller associates the accepted unload event with this visit and clears it on the next arrival. */
export function getPortCallCargo(
  state: GameState, tileId: number, playerId: string, arrivalUnload?: PortDischarge | null,
): PortCallCargo | null {
  if (!state.gameStarted || state.mode !== 'logistics' || !state.logistics || state.winnerId !== null || !Number.isInteger(tileId)) return null;
  const tile = BOARD_TILES[tileId];
  const stock = state.logistics.ports[tileId];
  const captain = state.players.find(player => player.id === playerId);
  if (!tile || (tile.type !== 'PORT' && tile.type !== 'GO') || !stock || !captain || captain.isBankrupt || captain.position !== tileId) return null;

  const active = state.players[state.activePlayerIndex]?.id === playerId;
  const booking = captain.cargo;
  const cargoType = booking?.reeferDueRound !== undefined ? 'reefer' : booking?.kind ?? null;
  const bookedHere = booking?.destinationTileId === tileId;
  const estimate = active && booking ? getCargoDestinationEstimate(state, playerId, tileId) : null;
  const publicSlots = booking ? (booking.kind === 'empty' ? getEmptyNeed(stock) : stock.demand) : null;
  let receiver: PortCallCargo['receiver'] = null;
  if (booking) {
    receiver = 'unavailable';
    if (booking.originTileId !== tileId && (cargoType !== 'reefer' || isReeferPort(tileId))) {
      if (getTenderBonus(state, playerId, tileId, booking.kind) > 0) receiver = 'reserved';
      else if ((publicSlots ?? 0) > 0) receiver = 'public';
    }
  }

  const handling = active && bookedHere ? getCargoOpportunity(state, playerId)?.action : null;
  const unloadAction = handling?.type === 'UNLOAD_CARGO' ? handling : null;
  const redirectAction = active && booking && !bookedHere
    ? getCargoRedirections(state, playerId).find(choice => choice.tileId === tileId)?.action ?? null : null;
  const latest = captain.lastDelivery;
  const receipt = !booking && latest && arrivalUnload?.type === 'CARGO_UNLOADED' && arrivalUnload.playerId === playerId &&
    arrivalUnload.tileId === tileId && latest.tileId === tileId && arrivalUnload.bookingId === latest.bookingId &&
    arrivalUnload.originTileId === latest.originTileId && arrivalUnload.kind === latest.kind ? { ...latest } : null;

  return {
    tileId, playerId, playerName: captain.name, active, stock: { ...stock }, booking: booking ? { ...booking } : null,
    stockAfterUnload: unloadAction && booking ? getPortStockAfterDischarge(stock, booking.kind) : null,
    cargoType, bookedHere, receiver, publicSlots, estimate, unloadAction, redirectAction, receipt,
  };
}
