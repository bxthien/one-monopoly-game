import React, { useState } from 'react';
import { BOARD_TILES, GameAction, GameCard, GameState, Player } from '@one-monopoly/shared';
import { TileView } from './TileView.js';
import { DiceView } from './DiceView.js';
import { ActionControls } from './ActionControls.js';
import { PropertyModal } from './PropertyModal.js';
import { CardModal } from './CardModal.js';
import { Eye, Layers, Compass } from 'lucide-react';

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
    <div className="flex flex-col items-center w-full">
      {/* View Mode Toggle Switch */}
      <div className="flex items-center gap-2 mb-3 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-sm border border-gray-200 z-30">
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
          <span>🎲 3D Isometric</span>
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

      {/* 3D Perspective Scene Container */}
      <div
        className={`w-full flex items-center justify-center overflow-visible ${
          is3D ? 'py-0 min-h-[640px]' : 'p-2 sm:p-4'
        }`}
        style={{
          perspective: is3D ? '1400px' : undefined,
          transformStyle: is3D ? 'preserve-3d' : undefined,
        }}
      >
        {/* Main Board Slab */}
        <div
          className={`relative w-full max-w-[760px] aspect-square bg-[#FDFDFE] rounded-3xl border-4 border-gray-200 p-2 select-none transition-all duration-700 ease-out ${
            is3D ? 'origin-center' : 'shadow-2xl'
          }`}
          style={{
            transform: is3D
              ? 'rotateX(52deg) rotateZ(-45deg) scale(0.68) translateY(-70px)'
              : 'none',
            boxShadow: is3D
              ? '0 30px 60px -15px rgba(0, 0, 0, 0.45), 0 12px 0 #CBD5E1, 0 20px 0 #94A3B8, 0 28px 35px rgba(0,0,0,0.3)'
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

            {/* Center Area (9x9) with Courtyard & 3D Deck Boxes */}
            <div
              style={{
                gridRow: '2 / 11',
                gridColumn: '2 / 11',
                transformStyle: is3D ? 'preserve-3d' : undefined,
              }}
              className="bg-radial from-pink-50/50 via-white to-gray-50 flex flex-col items-center justify-between p-4 sm:p-6 rounded-2xl border border-gray-200/80 shadow-inner relative overflow-hidden"
            >
              {/* Top Courtyard Branding */}
              <div
                className="text-center z-10"
                style={{
                  transform: is3D
                    ? 'rotateZ(45deg) rotateX(-52deg) translateZ(8px)'
                    : undefined,
                }}
              >
                <div className="inline-block px-3.5 py-1 rounded-full bg-[#E1007A] text-white font-black text-[10px] tracking-widest shadow-md shadow-pink-200">
                  OCEAN NETWORK EXPRESS
                </div>
                <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tighter mt-1">
                  ONE MONOPOLY
                </h1>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  VÒNG {gameState.turnCount} • PHÒNG {gameState.roomId}
                </p>
              </div>

              {/* 3D Decorative Deck Boxes on the Field (Like Reference Image!) */}
              {is3D && (
                <div className="absolute inset-0 pointer-events-none flex items-center justify-between px-10">
                  {/* Market Chest Box (Top Left) */}
                  <div className="w-16 h-12 bg-gradient-to-tr from-pink-600 to-[#E1007A] rounded-xl shadow-[0_10px_15px_rgba(225,0,122,0.35)] border-2 border-white flex flex-col items-center justify-center text-white transform -rotate-12 translate-y-4">
                    <span className="text-xs">📈</span>
                    <span className="text-[8px] font-black uppercase tracking-tighter">THỊ TRƯỜNG</span>
                  </div>

                  {/* Ops Tool Chest (Bottom Right) */}
                  <div className="w-16 h-12 bg-gradient-to-tr from-amber-600 to-orange-500 rounded-xl shadow-[0_10px_15px_rgba(245,158,11,0.35)] border-2 border-white flex flex-col items-center justify-center text-white transform rotate-12 -translate-y-4">
                    <span className="text-xs">⚙️</span>
                    <span className="text-[8px] font-black uppercase tracking-tighter">VẬN HÀNH</span>
                  </div>
                </div>
              )}

              {/* Center Courtyard: Interactive Dice Display */}
              <div
                className="my-auto flex flex-col items-center gap-2 z-10"
                style={{
                  transform: is3D
                    ? 'rotateZ(45deg) rotateX(-52deg) translateZ(14px)'
                    : undefined,
                }}
              >
                <DiceView dice={gameState.dice} isRolling={isRolling} hasRolled={gameState.hasRolled} />
              </div>

              {/* Bottom Courtyard: Interactive Action Controls */}
              <div
                className="w-full max-w-md z-20"
                style={{
                  transform: is3D
                    ? 'rotateZ(45deg) rotateX(-52deg) translateZ(10px)'
                    : undefined,
                }}
              >
                <ActionControls
                  gameState={gameState}
                  myPlayerId={myPlayerId}
                  onAction={onAction}
                  isRolling={isRolling}
                />
              </div>
            </div>
          </div>
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
