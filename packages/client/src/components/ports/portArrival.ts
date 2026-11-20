import { BOARD_TILES, type GameEvent, type GameState } from '@one-monopoly/shared';
import { portGuide, type PortArrival } from './portGuide.js';

// An unrelated room update preserves the open chart. A new voyage without
// a port destination clears it, including an intervening trip to customs.
export function readPortLanding(state: GameState, events: GameEvent[]): Omit<PortArrival, 'id'> | null | undefined {
  const movement = events.filter(event => event.type === 'SHIP_STEPPED');
  const last = movement.at(-1);
  if (!last) return events.some(event => event.type === 'DICE_ROLLED' || event.type === 'SENT_TO_HOLD') ? null : undefined;
  const player = state.players.find(p => p.id === last.playerId);
  const destination = portGuide[BOARD_TILES[last.to]?.code];
  if (!destination || !player || player.isBankrupt || player.position !== last.to) return null;
  const first = movement.find(event => event.playerId === player.id)!;
  return { playerName: player.name, port: destination, origin: portGuide[BOARD_TILES[first.from]?.code] };
}
