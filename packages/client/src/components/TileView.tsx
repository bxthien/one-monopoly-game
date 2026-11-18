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
  currentRent?: number;
  onClick?: () => void;
  orientation: 'bottom' | 'left' | 'top' | 'right' | 'corner';
  is3D?: boolean;
}

export const TileView: React.FC<Props> = ({
  tile,
  property,
  owner,
  playersOnTile,
  currentRent,
  onClick,
  orientation,
  is3D = false,
}) => {
  const groupConfig = tile.group ? LOOP_GROUPS_CONFIG[tile.group] : null;
  const isCorner = orientation === 'corner';

  // Hướng chữ theo trọng tâm bàn cờ:
  // Đứng từ trọng tâm (tâm bàn cờ) nhìn ra 4 cạnh:
  // - Top: nhìn lên -> 0deg
  // - Bottom: nhìn xuống -> rotate-180 (chân chữ hướng vào tâm)
  // - Left: nhìn sang trái -> -rotate-90 (chân chữ hướng vào tâm)
  // - Right: nhìn sang phải -> rotate-90 (chân chữ hướng vào tâm)
  const getContentRotationClass = () => {
    if (isCorner) return '';
    switch (orientation) {
      case 'bottom':
        return 'rotate-180';
      case 'left':
        return '-rotate-90';
      case 'right':
        return 'rotate-90';
      case 'top':
      default:
        return '';
    }
  };

  // Format Container & ONE Innovation badge gọn gàng
  const renderContainers = () => {
    if (!property || property.containerLevel <= 0) return null;

    if (property.containerLevel === 5) {
      return (
        <div className="flex items-center gap-0.5 bg-gradient-to-r from-pink-600 to-[#E1007A] text-white px-1 py-0.2 rounded text-[7px] font-black shadow-xs whitespace-nowrap">
          <span>🛳️</span>
          <span>24K</span>
          {property.hasGreenFleet && <span className="text-emerald-300">🌱</span>}
        </div>
      );
    }

    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: property.containerLevel }).map((_, i) => (
          <div
            key={i}
            className="w-2.5 h-1.5 rounded-[1px] bg-[#E1007A] border border-white"
            title={`Lô Container ${i + 1}`}
          />
        ))}
      </div>
    );
  };

  // Hiển thị CƯỚC (khi đã mua) hoặc GIÁ (chưa mua) không bao giờ bị cắt chữ
  const renderPriceOrRent = () => {
    if (tile.type === 'GO') {
      return <span className="text-emerald-600 font-black text-[9px] sm:text-[10px] leading-none whitespace-nowrap">+$200M</span>;
    }
    if (tile.type === 'TAX') {
      return <span className="text-red-600 font-black text-[9px] sm:text-[10px] leading-none whitespace-nowrap">-${tile.taxAmount}M</span>;
    }
    if (tile.type === 'CUSTOMS_HOLD') {
      return <span className="text-amber-700 font-black text-[8px] sm:text-[9px] leading-none whitespace-nowrap">KIỂM HÓA</span>;
    }
    if (tile.type === 'FREE_ANCHOR') {
      return <span className="text-teal-700 font-black text-[8px] sm:text-[9px] leading-none whitespace-nowrap">NEO ĐẬU</span>;
    }
    if (tile.type === 'GO_TO_HOLD') {
      return <span className="text-red-700 font-black text-[8px] sm:text-[9px] leading-none whitespace-nowrap">VÀO HOLD</span>;
    }
    if (tile.type === 'MARKET_CARD') {
      return <span className="text-pink-600 font-black text-[8px] sm:text-[9px] leading-none whitespace-nowrap">THỊ TRƯỜNG</span>;
    }
    if (tile.type === 'OPS_CARD') {
      return <span className="text-amber-600 font-black text-[8px] sm:text-[9px] leading-none whitespace-nowrap">VẬN HÀNH</span>;
    }

    if (owner) {
      if (property?.isMortgaged) {
        return <span className="text-gray-400 font-black text-[8px] sm:text-[9px] leading-none whitespace-nowrap">CẦM CỐ</span>;
      }
      return (
        <span className="font-black text-[9px] sm:text-[10px] text-[#E1007A] leading-none whitespace-nowrap">
          ${currentRent}M
        </span>
      );
    }

    return (
      <span className="font-black text-[9px] sm:text-[10px] text-gray-700 leading-none whitespace-nowrap">
        ${tile.price}M
      </span>
    );
  };

  // Rút gọn mã ô để không bao giờ bị cắt chữ
  const getDisplayCode = () => {
    if (tile.code === 'CUSTOMS_HOLD') return 'HOLD';
    if (tile.code === 'FREE_ANCHOR') return 'ANCHOR';
    if (tile.code === 'GO_TO_HOLD') return 'TO HOLD';
    if (tile.code.startsWith('MARKET')) return 'MKT';
    if (tile.code.startsWith('OPS')) return 'OPS';
    if (tile.code === 'CARBON-TAX') return 'CARBON';
    if (tile.code === 'ONE-QUOTE') return 'QUOTE';
    if (tile.code === 'ECO-CALC') return 'ECO';
    return tile.code;
  };

  return (
    <div
      onClick={onClick}
      className={`relative w-full h-full flex flex-col justify-between border border-gray-200 bg-white hover:bg-pink-50/40 transition cursor-pointer select-none overflow-hidden ${
        isCorner ? 'p-1' : 'p-0.5'
      } ${property?.isMortgaged ? 'opacity-65 bg-gray-50' : ''}`}
      style={{
        boxShadow: owner
          ? `inset 0 0 0 2.5px ${TOKEN_CONFIG[owner.token].color}`
          : undefined,
        transformStyle: is3D ? 'preserve-3d' : undefined,
      }}
    >
      {/* Vạch màu nhóm tuyến */}
      {groupConfig && (
        <div
          className={`w-full font-black text-white text-[7px] text-center tracking-tight truncate shrink-0 ${
            orientation === 'bottom'
              ? 'h-2.5 order-first rounded-t-xs'
              : orientation === 'top'
              ? 'h-2.5 order-last rounded-b-xs'
              : 'h-2'
          }`}
          style={{ backgroundColor: groupConfig.color }}
        />
      )}

      {/* Nội dung xoay về phía trọng tâm bàn cờ */}
      <div
        className={`flex-1 flex flex-col items-center justify-center p-0.5 w-full text-center ${getContentRotationClass()}`}
      >
        {/* MÃ CẢNG - TO, ĐẬM, KHÔNG CẮT CHỮ */}
        <div className="flex items-center justify-center gap-0.5 w-full">
          <span className="text-[10px] sm:text-[11px] font-black text-gray-950 tracking-tighter leading-tight whitespace-nowrap">
            {getDisplayCode()}
          </span>
          {property?.hasGreenFleet && (
            <span title="Tàu Nhiên Liệu Xanh">
              <Leaf className="w-2 h-2 text-emerald-500 fill-emerald-500 shrink-0" />
            </span>
          )}
          {property?.slotCharter?.active && (
            <span title="Đang chia sẻ chỗ (Slot Charter)">
              <Handshake className="w-2 h-2 text-blue-500 shrink-0" />
            </span>
          )}
        </div>

        {/* Lô Container (nếu có) */}
        {property && property.containerLevel > 0 && (
          <div className="my-0.5 shrink-0">{renderContainers()}</div>
        )}

        {/* GIÁ / CƯỚC - GỌN GÀNG, ĐẬM NÉT */}
        <div className="mt-0.5 flex items-center justify-center w-full">
          {renderPriceOrRent()}
        </div>
      </div>

      {/* Owner Badge */}
      {owner && (
        <div
          className="absolute top-0.5 right-0.5 w-2.5 h-2.5 rounded-full flex items-center justify-center text-[6px] text-white font-black shadow-xs z-10"
          style={{ backgroundColor: TOKEN_CONFIG[owner.token].color }}
          title={`Chủ sở hữu: ${owner.name}`}
        >
          ✓
        </div>
      )}

      {/* Billboard Pawns (Quân cờ đặt ở góc ô, không che khuất chữ mã cảng) */}
      {playersOnTile.length > 0 && (
        <div
          className="absolute inset-0 flex items-end justify-center pb-0.5 gap-0.5 z-30 pointer-events-none"
          style={{ transformStyle: is3D ? 'preserve-3d' : undefined }}
        >
          {playersOnTile.map((p) => {
            const cfg = TOKEN_CONFIG[p.token];

            return (
              <div key={p.id} className="relative flex flex-col items-center justify-center">
                {is3D && (
                  <div className="absolute -bottom-0.5 w-4 h-1.5 bg-black/40 rounded-full filter blur-[0.5px] transform scale-x-125" />
                )}

                <motion.div
                  layoutId={`token-${p.id}`}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className="w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs shadow-xl border border-white text-white font-black cursor-pointer pointer-events-auto select-none"
                  style={{
                    backgroundColor: cfg.color,
                    boxShadow: is3D
                      ? `0 6px 12px -2px rgba(0, 0, 0, 0.45), 0 0 0 1px ${cfg.color}`
                      : undefined,
                    transform: is3D
                      ? 'rotateZ(45deg) rotateX(-34deg) translateZ(16px) translateY(-8px)'
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
