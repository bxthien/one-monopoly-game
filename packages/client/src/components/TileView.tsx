import React from 'react';
import { BoardTile, LOOP_GROUPS_CONFIG, Player, PropertyState } from '@one-monopoly/shared';
import { TOKEN_CONFIG } from './TokenBadge.js';
import { Anchor, ArrowUpRight, Boxes, Coins, FileText, Handshake, Leaf, RadioTower, Ship, Siren, Stamp, Waves } from 'lucide-react';

const tileSymbols: Partial<Record<BoardTile['type'], typeof Anchor>> = {
  GO: ArrowUpRight,
  CUSTOMS_HOLD: Stamp,
  FREE_ANCHOR: Anchor,
  GO_TO_HOLD: Siren,
  MARKET_CARD: FileText,
  OPS_CARD: Boxes,
  SERVICE_LINE: Ship,
  INFRA: RadioTower,
  TAX: Coins,
};

interface Props {
  tile: BoardTile;
  property?: PropertyState;
  owner?: Player;
  playersOnTile?: Player[];
  currentRent?: number;
  onClick?: () => void;
  orientation: 'bottom' | 'left' | 'top' | 'right' | 'corner';
  is3D?: boolean;
  movingPlayerIds?: Set<string>;
  myPlayerId?: string | null;
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
  movingPlayerIds,
  myPlayerId,
}) => {
  const groupConfig = tile.group ? LOOP_GROUPS_CONFIG[tile.group] : null;
  const isCorner = orientation === 'corner';
  const TileSymbol = tileSymbols[tile.type] ?? Waves;

  // Format Container & ONE Innovation badge
  const renderContainers = () => {
    if (!property || property.containerLevel <= 0) return null;

    if (property.containerLevel === 5) {
      return (
        <span className="flex items-center gap-0.5 bg-gradient-to-r from-pink-600 to-[#E1007A] text-white px-1 py-0.2 rounded text-[7px] font-black shadow-xs whitespace-nowrap">
          <span>🛳️</span>
          <span>24K</span>
          {property.hasGreenFleet && <span className="text-emerald-300">🌱</span>}
        </span>
      );
    }

    return (
      <span className="flex items-center gap-0.5">
        {Array.from({ length: property.containerLevel }).map((_, i) => (
          <span
            key={i}
            className="w-2.5 h-1.5 rounded-[1px] bg-[#E1007A] border border-white"
            title={`Lô Container ${i + 1}`}
          />
        ))}
      </span>
    );
  };

  // Hiển thị CƯỚC (khi đã mua) hoặc GIÁ (chưa mua)
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

  // Rút gọn mã ô hiển thị
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
    <button
      type="button"
      aria-haspopup="dialog"
      data-tile-type={tile.type}
      onClick={onClick}
      className={`board-tile relative w-full h-full flex flex-col justify-between border focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700 transition cursor-pointer select-none overflow-hidden ${
        isCorner ? 'p-1.5' : 'p-0.5'
      } ${isCorner ? 'chart-corner' : ''} ${property?.isMortgaged ? 'chart-mortgaged' : ''}`}
      style={{
        boxShadow: owner
          ? `inset 0 0 0 var(--tile-owner-ring, 3px) ${TOKEN_CONFIG[owner.token].color}`
          : undefined,
        transformStyle: is3D ? 'preserve-3d' : undefined,
      }}
    >
      <span className="sr-only">Xem chi tiết ô {tile.name}. </span>
      {/* KHUNG NỘI DUNG XOAY ĐỒNG BỘ: Vạch màu nằm INSIDE để luôn ở phía trên của mã cảng và song song với chữ */}
      <span
        className={`tile-content flex-1 flex flex-col items-center justify-between p-0.5 w-full h-full text-center ${is3D && (orientation === 'left' || orientation === 'right') ? 'rotate-90' : ''}`}
      >
        {/* VẠCH MÀU PHÂN BIỆT NHÓM TUYẾN - LUÔN Ở PHÍA TRÊN CỦA MÃ CẢNG */}
        {groupConfig ? (
          <span
            className="tile-group-color w-full h-2 shrink-0 mb-0.5"
            style={{ backgroundColor: groupConfig.color }}
          />
        ) : (
          <TileSymbol className="chart-tile-symbol" strokeWidth={1.75} aria-hidden="true" />
        )}

        {/* MÃ CẢNG - ĐẶT NGAY DƯỚI VẠCH MÀU, CHỮ TO RÕ NÉT */}
        <span className="tile-code-row flex items-center justify-center gap-0.5 w-full my-auto">
          <span className="tile-code text-[10px] sm:text-[11px] font-bold leading-none whitespace-nowrap">
            {getDisplayCode()}
          </span>
          {property?.hasGreenFleet && (
            <span className="tile-upgrade" title="Tàu Nhiên Liệu Xanh">
              <Leaf className="w-2.5 h-2.5 text-emerald-500 fill-emerald-500 shrink-0" />
            </span>
          )}
          {property?.slotCharter?.active && (
            <span className="tile-upgrade" title="Đang chia sẻ chỗ (Slot Charter)">
              <Handshake className="w-2.5 h-2.5 text-blue-500 shrink-0" />
            </span>
          )}
        </span>

        {/* Lô Container (nếu có) */}
        {property && property.containerLevel > 0 && (
          <span className="tile-upgrade my-0.5 shrink-0">{renderContainers()}</span>
        )}

        {/* CƯỚC HOẶC GIÁ */}
        <span className="tile-amount mt-0.5 flex items-center justify-center w-full">
          {renderPriceOrRent()}
        </span>
      </span>

      {/* Owner Badge */}
      {owner && (
        <span
          className="tile-owner-badge absolute top-0.5 right-0.5 w-3 h-3 rounded-full flex items-center justify-center text-[7px] text-white font-black shadow-xs z-10"
          style={{ backgroundColor: TOKEN_CONFIG[owner.token].color }}
          title={`Chủ sở hữu: ${owner.name}`}
        >
          ✓
        </span>
      )}
    </button>
  );
};
