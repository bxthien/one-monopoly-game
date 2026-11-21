import { canSettleTrade, getBotAskingPrice, getTradeRestriction } from '@one-monopoly/shared';
import type { GameAction, GameState } from '@one-monopoly/shared';

export function getBotTradeResponse(
  state: GameState, botId: string
): Extract<GameAction, { type: 'RESPOND_TRADE' }> | null {
  if (!canSettleTrade(state)) return null;
  const eligible = (state.tradeOffers ?? []).filter(offer => {
    if (offer.sellerId !== botId || state.properties[offer.tileId]?.ownerId !== botId ||
        !Number.isSafeInteger(offer.price) || offer.price < 1) return false;
    const buyer = state.players.find(player => player.id === offer.buyerId);
    return buyer && buyer.balance >= offer.price && getTradeRestriction(state, buyer.id, offer.tileId) === null;
  });
  eligible.sort((a, b) => b.price - a.price || a.id - b.id);
  const offer = eligible[0];
  if (!offer) return null;
  const askingPrice = getBotAskingPrice(state, botId, offer.tileId);
  if (askingPrice === null) return null;
  return { type: 'RESPOND_TRADE', offerId: offer.id, accept: offer.price >= askingPrice };
}
