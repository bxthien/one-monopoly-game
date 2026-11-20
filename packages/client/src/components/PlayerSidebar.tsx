import React, { useState, useEffect } from 'react';
import { GameEvent, GameState } from '@one-monopoly/shared';
import { Anchor, Timer } from 'lucide-react';
import { TOKEN_CONFIG } from './TokenBadge.js';
import type { RentReceipt } from './useBoardPlayback.js';

interface Props {
  gameState: GameState;
  myPlayerId: string | null;
  turnTimer: { seconds: number; playerId: string } | null;
  latestEvents?: GameEvent[];
  rentReceipts?: Record<number, RentReceipt>;
}

export const PlayerSidebar: React.FC<Props> = ({ gameState, myPlayerId, turnTimer, latestEvents, rentReceipts }) => {
  const active = gameState.players[gameState.activePlayerIndex];
  const isMyTurn = myPlayerId === active.id;
  const [deltas, setDeltas] = useState<Record<string, { delta: number; key: number }>>({});
  const [pendingDeltas, setPendingDeltas] = useState<Record<string, number>>({});

  // Khi có sự kiện cước mới phát sinh, lưu vào pendingDeltas để giữ số dư hiển thị ban đầu
  // trong suốt thời gian tàu đang di chuyển trên bàn cờ.
  useEffect(() => {
    if (!latestEvents || latestEvents.length === 0) return;

    const rentDeltas: Record<string, number> = {};
    for (const evt of latestEvents) {
      if (evt.type === 'DEMURRAGE_PAID') {
        rentDeltas[evt.debtorId] = (rentDeltas[evt.debtorId] || 0) - evt.amount;
        rentDeltas[evt.creditorId] = (rentDeltas[evt.creditorId] || 0) + evt.amount;
      } else if (evt.type === 'SLOT_CHARTER_RENT_SPLIT') {
        rentDeltas[evt.visitorId] = (rentDeltas[evt.visitorId] || 0) - (evt.ownerAmount + evt.splitAmount);
        rentDeltas[evt.ownerId] = (rentDeltas[evt.ownerId] || 0) + evt.ownerAmount;
        rentDeltas[evt.partnerId] = (rentDeltas[evt.partnerId] || 0) + evt.splitAmount;
      }
    }

    if (Object.keys(rentDeltas).length > 0) {
      setPendingDeltas(rentDeltas);
    } else {
      setPendingDeltas({});
    }
  }, [latestEvents]);

  // Khi tàu đã cập bến đích, useBoardPlayback kích hoạt rentReceipts.
  // Lúc này mới hiển thị huy hiệu trừ/cộng tiền và cập nhật số dư mới nhất trên sidebar.
  useEffect(() => {
    if (rentReceipts === undefined) return;

    const activeReceipts = Object.values(rentReceipts);
    if (activeReceipts.length === 0) {
      setDeltas({});
      setPendingDeltas({});
      return;
    }

    const newDeltas: Record<string, number> = {};
    for (const receipt of activeReceipts) {
      for (const line of receipt.lines) {
        newDeltas[line.playerId] = (newDeltas[line.playerId] || 0) + (line.type === 'deduct' ? -line.amount : line.amount);
      }
    }

    if (Object.keys(newDeltas).length > 0) {
      const now = Date.now();
      const deltaMap: Record<string, { delta: number; key: number }> = {};
      for (const [pid, d] of Object.entries(newDeltas)) {
        deltaMap[pid] = { delta: d, key: now };
      }
      setDeltas(deltaMap);
      setPendingDeltas({});
    }
  }, [rentReceipts]);

  // Fallback nếu không truyền rentReceipts
  useEffect(() => {
    if (rentReceipts !== undefined) return;
    if (Object.keys(pendingDeltas).length === 0) return;

    const now = Date.now();
    const deltaMap: Record<string, { delta: number; key: number }> = {};
    for (const [pid, d] of Object.entries(pendingDeltas)) {
      deltaMap[pid] = { delta: d, key: now };
    }
    setDeltas(deltaMap);
    setPendingDeltas({});
    const timer = setTimeout(() => setDeltas({}), 2500);
    return () => clearTimeout(timer);
  }, [pendingDeltas, rentReceipts]);

  return (
    <section className="table-scoreboard" aria-label="Đội tàu">
      <div className="chart-turn">
        <div className="chart-turn-line">
          <span><Anchor size={14} /> Đang đến lượt</span>
          {turnTimer?.playerId === active.id && (
            <time aria-label={`Còn ${turnTimer.seconds} giây`}><Timer size={14} />{turnTimer.seconds}s</time>
          )}
        </div>
        <h2>{isMyTurn ? 'Lượt của bạn' : active.name}</h2>
      </div>
      <div className="chart-fleet">
        <div className="chart-fleet-title"><h2>Đội tàu</h2><span>Số dư</span></div>
        <ul className="table-players">
          {gameState.players.map(player => {
            const token = TOKEN_CONFIG[player.token];
            const deltaInfo = deltas[player.id];
            const pendingDelta = pendingDeltas[player.id] || 0;
            const displayedBalance = player.balance - pendingDelta;
            return (
              <li
                key={player.id}
                className={`table-player ${deltaInfo ? (deltaInfo.delta > 0 ? 'table-player-credit' : 'table-player-deduct') : ''}`}
                aria-current={player.id === active.id ? 'step' : undefined}
              >
                <span className="chart-token" style={{ borderColor: token.color }} title={token.label}>{token.emoji}</span>
                <span className="chart-player-name">{player.name}{player.id === myPlayerId && <small>Bạn</small>}</span>
                <div className="flex items-center justify-end">
                  <strong className="chart-balance">{player.isBankrupt ? 'Phá sản' : `$${displayedBalance.toLocaleString('en-US')}M`}</strong>
                  {deltaInfo && (
                    <span
                      key={deltaInfo.key}
                      className={`chart-delta-tag ${deltaInfo.delta > 0 ? 'chart-delta-positive' : 'chart-delta-negative'}`}
                    >
                      {deltaInfo.delta > 0 ? `+$${deltaInfo.delta}M 💰` : `-$${Math.abs(deltaInfo.delta)}M 💸`}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
