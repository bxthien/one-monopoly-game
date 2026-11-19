import React from 'react';
import { GameAction, GameState } from '@one-monopoly/shared';
import { TOKEN_CONFIG } from './TokenBadge.js';

interface Props {
  gameState: GameState;
  myPlayerId: string | null;
  turnTimer: { seconds: number; playerId: string } | null;
  onAction?: (action: GameAction) => void;
}

export const PlayerSidebar: React.FC<Props> = ({
  gameState,
  myPlayerId,
  turnTimer,
}) => {
  const activePlayer = gameState.players[gameState.activePlayerIndex];

  return (
    <div className="table-scoreboard flex flex-col gap-1.5 select-none pointer-events-auto">
      {/* Danh Sách Người Chơi Tinh Gọn: Góc Trên Bên Trái, Mỗi User 1 Hàng */}
      <div className="table-players bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-lg border border-gray-200/90 flex flex-col gap-1 min-w-0">
        {gameState.players.map((p) => {
          const isActive = p.id === activePlayer.id;
          const isMe = p.id === myPlayerId;
          const cfg = TOKEN_CONFIG[p.token];

          return (
            <div
              key={p.id}
              className={`table-player flex items-center justify-between px-2.5 py-1.5 rounded-xl transition ${
                isActive
                  ? 'bg-pink-50/90 border-2 border-[#E1007A] shadow-xs'
                  : 'bg-gray-50/80 border border-transparent'
              } ${p.isBankrupt ? 'opacity-40 grayscale' : ''}`}
            >
              {/* Icon + Tên */}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-base shrink-0 leading-none" title={cfg.label}>
                  {cfg.emoji}
                </span>
                <div className="flex items-center gap-1 min-w-0">
                  <span
                    className={`text-xs truncate max-w-[100px] sm:max-w-[120px] ${
                      isActive ? 'font-black text-gray-950' : 'font-bold text-gray-700'
                    }`}
                  >
                    {p.name}
                  </span>
                  {isMe && (
                    <span className="text-[8px] bg-[#E1007A] text-white px-1 py-0.2 rounded font-black shrink-0">
                      BẠN
                    </span>
                  )}
                </div>
              </div>

              {/* Số tiền mặt */}
              <div className="table-player-balance flex items-center gap-1.5 shrink-0 ml-2">
                {p.isBankrupt ? (
                  <span className="text-[10px] font-black text-red-600 bg-red-50 px-1.5 py-0.2 rounded">
                    Phá sản
                  </span>
                ) : (
                  <span
                    className={`text-xs font-black tracking-tight ${
                      isActive ? 'text-[#E1007A]' : 'text-emerald-700'
                    }`}
                  >
                    ${p.balance.toLocaleString('en-US')}M
                  </span>
                )}
                {isActive && turnTimer && (
                  <span className="text-[10px] font-black text-[#E1007A] bg-pink-100 px-1 py-0.2 rounded-md animate-pulse">
                    {turnTimer.seconds}s
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

