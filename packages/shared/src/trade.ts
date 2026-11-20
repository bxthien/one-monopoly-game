import { BOARD_TILES, LOOP_GROUPS_CONFIG } from './boardData.js';
import type { EngineResult, GameAction, GameEvent, GameState, Player, TradeOffer } from './types.js';

type TradeAction = Extract<GameAction, { type: 'OFFER_TRADE' | 'RESPOND_TRADE' | 'CANCEL_TRADE' }>;

export function canSettleTrade(state: GameState): boolean {
  return state.gameStarted && state.winnerId === null && (
    state.phase === 'WAIT_FOR_ROLL' || state.phase === 'END_OF_TURN' || state.phase === 'AWAITING_BUY_DECISION'
  );
}

export function getTradeRestriction(state: GameState, buyerId: string, tileId: number): string | null {
  if (!state.gameStarted || state.winnerId !== null) return 'Ván chơi không còn nhận giao dịch.';
  const buyer = state.players.find(player => player.id === buyerId);
  if (!buyer || buyer.isBankrupt) return 'Bạn không thể giao dịch trong ván này.';
  if (buyer.balance < 1) return 'Bạn cần ít nhất $1M để đề nghị mua.';

  if (!Number.isSafeInteger(tileId)) return 'Tài sản không hợp lệ.';
  const tile = BOARD_TILES[tileId];
  const property = state.properties[tileId];
  if (!property || !tile || !property.ownerId ||
      (tile.type !== 'PORT' && tile.type !== 'SERVICE_LINE' && tile.type !== 'INFRA')) {
    return 'Chỉ có thể đề nghị mua tài sản thuộc sở hữu của thuyền trưởng khác.';
  }
  if (property.ownerId === buyerId) return 'Bạn đang sở hữu tài sản này.';
  const seller = state.players.find(player => player.id === property.ownerId);
  if (!seller || seller.isBankrupt) return 'Chủ sở hữu không thể giao dịch.';
  if (property.isMortgaged) return 'Tài sản đang được thế chấp.';
  if (property.slotCharter?.active) return 'Tài sản đang có thỏa thuận chia sẻ chỗ.';
  if (tile.type === 'PORT' && tile.group) {
    const developed = LOOP_GROUPS_CONFIG[tile.group].tileIds.some(id => {
      const port = state.properties[id];
      return port && (port.containerLevel > 0 || port.hasGreenFleet);
    });
    if (developed) return 'Cần bán hết công trình trong nhóm cảng trước khi giao dịch.';
  }
  return null;
}

function hasValidTerms(state: GameState, offer: TradeOffer): boolean {
  const { buyerId, sellerId, tileId, price } = offer;
  if (getTradeRestriction(state, buyerId, tileId) !== null || state.properties[tileId].ownerId !== sellerId) {
    return false;
  }
  const buyer = state.players.find(player => player.id === buyerId)!;
  return Number.isSafeInteger(price) && price > 0 && price <= buyer.balance;
}

export function expireTradeOffers(state: GameState, events: GameEvent[]): void {
  if (!state.tradeOffers?.length) return;
  state.tradeOffers = state.tradeOffers.filter(offer => {
    if (hasValidTerms(state, offer)) return true;
    events.push({ type: 'TRADE_CLOSED', offer, result: 'EXPIRED' });
    return false;
  });
}

export function dispatchTrade(
  state: GameState, action: TradeAction, actorId: string | undefined,
  checkMission: (state: GameState, events: GameEvent[], player: Player) => void
): EngineResult {
  const unchanged: EngineResult = { state, events: [] };
  if (!actorId || !state.gameStarted || state.winnerId !== null) return unchanged;
  const offers = state.tradeOffers ?? [];
  if (action.type === 'OFFER_TRADE') {
    if (offers.some(offer => offer.buyerId === actorId)) return unchanged;
    const id = (state.tradeSequence ?? 0) + 1;
    const offer: TradeOffer = { id, buyerId: actorId, sellerId: action.sellerId, tileId: action.tileId, price: action.price };
    if (!hasValidTerms(state, offer)) return unchanged;
    return {
      state: { ...state, tradeOffers: [...offers, offer], tradeSequence: id },
      events: [{ type: 'TRADE_OFFERED', offer }],
    };
  }

  const offer = offers.find(candidate => candidate.id === action.offerId);
  if (!offer) return unchanged;
  if (action.type === 'CANCEL_TRADE') {
    if (offer.buyerId !== actorId) return unchanged;
  } else if (offer.sellerId !== actorId || typeof action.accept !== 'boolean' || (action.accept && !canSettleTrade(state))) {
    return unchanged;
  }

  const next: GameState = { ...state, tradeOffers: offers.filter(candidate => candidate.id !== offer.id) };
  if (action.type === 'CANCEL_TRADE') {
    return { state: next, events: [{ type: 'TRADE_CLOSED', offer, result: 'WITHDRAWN' }] };
  }
  if (!action.accept) return { state: next, events: [{ type: 'TRADE_CLOSED', offer, result: 'DECLINED' }] };
  if (!hasValidTerms(state, offer)) return { state: next, events: [{ type: 'TRADE_CLOSED', offer, result: 'EXPIRED' }] };

  // The mission check can update the buyer's mission as well as their balance.
  next.players = structuredClone(state.players);
  const buyer = next.players.find(player => player.id === offer.buyerId)!;
  const seller = next.players.find(player => player.id === offer.sellerId)!;
  buyer.balance -= offer.price;
  seller.balance += offer.price;
  next.properties = {
    ...state.properties,
    [offer.tileId]: { ...state.properties[offer.tileId], ownerId: buyer.id, slotCharter: null },
  };
  const tileName = BOARD_TILES[offer.tileId].name;
  const events: GameEvent[] = [
    { type: 'TRADE_CLOSED', offer, result: 'ACCEPTED' },
    { type: 'BALANCE_CHANGED', playerId: buyer.id, delta: -offer.price, newBalance: buyer.balance, reason: `Mua ${tileName} từ ${seller.name}` },
    { type: 'BALANCE_CHANGED', playerId: seller.id, delta: offer.price, newBalance: seller.balance, reason: `Bán ${tileName} cho ${buyer.name}` },
  ];
  checkMission(next, events, buyer);
  return { state: next, events };
}
