import { useCallback, useLayoutEffect, useState } from 'react';
import type { GameEvent, GameState } from '@one-monopoly/shared';
import type { SubscribeBoard } from '../hooks/useSocket.js';
import { buildTravelFrames, restingPose, type Pose, type TravelFrame } from './boardTravel.js';

type Claim = Pick<Extract<GameEvent, { type: 'TILE_PURCHASED' }>, 'tileId' | 'playerId' | 'price'>;
interface Track {
  settled: Pose;
  frames: TravelFrame[];
}

function snapshot(state: GameState): Record<string, Track> {
  return Object.fromEntries(state.players.map((player) =>
    [player.id, { settled: restingPose(player.position), frames: [] }]));
}

export function useBoardPlayback(initialState: GameState, subscribe: SubscribeBoard) {
  const [tracks, setTracks] = useState(() => snapshot(initialState));
  const [claims, setClaims] = useState<Record<number, Claim>>({});

  useLayoutEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const skipTravel = () => preference.matches || document.hidden;
    const settlePending = () => {
      if (!skipTravel()) return;
      setTracks((tracks) => Object.fromEntries(Object.entries(tracks).map(([id, track]) => [
        id, { settled: track.frames.at(-1) ?? track.settled, frames: [] },
      ])));
    };
    preference.addEventListener('change', settlePending);
    document.addEventListener('visibilitychange', settlePending);
    const expiry = new Map<number, ReturnType<typeof setTimeout>>();
    const resetClaims = () => {
      expiry.forEach(clearTimeout);
      expiry.clear();
    };
    const unsubscribe = subscribe((state, events) => {
      if (events === null) {
        resetClaims();
        setClaims({});
        setTracks(snapshot(state));
        return;
      }

      for (const event of events) {
        let claim: Claim;
        if (event.type === 'TILE_PURCHASED') claim = event;
        else if (event.type === 'TRADE_CLOSED' && event.result === 'ACCEPTED') {
          const { tileId, buyerId, price } = event.offer;
          claim = { tileId, playerId: buyerId, price };
        } else continue;
        const { tileId } = claim;
        clearTimeout(expiry.get(tileId));
        setClaims((prev) => ({ ...prev, [tileId]: claim }));
        expiry.set(tileId, setTimeout(() => {
          setClaims((prev) => {
            const next = { ...prev };
            delete next[tileId];
            return next;
          });
          expiry.delete(tileId);
        }, 1800));
      }

      setTracks((prev) => {
        const next = { ...prev };
        for (const player of state.players) {
          const existing = prev[player.id];
          if (!existing) {
            next[player.id] = { settled: restingPose(player.position), frames: [] };
            continue;
          }
          const projected = existing.frames.at(-1) ?? existing.settled;
          const additions = buildTravelFrames(projected, player.id, events);
          const arrival = additions.at(-1) ?? projected;
          if (arrival.tile !== player.position) {
            next[player.id] = { settled: restingPose(player.position), frames: [] };
          } else if (skipTravel()) {
            next[player.id] = { settled: arrival, frames: [] };
          } else if (additions.length) {
            next[player.id] = { settled: existing.settled, frames: [...existing.frames, ...additions] };
          }
        }
        return next;
      });
    });
    return () => {
      unsubscribe();
      resetClaims();
      preference.removeEventListener('change', settlePending);
      document.removeEventListener('visibilitychange', settlePending);
    };
  }, [subscribe]);

  const advance = useCallback((id: string, frame: TravelFrame) => {
    setTracks((prev) => {
      const track = prev[id];
      if (track?.frames[0] !== frame) return prev;
      return { ...prev, [id]: { settled: frame, frames: track.frames.slice(1) } };
    });
  }, []);

  return { tracks, claims, advance };
}
