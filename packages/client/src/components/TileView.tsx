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
}

export const TileView: React.FC<Props> = ({
  tile,
  property,
  owner,
  playersOnTile,
  onClick,
  orientation,
}) => {
  const groupConfig = tile.group ? LOOP_GROUPS_CONFIG[tile.group] : null;
  const isCorner = orientation === 'corner';

  // Format containers & ONE Innovation display
  const renderContainers = () => {
    if (!property || property.containerLevel <= 0) return null;
    if (property.containerLevel === 5) {
      return (
        <div className="flex items-center gap-0.5 bg-gradient-to-r from-pink-600 to-[#E1007A] text-white px-1 py-0.5 rounded text-[8px] font-black shadow-sm">
          <span>🛳️</span>
          <span>ONE INNOVATION</span>
          {property.hasGreenFleet && (
            <span className="text-emerald-300" title="Green Fleet Ready">🌱</span>
          )}
        </div>
      );
    }
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: property.containerLevel }).map((_, i) => (
          <span
            key={i}
            className="w-2.5 h-2 rounded-[2px] bg-[#E1007A] border border-white shadow-xs"
            title={`Lô Container Magenta ${i + 1}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div
      onClick={onClick}
      className={`relative flex flex-col justify-between border border-gray-200 bg-white hover:bg-pink-50/20 transition cursor-pointer select-none overflow-hidden ${
        isCorner ? 'p-1.5' : 'p-1'
      } ${property?.isMortgaged ? 'opacity-60 bg-gray-100' : ''}`}
      style={{
        boxShadow: owner ? `inset 0 0 0 2px ${TOKEN_CONFIG[owner.token].color}` : undefined,
      }}
    >
      {/* Group Color Bar for Ports */}
      {groupConfig && (
        <div
          className={`w-full font-black text-white text-[9px] text-center tracking-tighter truncate ${
            orientation === 'bottom'
              ? 'h-3.5 order-first mb-0.5 rounded-t-sm'
              : orientation === 'top'
              ? 'h-3.5 order-last mt-0.5 rounded-b-sm'
              : 'h-3 mb-0.5'
          }`}
          style={{ backgroundColor: groupConfig.color }}
        >
          {groupConfig.name.split(' ')[0]}
        </div>
      )}

      {/* Tile Header & Code */}
      <div className="text-center w-full">
        <div className="text-[10px] font-black text-gray-800 leading-none truncate flex items-center justify-center gap-1">
          <span>{tile.code}</span>
          {property?.hasGreenFleet && (
            <span title="Tàu Nhiên Liệu Xanh">
              <Leaf className="w-2.5 h-2.5 text-emerald-500 fill-emerald-500" />
            </span>
          )}
          {property?.slotCharter?.active && (
            <span title="Đang chia sẻ chỗ (Slot Charter)">
              <Handshake className="w-2.5 h-2.5 text-blue-500" />
            </span>
          )}
        </div>
        <div className="text-[8px] font-medium text-gray-500 line-clamp-1 leading-tight mt-0.5">
          {tile.name}
        </div>
      </div>

      {/* Center status: Containers or Special Icon */}
      <div className="flex items-center justify-center my-0.5">
        {renderContainers()}
        {tile.type === 'GO' && (
          <div className="text-center">
            <span className="text-sm font-black text-[#E1007A] block leading-none">GO</span>
            <span className="text-[8px] font-bold text-gray-600">+$200M</span>
          </div>
        )}
        {tile.type === 'CUSTOMS_HOLD' && (
          <div className="text-center text-amber-600 font-extrabold text-[9px]">
            KIỂM HÓA
          </div>
        )}
        {tile.type === 'FREE_ANCHOR' && (
          <div className="text-center text-teal-600 font-extrabold text-[9px]">
            NEO ĐẬU
          </div>
        )}
        {tile.type === 'GO_TO_HOLD' && (
          <div className="text-center text-red-600 font-extrabold text-[9px]">
            VÀO HOLD
          </div>
        )}
        {tile.type === 'MARKET_CARD' && (
          <span className="text-xs">📈</span>
        )}
        {tile.type === 'OPS_CARD' && (
          <span className="text-xs">⚙️</span>
        )}
        {tile.type === 'TAX' && (
          <span className="text-[9px] font-bold text-red-600">-${tile.taxAmount}M</span>
        )}
      </div>

      {/* Mortgaged Warning */}
      {property?.isMortgaged && (
        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-[1px] flex items-center justify-center z-10">
          <span className="text-[9px] font-black text-white bg-red-600 px-1 py-0.5 rounded shadow">
            CẦM CỐ
          </span>
        </div>
      )}

      {/* Bottom Price or Owner Info */}
      <div className="w-full flex items-center justify-between text-[8px] font-bold text-gray-600 border-t border-gray-100 pt-0.5">
        {tile.price ? (
          <span>${tile.price}M</span>
        ) : (
          <span />
        )}
        {owner && (
          <span
            className="w-2.5 h-2.5 rounded-full flex items-center justify-center text-[7px] text-white font-black"
            style={{ backgroundColor: TOKEN_CONFIG[owner.token].color }}
            title={`Chủ sở hữu: ${owner.name}`}
          >
            ✓
          </span>
        )}
      </div>

      {/* Floating Vessel Tokens standing on this tile */}
      {playersOnTile.length > 0 && (
        <div className="absolute inset-0 flex items-center justify-center gap-1 z-20 pointer-events-none p-1 flex-wrap">
          {playersOnTile.map((p) => {
            const cfg = TOKEN_CONFIG[p.token];
            return (
              <motion.div
                key={p.id}
                layoutId={`token-${p.id}`}
                transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs shadow-lg border border-white text-white font-extrabold"
                style={{ backgroundColor: cfg.color }}
                title={`${p.name} (${cfg.label})`}
              >
                <span>{cfg.emoji}</span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
