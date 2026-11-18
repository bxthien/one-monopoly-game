import React, { useState } from 'react';
import { BOARD_TILES, GameAction, GameCard, GameState, Player } from '@one-monopoly/shared';
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
  const [is3D, setIs3D] = useState(true); // Default to 3D Isometric View

  // Group players by current position on the board
  const getPlayersOnTile = (tileId: number): Player[] => {
    return gameState.players.filter((p) => p.position === tileId && !p.isBankrupt);
  };

  // Helper to determine orientation
  const getTileOrientation = (
    id: number
  ): 'bottom' | 'left' | 'top' | 'right' | 'corner' => {
    if (id === 0 || id === 10 || id === 20 || id === 30) return 'corner';
    if (id > 0 && id < 10) return 'bottom';
    if (id > 10 && id < 20) return 'left';
    if (id > 20 && id < 30) return 'top';
    return 'right';
  };

  // Build grid coordinate map for 40 tiles
  const getTileGridStyle = (id: number): React.CSSProperties => {
    // Bottom row (Row 11): 0 is col 11, 10 is col 1
    if (id >= 0 && id <= 10) {
      return {
        gridRow: 11,
        gridColumn: 11 - id,
      };
    }
    // Left col (Col 1): 11 is row 10, 20 is row 1
    if (id >= 11 && id <= 20) {
      return {
        gridRow: 11 - (id - 10),
        gridColumn: 1,
      };
    }
    // Top row (Row 1): 20 is col 1, 30 is col 11
    if (id >= 21 && id <= 30) {
      return {
        gridRow: 1,
        gridColumn: id - 20 + 1,
      };
    }
    // Right col (Col 11): 31 is row 2, 39 is row 10
    return {
      gridRow: id - 30 + 1,
      gridColumn: 11,
    };
  };

  return (
    <div className="flex flex-col items-center w-full max-w-[840px]">
      {/* View Mode Toggle Switch */}
      <div className="flex items-center justify-between w-full mb-3 px-2 z-30">
        <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-sm border border-gray-200">
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

        <div className="text-xs font-bold text-gray-500 bg-white/80 px-3 py-1.5 rounded-xl border border-gray-200">
          VÒNG {gameState.turnCount} • PHÒNG {gameState.roomId}
        </div>
      </div>

      {/* 3D Perspective Scene Container */}
      <div
        className={`w-full flex items-center justify-center overflow-visible transition-all duration-700 ${
          is3D ? 'pt-0 pb-2 min-h-[480px]' : 'p-2'
        }`}
        style={{
          perspective: is3D ? '1400px' : undefined,
          transformStyle: is3D ? 'preserve-3d' : undefined,
        }}
      >
        {/* Main Board Slab - Góc nghiêng 34 độ chuẩn Netmarble Let's Get Rich */}
        <div
          className={`relative w-full max-w-[680px] aspect-square bg-[#FDFDFE] rounded-3xl border-4 border-gray-200 p-2 select-none transition-all duration-700 ease-out ${
            is3D ? 'origin-center' : 'shadow-xl'
          }`}
          style={{
            transform: is3D
              ? 'rotateX(34deg) rotateZ(-45deg) scale(0.68) translateY(-10px)'
              : 'none',
            boxShadow: is3D
              ? '0 25px 45px -10px rgba(0, 0, 0, 0.35), 0 10px 0 #CBD5E1, 0 18px 0 #94A3B8, 0 24px 30px rgba(0,0,0,0.25)'
              : undefined,
            transformStyle: is3D ? 'preserve-3d' : undefined,
          }}
        >
          {/* 11x11 Grid Perimeter */}
          <div
            className="grid grid-cols-11 grid-rows-11 w-full h-full gap-1"
            style={{ transformStyle: is3D ? 'preserve-3d' : undefined }}
          >
            {/* 40 Tiles */}
            {BOARD_TILES.map((tile) => {
              const prop = gameState.properties[tile.id];
              const owner = prop?.ownerId
                ? gameState.players.find((p) => p.id === prop.ownerId)
                : undefined;

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
                    playersOnTile={getPlayersOnTile(tile.id)}
                    orientation={getTileOrientation(tile.id)}
                    is3D={is3D}
                    onClick={() => setSelectedTileId(tile.id)}
                  />
                </div>
              );
            })}

            {/* Center Area (9x9) - Sân Bến Cảng Trung Tâm */}
            <div
              style={{
                gridRow: '2 / 11',
                gridColumn: '2 / 11',
                transformStyle: is3D ? 'preserve-3d' : undefined,
              }}
              className="bg-radial from-pink-50/50 via-white to-gray-50 flex flex-col items-center justify-between p-4 sm:p-6 rounded-2xl border border-gray-200 shadow-inner relative overflow-hidden"
            >
              {/* Center Courtyard: Interactive Dice Display */}
              <div className="my-auto flex flex-col items-center gap-2 z-20">
                <DiceView dice={gameState.dice} isRolling={isRolling} hasRolled={gameState.hasRolled} />
              </div>

              {/* Bottom Courtyard Logo */}
              <div className="text-center z-10 my-2">
                <div className="inline-block px-3 py-0.5 rounded-full bg-[#E1007A] text-white font-black text-[9px] tracking-widest shadow-sm">
                  OCEAN NETWORK EXPRESS
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tighter mt-0.5">
                  ONE MONOPOLY
                </h1>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DOCKED HUD CONTROLS: Đặt tách biệt ở tầng giao diện 2D phẳng phía dưới */}
      {/* Giống chuẩn Netmarble Let's Get Rich: Nút bấm to rõ, không bị lệch góc, không đè lấn lên các ô cờ */}
      <div className="w-full max-w-lg mt-2 px-2 z-30">
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
