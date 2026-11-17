import React from 'react';
import { BOARD_TILES, GameState, Player } from '@one-monopoly/shared';
import { TOKEN_CONFIG, TokenBadge } from './TokenBadge.js';
import { Clock, ShieldAlert, Award, Wallet, DollarSign, Ticket } from 'lucide-react';

interface Props {
  gameState: GameState;
  myPlayerId: string | null;
  turnTimer: { seconds: number; playerId: string } | null;
}

export const PlayerSidebar: React.FC<Props> = ({
  gameState,
  myPlayerId,
  turnTimer,
}) => {
  const activePlayer = gameState.players[gameState.activePlayerIndex];

  // Helper to calculate net worth: cash + sum of property prices + sum of containers buildCost
  const calculateNetWorth = (player: Player): number => {
    let total = player.balance;
    for (const tileId of Object.keys(gameState.properties)) {
      const prop = gameState.properties[Number(tileId)];
      if (prop?.ownerId === player.id) {
        const tile = BOARD_TILES[Number(tileId)];
        if (tile) {
          total += tile.price || 0;
          if (prop.containerLevel === 5) {
            total += (tile.buildCost || 50) * 5;
          } else if (prop.containerLevel > 0) {
            total += (tile.buildCost || 50) * prop.containerLevel;
          }
        }
      }
    }
    return total;
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Turn Timer & Active Turn Header */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TokenBadge token={activePlayer.token} size="md" />
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              LƯỢT HIỆN TẠI
            </div>
            <div className="text-base font-black text-gray-900 flex items-center gap-2">
              <span>{activePlayer.name}</span>
              {activePlayer.id === myPlayerId && (
                <span className="text-[10px] bg-[#E1007A] text-white px-1.5 py-0.5 rounded font-extrabold">
                  BẠN
                </span>
              )}
            </div>
          </div>
        </div>

        {turnTimer && (
          <div className="flex items-center gap-1.5 bg-pink-50 text-[#E1007A] px-3 py-1.5 rounded-xl font-black text-sm border border-pink-100">
            <Clock className="w-4 h-4 animate-spin" />
            <span>{turnTimer.seconds}s</span>
          </div>
        )}
      </div>

      {/* Players List */}
      <div className="flex flex-col gap-3">
        {gameState.players.map((p) => {
          const isActive = p.id === activePlayer.id;
          const isMe = p.id === myPlayerId;
          const netWorth = calculateNetWorth(p);
          const cfg = TOKEN_CONFIG[p.token];

          const ownedPropsCount = Object.values(gameState.properties).filter(
            (prop) => prop.ownerId === p.id
          ).length;

          return (
            <div
              key={p.id}
              className={`p-4 rounded-2xl border-2 transition relative overflow-hidden bg-white ${
                isActive
                  ? 'border-[#E1007A] shadow-md shadow-pink-100'
                  : 'border-gray-100'
              } ${p.isBankrupt ? 'opacity-40 grayscale' : ''}`}
            >
              {isActive && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-[#E1007A]" />
              )}

              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2.5">
                  <TokenBadge token={p.token} size="sm" />
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-gray-900 text-sm">{p.name}</span>
                      {isMe && (
                        <span className="text-[9px] bg-gray-200 text-gray-700 px-1 rounded font-bold">
                          Bạn
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 font-medium">
                      {cfg.label}
                    </span>
                  </div>
                </div>

                {p.isBankrupt ? (
                  <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                    PHÁ SẢN
                  </span>
                ) : p.inHold ? (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Kẹt Cảng ({p.holdTurns}/3)
                  </span>
                ) : null}
              </div>

              {/* Financial Metrics */}
              <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-gray-100 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] font-medium">TIỀN MẶT</span>
                  <span className="font-extrabold text-emerald-600 text-sm">
                    ${p.balance}M
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] font-medium">TỔNG TÀI SẢN</span>
                  <span className="font-extrabold text-gray-800 text-sm">
                    ${netWorth}M
                  </span>
                </div>
              </div>

              {/* Asset badges */}
              <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 font-medium">
                <span>{ownedPropsCount} Cảng/Tuyến</span>
                {p.customsClearancePasses > 0 && (
                  <span className="flex items-center gap-1 text-emerald-600 font-bold">
                    <Ticket className="w-3 h-3" /> {p.customsClearancePasses} Thẻ Thông Quan
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
