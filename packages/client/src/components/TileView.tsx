import React from 'react';
import { BoardTile, LOOP_GROUPS_CONFIG, Player, PropertyState } from '@one-monopoly/shared';
import { motion } from 'framer-motion';
import { TOKEN_CONFIG } from './TokenBadge.js';
import { Leaf, Handshake } from 'lucide-react';

interface Props {
  tile: BoardTile;
  property?: PropertyState;
  owner?: Player;
  playersOnTile: Player[];
  onClick?: () => void;
  orientation: 'bottom' | 'left' | 'top' | 'right' | 'corner';
  is3D?: boolean;
}

export const TileView: React.FC<Props> = ({
  tile,
  property,
  owner,
  playersOnTile,
  onClick,
  orientation,
  is3D = false,
}) => {
  const groupConfig = tile.group ? LOOP_GROUPS_CONFIG[tile.group] : null;
  const isCorner = orientation === 'corner';

  // Format 3D Containers & ONE Innovation display
  const renderContainers = () => {
    if (!property || property.containerLevel <= 0) return null;

    if (property.containerLevel === 5) {
      return (
        <div
          className="flex items-center gap-1 bg-gradient-to-r from-pink-600 to-[#E1007A] text-white px-2 py-0.5 rounded-md text-[9px] font-black shadow-md border border-white/50"
        >
          <span className="text-xs">🛳️</span>
          <span className="tracking-tight">ONE INNOVATION</span>
          {property.hasGreenFleet && (
            <span className="text-emerald-300 ml-0.5 font-bold" title="Green Fleet Ready">🌱</span>
          )}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: property.containerLevel }).map((_, i) => (
          <div
            key={i}
            className="w-3.5 h-3 rounded-[3px] bg-[#E1007A] border border-white flex flex-col justify-between p-[0.5px] shadow-sm"
            title={`Lô Container Magenta ${i + 1}`}
          >
            <div className="w-full h-[0.5px] bg-pink-200" />
            <div className="w-full h-[0.5px] bg-pink-200" />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col justify-between border-2 border-gray-200 bg-white hover:bg-pink-50/40 transition cursor-pointer select-none overflow-visible ${
        isCorner ? 'p-2' : 'p-1.5'
      } ${property?.isMortgaged ? 'opacity-60 bg-gray-100' : ''}`}
      style={{
        boxShadow: owner
          ? `inset 0 0 0 2.5px ${TOKEN_CONFIG[owner.token].color}`
          : undefined,
        transformStyle: is3D ? 'preserve-3d' : undefined,
      }}
    >
      {/* Group Color Bar for Ports */}
      {groupConfig && (
        <div
          className={`w-full font-black text-white text-[10px] text-center tracking-tight truncate shadow-xs ${
            orientation === 'bottom'
              ? 'h-4 order-first mb-1 rounded-t-sm'
              : orientation === 'top'
              ? 'h-4 order-last mt-1 rounded-b-sm'
              : 'h-3.5 mb-1'
          }`}
          style={{ backgroundColor: groupConfig.color }}
        >
          {groupConfig.name.split(' ')[0]}
        </div>
      )}

      {/* Tile Header & Code - Chữ to, đậm, rõ ràng */}
      <div className="text-center w-full">
        <div className="text-[11px] font-black text-gray-900 leading-tight truncate flex items-center justify-center gap-1">
          <span>{tile.code}</span>
          {property?.hasGreenFleet && (
            <span title="Tàu Nhiên Liệu Xanh">
              <Leaf className="w-3 h-3 text-emerald-500 fill-emerald-500" />
            </span>
          )}
          {property?.slotCharter?.active && (
            <span title="Đang chia sẻ chỗ (Slot Charter)">
              <Handshake className="w-3 h-3 text-blue-500" />
            </span>
          )}
        </div>
        <div className="text-[9px] font-bold text-gray-600 line-clamp-1 leading-tight mt-0.5">
          {tile.name}
        </div>
      </div>

      {/* Center status: Containers or Special Icon */}
      <div className="flex items-center justify-center my-1 min-h-[18px]">
        {renderContainers()}
        {tile.type === 'GO' && (
          <div className="text-center">
            <span className="text-base font-black text-[#E1007A] block leading-none">GO</span>
            <span className="text-[9px] font-extrabold text-gray-700">+$200M</span>
          </div>
        )}
        {tile.type === 'CUSTOMS_HOLD' && (
          <div className="text-center text-amber-700 font-black text-[10px] leading-tight">
            KIỂM HÓA
          </div>
        )}
        {tile.type === 'FREE_ANCHOR' && (
          <div className="text-center text-teal-700 font-black text-[10px] leading-tight">
            NEO ĐẬU
          </div>
        )}
        {tile.type === 'GO_TO_HOLD' && (
          <div className="text-center text-red-700 font-black text-[10px] leading-tight">
            VÀO HOLD
          </div>
        )}
        {tile.type === 'MARKET_CARD' && (
          <span className="text-base filter drop-shadow-xs">📈</span>
        )}
        {tile.type === 'OPS_CARD' && (
          <span className="text-base filter drop-shadow-xs">⚙️</span>
        )}
        {tile.type === 'TAX' && (
          <span className="text-[10px] font-black text-red-600">-${tile.taxAmount}M</span>
        )}
      </div>

      {/* Mortgaged Warning */}
      {property?.isMortgaged && (
        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-[1px] flex items-center justify-center z-10">
          <span className="text-[10px] font-black text-white bg-red-600 px-1.5 py-0.5 rounded shadow">
            CẦM CỐ
          </span>
        </div>
      )}

      {/* Bottom Price or Owner Info */}
      <div className="w-full flex items-center justify-between text-[9px] font-extrabold text-gray-700 border-t border-gray-100 pt-0.5">
        {tile.price ? (
          <span>${tile.price}M</span>
        ) : (
          <span />
        )}
        {owner && (
          <span
            className="w-3 h-3 rounded-full flex items-center justify-center text-[8px] text-white font-black shadow-xs"
            style={{ backgroundColor: TOKEN_CONFIG[owner.token].color }}
            title={`Chủ sở hữu: ${owner.name}`}
          >
            ✓
          </span>
        )}
      </div>

      {/* Billboard Pawns (Quân Cờ Đứng Thẳng 3D với góc nghiêng tự nhiên 35 độ) */}
      {playersOnTile.length > 0 && (
        <div
          className="absolute inset-0 flex items-center justify-center gap-1.5 z-30 pointer-events-none"
          style={{ transformStyle: is3D ? 'preserve-3d' : undefined }}
        >
          {playersOnTile.map((p) => {
            const cfg = TOKEN_CONFIG[p.token];

            return (
              <div key={p.id} className="relative flex flex-col items-center justify-center">
                {/* 3D Soft Drop Shadow on Board Ground */}
                {is3D && (
                  <div className="absolute -bottom-1 w-6 h-3 bg-black/40 rounded-full filter blur-[1px] transform scale-x-125" />
                )}

                {/* Billboard Standee Token (Counter-Rotated at 35deg to face user cleanly) */}
                <motion.div
                  layoutId={`token-${p.id}`}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-base shadow-2xl border-2 border-white text-white font-black cursor-pointer pointer-events-auto select-none ${
                    is3D
                      ? 'transform transition-transform hover:scale-125'
                      : ''
                  }`}
                  style={{
                    backgroundColor: cfg.color,
                    boxShadow: is3D
                      ? `0 10px 18px -2px rgba(0, 0, 0, 0.45), 0 0 0 1.5px ${cfg.color}`
                      : undefined,
                    transform: is3D
                      ? 'rotateZ(45deg) rotateX(-35deg) translateZ(18px) translateY(-12px)'
                      : undefined,
                  }}
                  title={`${p.name} (${cfg.label})`}
                >
                  <span className="filter drop-shadow-sm">{cfg.emoji}</span>
                </motion.div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
