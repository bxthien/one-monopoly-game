import {
  FREIGHT_TENDER_MAX_BID, FREIGHT_TENDER_MIN_BID, getCargoBookings, getCargoOpportunity,
  getCargoRedirections, getEmptyNeed, getLogisticsRoutes, getTenderBidAction,
  type FreightTender, type GameAction, type GameState, type Player, type PortStock,
} from '@one-monopoly/shared';

function quoteNextRound(captain: Player, stock: PortStock, tender: FreightTender): number | null {
  const job = captain.cargo;
  if (job) {
    if (job.kind !== tender.kind || job.originTileId === tender.destinationTileId) return null;
    return FREIGHT_TENDER_MIN_BID + (job.destinationTileId === tender.destinationTileId ? 1 : 4);
  }
  const available = tender.kind === 'laden' ? stock.supply : stock.empties - stock.emptyTarget;
  if (captain.position === tender.destinationTileId || available < 1) return null;
  return FREIGHT_TENDER_MAX_BID - (available > 1 ? 5 : 3);
}

export function getFreightBotAction(state: GameState): GameAction {
  const captain = state.players[state.activePlayerIndex];
  const operations = state.logistics;
  if (!operations) return { type: 'END_TURN' };
  const job = captain.cargo;
  const discharge = getCargoOpportunity(state, captain.id);
  const contract = operations.market?.contract;
  const owesDelivery = contract?.status === 'active' && contract.playerId === captain.id && contract.deliveryRound === state.turnCount;
  if (owesDelivery) {
    const target = contract.destinationTileId;
    if (!job && !operations.hasSailed) {
      const load = getCargoBookings(state, captain.id, contract.kind).find(choice => choice.tileId === target);
      if (load) return load.action;
    } else if (job?.kind === contract.kind && (!operations.hasSailed || captain.position === target)) {
      if (job.destinationTileId !== target) {
        const redirect = getCargoRedirections(state, captain.id).find(choice => choice.tileId === target);
        if (redirect) return redirect.action;
      } else {
        const route = getLogisticsRoutes(state, captain.id).find(choice => choice.tileId === target && choice.quote);
        if (route) return route.action;
      }
    }
  }
  if (discharge?.action.type === 'UNLOAD_CARGO') return discharge.action;

  // Price the next round from the berth and equipment actually available after this voyage.
  const tender = operations.market?.tender;
  if (operations.hasSailed && tender && !owesDelivery) {
    const amount = quoteNextRound(captain, operations.ports[captain.position], tender);
    if (amount !== null) {
      if (tender.bids[captain.id] === undefined) {
        const bid = getTenderBidAction(state, captain.id, amount);
        if (bid) return bid;
      } else if (!job) {
        const load = getCargoBookings(state, captain.id, tender.kind).find(choice => choice.tileId === tender.destinationTileId);
        // A winning shipper can receive a box even if the public berth is already full.
        return load?.action ?? { type: 'END_TURN' };
      }
    }
  }

  if (!job) {
    const exports = getCargoBookings(state, captain.id, 'laden');
    const equipment = getCargoBookings(state, captain.id, 'empty');
    // After an export, try returning equipment to a shortage port for the next ship.
    const preferEmpty = captain.lastDelivery?.kind === 'laden';
    const preferred = preferEmpty ? equipment : exports;
    // Start an export tender round by returning surplus boxes to a port that can ship next round.
    const feeder = !captain.lastDelivery && tender?.kind === 'laden'
      ? equipment.filter(choice => choice.tileId !== tender.destinationTileId && operations.ports[choice.tileId].supply > 0)
      : [];
    const options = [feeder, preferred, preferEmpty ? exports : equipment].find(choices => choices.length);
    if (options) return [...options].sort((a, b) => b.quote.reward - a.quote.reward)[0].action;
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
