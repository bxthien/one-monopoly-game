import { useCallback, useLayoutEffect, useState } from 'react';
import type { GameEvent, GameState } from '@one-monopoly/shared';
import type { SubscribeBoard } from '../hooks/useSocket.js';
import { buildTravelFrames, restingPose, type Pose, type TravelFrame } from './boardTravel.js';

export interface RentLine {
  playerId: string;
  playerName: string;
  amount: number;
  type: 'deduct' | 'credit';
}

export interface RentReceipt {
  tileId: number;
  lines: RentLine[];
}

export function parseRentReceiptFromEvent(
  event: GameEvent,
  players: Array<{ id: string; name: string }>
): RentReceipt | null {
  if (event.type === 'DEMURRAGE_PAID') {
    const debtor = players.find((p) => p.id === event.debtorId);
    const creditor = players.find((p) => p.id === event.creditorId);
    return {
      tileId: event.tileId,
      lines: [
        {
          playerId: event.debtorId,
          playerName: debtor?.name ?? 'Khách',
          amount: event.amount,
          type: 'deduct',
        },
        {
          playerId: event.creditorId,
          playerName: creditor?.name ?? 'Chủ cảng',
          amount: event.amount,
          type: 'credit',
        },
      ],
    };
  }

  if (event.type === 'SLOT_CHARTER_RENT_SPLIT') {
    const visitor = players.find((p) => p.id === event.visitorId);
    const owner = players.find((p) => p.id === event.ownerId);
    const partner = players.find((p) => p.id === event.partnerId);
    return {
      tileId: event.tileId,
      lines: [
        {
          playerId: event.visitorId,
          playerName: visitor?.name ?? 'Khách',
          amount: event.ownerAmount + event.splitAmount,
          type: 'deduct',
        },
        {
          playerId: event.ownerId,
          playerName: owner?.name ?? 'Chủ cảng',
          amount: event.ownerAmount,
          type: 'credit',
        },
        {
          playerId: event.partnerId,
          playerName: partner?.name ?? 'Đối tác',
          amount: event.splitAmount,
          type: 'credit',
        },
      ],
    };
  }

  return null;
}

type Claim = Extract<GameEvent, { type: 'TILE_PURCHASED' }>;
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
  const [rentReceipts, setRentReceipts] = useState<Record<number, RentReceipt>>({});

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
    const claimExpiry = new Map<number, ReturnType<typeof setTimeout>>();
    const rentExpiry = new Map<number, ReturnType<typeof setTimeout>>();

    const resetTimers = () => {
      claimExpiry.forEach(clearTimeout);
      claimExpiry.clear();
      rentExpiry.forEach(clearTimeout);
      rentExpiry.clear();
    };

    const unsubscribe = subscribe((state, events) => {
      if (events === null) {
        resetTimers();
        setClaims({});
        setRentReceipts({});
        setTracks(snapshot(state));
        return;
      }

      const playerTravelTimes: Record<string, number> = {};

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
          playerTravelTimes[player.id] = additions.reduce((acc, f) => acc + (f.duration || 0), 0);
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

      for (const event of events) {
        if (event.type === 'TILE_PURCHASED') {
          clearTimeout(claimExpiry.get(event.tileId));
          setClaims((prev) => ({ ...prev, [event.tileId]: event }));
          claimExpiry.set(event.tileId, setTimeout(() => {
            setClaims((prev) => {
              const next = { ...prev };
              delete next[event.tileId];
              return next;
            });
            claimExpiry.delete(event.tileId);
          }, 1800));
        }

        const receipt = parseRentReceiptFromEvent(event, state.players);
        if (receipt) {
          clearTimeout(rentExpiry.get(receipt.tileId));
          const debtorId = receipt.lines[0]?.playerId;
          const travelDuration = debtorId ? (playerTravelTimes[debtorId] || 0) : 0;
          const delayMs = skipTravel() ? 0 : travelDuration;

          const showTimer = setTimeout(() => {
            setRentReceipts((prev) => ({ ...prev, [receipt.tileId]: receipt }));
            const hideTimer = setTimeout(() => {
              setRentReceipts((prev) => {
                const next = { ...prev };
                delete next[receipt.tileId];
                return next;
              });
              rentExpiry.delete(receipt.tileId);
            }, 2500);
            rentExpiry.set(receipt.tileId, hideTimer);
          }, delayMs);

          rentExpiry.set(receipt.tileId, showTimer);
        }
      }
    });
    return () => {
      unsubscribe();
      resetTimers();
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

  return { tracks, claims, rentReceipts, advance };
}
