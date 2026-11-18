import React from 'react';
import {
  BOARD_TILES,
  GameAction,
  GameState,
  GREEN_FLEET_COST,
  GREEN_FLEET_ESG_BONUS,
  LOOP_GROUPS_CONFIG,
  Player,
} from '@one-monopoly/shared';
import { TOKEN_CONFIG, TokenBadge } from './TokenBadge.js';
import { X, Building2, TrendingDown, DollarSign, ShieldAlert, Leaf, Handshake, Award } from 'lucide-react';

interface Props {
  tileId: number | null;
  gameState: GameState;
  myPlayerId: string | null;
  onClose: () => void;
  onAction: (action: GameAction) => void;
}

export const PropertyModal: React.FC<Props> = ({
  tileId,
  gameState,
  myPlayerId,
  onClose,
  onAction,
}) => {
  if (tileId === null) return null;

  const tile = BOARD_TILES[tileId];
  if (!tile) return null;

  const prop = gameState.properties[tileId];
  const owner = prop?.ownerId
    ? gameState.players.find((p) => p.id === prop.ownerId)
    : null;
  const isMine = prop?.ownerId === myPlayerId;
  const groupConfig = tile.group ? LOOP_GROUPS_CONFIG[tile.group] : null;

  const buildCost = tile.buildCost || groupConfig?.buildCost || 50;
  const refund = Math.floor(buildCost * 0.5);
  const mortgageValue = tile.mortgageValue || Math.floor((tile.price || 0) * 0.5);
  const unmortgageCost = Math.ceil(mortgageValue * 1.1);

  // Check if can build (owns all in group and even building)
  let canBuild = false;
  let canSell = false;
  let canUpgradeGreen = false;

  if (isMine && tile.type === 'PORT' && groupConfig && !prop.isMortgaged) {
    const ownsAllAndNotMortgaged = groupConfig.tileIds.every((id) => {
      const p = gameState.properties[id];
      return p && p.ownerId === myPlayerId && !p.isMortgaged;
    });
    const minLevel = Math.min(
      ...groupConfig.tileIds.map((id) => gameState.properties[id]!.containerLevel)
    );
    canBuild = ownsAllAndNotMortgaged && prop.containerLevel < 5 && prop.containerLevel <= minLevel;

    const maxLevel = Math.max(
      ...groupConfig.tileIds.map((id) => gameState.properties[id]!.containerLevel)
    );
    canSell = prop.containerLevel > 0 && prop.containerLevel >= maxLevel;

    canUpgradeGreen = prop.containerLevel === 5 && !prop.hasGreenFleet;
  }

  // Check can mortgage (no containers in group)
  let canMortgage = false;
  if (isMine && !prop.isMortgaged) {
    if (tile.type === 'PORT' && groupConfig) {
      const hasContainers = groupConfig.tileIds.some(
        (id) => (gameState.properties[id]?.containerLevel || 0) > 0
      );
      canMortgage = !hasContainers;
    } else {
      canMortgage = true;
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header with Group Bar */}
        <div className="text-center pb-4 border-b border-gray-100">
          {groupConfig && (
            <div
              className="w-full py-1.5 rounded-xl font-black text-white text-xs mb-3 uppercase tracking-wider shadow-sm"
              style={{ backgroundColor: groupConfig.color }}
            >
              {groupConfig.name}
            </div>
          )}
          <h3 className="text-xl font-black text-gray-900">{tile.name}</h3>
          <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            MÃ CẢNG: {tile.code}
          </span>
        </div>

        {/* Green Fleet / Slot Charter Badges */}
        {prop?.hasGreenFleet && (
          <div className="my-3 p-2.5 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800 font-bold">
            <Leaf className="w-4 h-4 text-emerald-600 fill-emerald-600 shrink-0" />
            <div>
              <span>Đã gắn Huy Hiệu Xanh (Green Fuel Ready)</span>
              <p className="text-[10px] text-emerald-600 font-normal mt-0.5">
                Miễn Thuế Carbon (Ô 38) & +${GREEN_FLEET_ESG_BONUS}M điểm thưởng ESG
              </p>
            </div>
          </div>
        )}

        {prop?.slotCharter?.active && (
          <div className="my-2 p-2 bg-blue-50 rounded-xl border border-blue-200 flex items-center gap-2 text-xs text-blue-800 font-bold">
            <Handshake className="w-4 h-4 text-blue-600 shrink-0" />
            <span>Đang kích hoạt Thỏa thuận Chia sẻ Chỗ (50/50)</span>
          </div>
        )}

        {/* Ownership Status */}
        <div className="my-3 p-3 bg-gray-50 rounded-2xl flex items-center justify-between text-xs">
          <span className="font-bold text-gray-500">Chủ sở hữu:</span>
          {owner ? (
            <div className="flex items-center gap-1.5 font-bold text-gray-900">
              <TokenBadge token={owner.token} size="sm" />
              <span>{owner.name}</span>
            </div>
          ) : (
            <span className="text-gray-400 font-medium">Chưa có ai sở hữu</span>
          )}
        </div>

        {/* Rent Schedule (for Ports) */}
        {tile.type === 'PORT' && tile.rentTiers && (
          <div className="space-y-1.5 my-3 text-xs font-medium text-gray-600">
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span>Phí cước cơ bản:</span>
              <span className="font-bold text-gray-900">${tile.rentTiers[0]}M</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span>1 Lô Container Magenta:</span>
              <span className="font-bold text-gray-900">${tile.rentTiers[1]}M</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span>2 Lô Container Magenta:</span>
              <span className="font-bold text-gray-900">${tile.rentTiers[2]}M</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span>3 Lô Container Magenta:</span>
              <span className="font-bold text-gray-900">${tile.rentTiers[3]}M</span>
            </div>
            <div className="flex justify-between py-1 border-b border-gray-100">
              <span>4 Lô Container Magenta:</span>
              <span className="font-bold text-gray-900">${tile.rentTiers[4]}M</span>
            </div>
            <div className="flex justify-between py-1 text-[#E1007A] font-black">
              <span>🛳️ Siêu tàu ONE Innovation (24K TEU):</span>
              <span>${tile.rentTiers[5]}M</span>
            </div>
          </div>
        )}

        {/* Service Lines Pricing Table */}
        {tile.type === 'SERVICE_LINE' && (
          <div className="space-y-1 my-3 text-xs font-medium text-gray-600 bg-gray-50 p-3 rounded-2xl">
            <div className="font-bold text-gray-800 text-[11px] mb-1">CƯỚC TUYẾN HUYẾT MẠCH:</div>
            <div className="flex justify-between"><span>Sở hữu 1 tuyến:</span><span className="font-bold text-gray-900">$25M</span></div>
            <div className="flex justify-between"><span>Sở hữu 2 tuyến:</span><span className="font-bold text-gray-900">$50M</span></div>
            <div className="flex justify-between"><span>Sở hữu 3 tuyến:</span><span className="font-bold text-gray-900">$100M</span></div>
            <div className="flex justify-between text-[#E1007A] font-bold"><span>Trọn bộ 4 tuyến toàn cầu:</span><span>$200M</span></div>
          </div>
        )}

        {/* Owner Management Buttons */}
        {isMine && prop && (
          <div className="space-y-2 mt-4 pt-4 border-t border-gray-100">
            {tile.type === 'PORT' && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => onAction({ type: 'BUILD_CONTAINER', tileId })}
                    disabled={!canBuild}
                    className="py-2.5 px-3 rounded-xl font-black text-xs text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 transition flex items-center justify-center gap-1"
                  >
                    <Building2 className="w-4 h-4" />{' '}
                    {prop.containerLevel === 4
                      ? 'Lên ONE Innovation'
                      : `Đặt Lô (+${buildCost}M)`}
                  </button>

                  <button
                    onClick={() => onAction({ type: 'SELL_CONTAINER', tileId })}
                    disabled={!canSell}
                    className="py-2.5 px-3 rounded-xl font-bold text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 transition flex items-center justify-center gap-1 border border-amber-200"
                  >
                    <TrendingDown className="w-4 h-4" /> Bán (Hoàn ${refund}M)
                  </button>
                </div>

                {/* Green Fleet Upgrade Button */}
                {prop.containerLevel === 5 && !prop.hasGreenFleet && (
                  <button
                    onClick={() => onAction({ type: 'UPGRADE_GREEN_FLEET', tileId })}
                    className="w-full py-2.5 px-3 rounded-xl font-black text-xs text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-200"
                  >
                    <Leaf className="w-4 h-4" /> Gắn Huy Hiệu Xanh (+${GREEN_FLEET_COST}M)
                  </button>
                )}
              </>
            )}

            {!prop.isMortgaged ? (
              <button
                onClick={() => onAction({ type: 'MORTGAGE_TILE', tileId })}
                disabled={!canMortgage}
                className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 transition border border-red-200 flex items-center justify-center gap-1"
              >
                <ShieldAlert className="w-4 h-4" /> Thế chấp (Nhận +${mortgageValue}M)
              </button>
            ) : (
              <button
                onClick={() => onAction({ type: 'UNMORTGAGE_TILE', tileId })}
                className="w-full py-2.5 px-3 rounded-xl font-black text-xs text-white bg-blue-600 hover:bg-blue-700 transition flex items-center justify-center gap-1 shadow-md shadow-blue-200"
              >
                <DollarSign className="w-4 h-4" /> Chuộc lại (Nộp ${unmortgageCost}M)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
