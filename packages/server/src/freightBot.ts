import {
  getCargoBookings, getCargoOpportunity, getCargoRedirections, getEmptyNeed, getLogisticsRoutes,
  type GameAction, type GameState,
} from '@one-monopoly/shared';

export function getFreightBotAction(state: GameState): GameAction {
  const captain = state.players[state.activePlayerIndex];
  const operations = state.logistics;
  if (!operations) return { type: 'END_TURN' };
  const job = captain.cargo;
  const discharge = getCargoOpportunity(state, captain.id);
  if (discharge?.action.type === 'UNLOAD_CARGO') return discharge.action;

  if (!job) {
    const exports = getCargoBookings(state, captain.id, 'laden');
    const equipment = getCargoBookings(state, captain.id, 'empty');
    // After an export, try returning equipment to a shortage port for the next ship.
    const preferEmpty = captain.lastDelivery?.kind === 'laden';
    const preferred = preferEmpty ? equipment : exports;
    const options = preferred.length ? preferred : preferEmpty ? exports : equipment;
    if (options.length) return [...options].sort((a, b) => b.quote.reward - a.quote.reward)[0].action;
  } else {
    const receiver = operations.ports[job.destinationTileId];
    const canReceive = receiver && (job.kind === 'empty' ? getEmptyNeed(receiver) > 0 : receiver.demand > 0);
    if (!canReceive) {
      const alternatives = getCargoRedirections(state, captain.id);
      const atBerth = alternatives.find(option => option.tileId === captain.position);
      if (atBerth) return atBerth.action;
      if (alternatives.length) return alternatives[0].action;
    }
  }

  const routes = getLogisticsRoutes(state, captain.id);
  if (job) {
    const booked = routes.find(route => route.tileId === job.destinationTileId);
    if (booked) return booked.action;
  } else {
    const source = [...routes].sort((a, b) => b.supply - a.supply || a.distanceNm - b.distanceNm)[0];
    if (source) return source.action;
  }
  return { type: 'END_TURN' };
}
