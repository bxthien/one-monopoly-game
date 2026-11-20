import { BOARD_TILES, INFRA_TILES, LOOP_GROUPS_CONFIG, SERVICE_LINES } from './boardData.js';
import type { GameState } from './types.js';

export function getBotAskingPrice(state: GameState, sellerId: string, tileId: number): number | null {
  if (!Number.isSafeInteger(tileId) || state.properties[tileId]?.ownerId !== sellerId) return null;
  const tile = BOARD_TILES[tileId];
  if (!tile?.price) return null;

  let group: number[];
  if (tile.type === 'PORT' && tile.group) group = LOOP_GROUPS_CONFIG[tile.group].tileIds;
  else if (tile.type === 'SERVICE_LINE') group = SERVICE_LINES;
  else if (tile.type === 'INFRA') group = INFRA_TILES;
  else return null;

  const held = group.filter(id => state.properties[id]?.ownerId === sellerId).length;
  if (held === group.length) return Math.ceil(tile.price * 1.5);
  if (held > 1) return Math.ceil(tile.price * 1.25);
  return tile.price;
}
