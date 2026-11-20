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
  return { playerId: player.id, playerName: player.name, port: destination, origin: portGuide[BOARD_TILES[first.from]?.code] };
}

export type PortDischarge = Extract<GameEvent, { type: 'CARGO_UNLOADED' }>;

// The arrival map follows one live port call. A later visit to the same berth
// must start fresh even when the previous delivery is still the player's last receipt.
export function updatePortDischarge(previous: PortDischarge | null, events: GameEvent[]): PortDischarge | null {
  let current = previous;
  for (const event of events) {
    if (event.type === 'CARGO_UNLOADED') current = event;
    else if (event.type === 'SHIP_STEPPED' || event.type === 'CARGO_LOADED' || event.type === 'LOGISTICS_TURN_ENDED') current = null;
  }
  return current;
}
