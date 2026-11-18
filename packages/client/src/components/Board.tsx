import React, { useState } from 'react';
import { BOARD_TILES, GameAction, GameCard, GameState, OneMonopolyEngine, Player } from '@one-monopoly/shared';
import { TileView } from './TileView.js';
import { DiceView } from './DiceView.js';
import { ActionControls } from './ActionControls.js';
import { PropertyModal } from './PropertyModal.js';
import { CardModal } from './CardModal.js';
import { Eye } from 'lucide-react';

interface Props {
  gameState: GameState;
  myPlayerId: string | null;
  onAction: (action: GameAction) => void;
  isRolling: boolean;
  activeCard: GameCard | null;
  onCloseCard: () => void;
}

export const Board: React.FC<Props> = ({
  gameState,
  myPlayerId,
  onAction,
  isRolling,
  activeCard,
  onCloseCard,
}) => {
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);
  const [is3D, setIs3D] = useState(true);

  // Group players by current position on the board
  const getPlayersOnTile = (tileId: number): Player[] => {
    return gameState.players.filter((p) => p.position === tileId && !p.isBankrupt);
  };

  // Helper to determine orientation cho bàn cờ 32 ô (9 ô mỗi cạnh)
  const getTileOrientation = (
    id: number
  ): 'bottom' | 'left' | 'top' | 'right' | 'corner' => {
    if (id === 0 || id === 8 || id === 16 || id === 24) return 'corner';
    if (id >= 1 && id <= 7) return 'left';
    if (id >= 9 && id <= 15) return 'top';
    if (id >= 17 && id <= 23) return 'right';
    return 'bottom';
  };

  // Build grid coordinate map cho bàn cờ 32 ô (Lưới 9x9):
  // Tile 0 (SGSIN) nằm ở Row 9, Col 1 (Góc dưới-trái trong 2D, khi xoay -45 độ sẽ nằm CHÍNH DIỆN hướng vào người dùng)
  const getTileGridStyle = (id: number): React.CSSProperties => {
    // Cạnh Dưới-Trái (Row 9 down to 1, Col 1):
    // id 0 (SGSIN): Row 9, Col 1
    // id 1..7: Row 8..2, Col 1
    if (id >= 0 && id <= 7) {
      return {
        gridRow: 9 - id,
        gridColumn: 1,
      };
    }
    // Cạnh Trên-Trái (Row 1, Col 1..9 - Chứa cảng ESVLC ở id 12):
    // id 8 (CUSTOMS_HOLD): Row 1, Col 1
    // id 9..15: Row 1, Col 2..8
    // id 16 (FREE_ANCHOR): Row 1, Col 9
    if (id >= 8 && id <= 16) {
      return {
        gridRow: 1,
        gridColumn: id - 8 + 1,
      };
    }
    // Cạnh Trên-Phải (Col 9, Row 2..9):
    // id 17..23: Row 2..8, Col 9
    // id 24 (GO_TO_HOLD): Row 9, Col 9
    if (id >= 17 && id <= 24) {
      return {
        gridRow: id - 16 + 1,
        gridColumn: 9,
      };
    }
    // Cạnh Dưới-Phải (Row 9, Col 8 down to 2 - Chứa cảng HKHKG ở id 30):
    // id 25..31: Row 9, Col 8..2
    return {
      gridRow: 9,
      gridColumn: 9 - (id - 24),
    };
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[860px]">
      {/* Top View Mode Switcher */}
      <div className="flex items-center justify-between w-full mb-2 px-2 z-30">
        <div className="flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-sm border border-gray-200">
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
            <Eye className="w-3.5 h-3.5" /> Góc Nhìn:
          </span>
          <button
            onClick={() => setIs3D(true)}
            className={`px-3 py-1 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              is3D
                ? 'bg-[#E1007A] text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <span>🎲 3D Isometric (Nâng cao)</span>
          </button>
          <button
            onClick={() => setIs3D(false)}
            className={`px-3 py-1 rounded-xl text-xs font-black transition flex items-center gap-1.5 cursor-pointer ${
              !is3D
                ? 'bg-gray-900 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <span>📐 2D Phẳng</span>
          </button>
        </div>

        <div className="text-xs font-bold text-gray-500 bg-white/90 px-3 py-1.5 rounded-xl border border-gray-200">
          VÒNG {gameState.turnCount} • PHÒNG {gameState.roomId}
        </div>
      </div>

      {/* 3D Perspective Scene Container */}
      <div
        className={`w-full flex items-center justify-center overflow-visible transition-all duration-700 ${
          is3D ? 'pt-0 pb-1 min-h-[460px]' : 'p-2'
        }`}
        style={{
          perspective: is3D ? '1400px' : undefined,
          transformStyle: is3D ? 'preserve-3d' : undefined,
        }}
      >
        {/* Main Board Slab - Góc nghiêng 3D isometric chuẩn Business Tour */}
        <div
          className={`relative w-full max-w-[680px] aspect-square bg-[#FDFDFE] rounded-3xl border-4 border-gray-200 p-2 select-none transition-all duration-700 ease-out ${
            is3D ? 'origin-center' : 'shadow-xl'
          }`}
          style={{
            transform: is3D
              ? 'rotateX(46deg) rotateZ(-45deg) scale(0.74) translateY(-20px)'
              : 'none',
            boxShadow: is3D
              ? '0 30px 55px -10px rgba(0, 0, 0, 0.42), 0 10px 0 #CBD5E1, 0 18px 0 #94A3B8, 0 24px 30px rgba(0,0,0,0.28)'
              : undefined,
            transformStyle: is3D ? 'preserve-3d' : undefined,
          }}
        >
          {/* Lưới 9x9: 4 ô góc hình vuông (1.35fr x 1.35fr), các ô cạnh hình chữ nhật (1fr x 1.35fr) */}
          <div
            className="w-full h-full gap-1 grid"
            style={{
              gridTemplateColumns: '1.35fr repeat(7, 1fr) 1.35fr',
              gridTemplateRows: '1.35fr repeat(7, 1fr) 1.35fr',
              transformStyle: is3D ? 'preserve-3d' : undefined,
            }}
          >
            {/* 32 Ô Bàn Cờ */}
            {BOARD_TILES.map((tile) => {
              const prop = gameState.properties[tile.id];
              const owner = prop?.ownerId
                ? gameState.players.find((p) => p.id === prop.ownerId)
                : undefined;
              const currentRent = OneMonopolyEngine.calculateRent(gameState, tile.id, gameState.dice);

              return (
                <div
                  key={tile.id}
                  style={getTileGridStyle(tile.id)}
                  className="w-full h-full flex"
                >
                  <TileView
                    tile={tile}
                    property={prop}
                    owner={owner}
                    currentRent={currentRent}
                    playersOnTile={getPlayersOnTile(tile.id)}
                    orientation={getTileOrientation(tile.id)}
                    is3D={is3D}
                    onClick={() => setSelectedTileId(tile.id)}
                  />
                </div>
              );
            })}

            {/* Sân Bến Cảng Trung Tâm (7x7) */}
            <div
              style={{
                gridRow: '2 / 9',
                gridColumn: '2 / 9',
                transformStyle: is3D ? 'preserve-3d' : undefined,
              }}
              className="bg-radial from-pink-50/50 via-white to-gray-50 rounded-2xl border-2 border-gray-200/80 shadow-inner relative overflow-hidden flex items-center justify-center p-4"
            >
              {/* Unified Center Courtyard: Nằm chính giữa, hướng thẳng vào mắt người nhìn */}
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-4 z-10 select-none"
                style={{
                  transform: is3D
                    ? 'rotateZ(45deg) rotateX(-46deg) translateZ(14px)'
                    : undefined,
                  transformOrigin: 'center center',
                }}
              >
                {/* 1. LOGO & TÊN GAME CHÍNH GIỮA BÀN CỜ */}
                <div className="text-center w-full max-w-xs">
                  <div className="inline-block px-3.5 py-1 rounded-full bg-[#E1007A] text-white font-black text-[10px] tracking-widest shadow-md shadow-pink-200">
                    OCEAN NETWORK EXPRESS
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-1 leading-none">
                    ONE MONOPOLY
                  </h1>
                  <span className="text-[9px] font-bold text-gray-400 tracking-widest uppercase mt-1 block">
                    GLOBAL LOGISTICS HUB
                  </span>
                </div>

                {/* 2. KHAY XÚC XẮC */}
                <div className="flex flex-col items-center my-1">
                  <DiceView dice={gameState.dice} isRolling={isRolling} hasRolled={gameState.hasRolled} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DOCKED HUD CONTROLS: Đặt tách biệt ở tầng 2D phía dưới để không bao giờ đè lấn lên các ô cờ */}
      <div className="w-full max-w-lg mt-1 px-2 z-30">
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-3xl shadow-xl border-2 border-pink-100">
          <ActionControls
            gameState={gameState}
            myPlayerId={myPlayerId}
            onAction={onAction}
            isRolling={isRolling}
          />
        </div>
      </div>

      {/* Property Details Modal */}
      <PropertyModal
        tileId={selectedTileId}
        gameState={gameState}
        myPlayerId={myPlayerId}
        onClose={() => setSelectedTileId(null)}
        onAction={(action) => {
          onAction(action);
          setSelectedTileId(null);
        }}
      />

      {/* Card Modal */}
      <CardModal card={activeCard} onClose={onCloseCard} />
    </div>
  );
};
