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

        <div className="text-xs font-bold text-gray-500 bg-white/90 px-3 py-1.5 rounded-xl border border-gray-200">
          VÒNG {gameState.turnCount} • PHÒNG {gameState.roomId}
        </div>
      </div>

      {/* 3D Perspective Scene Container */}
      <div
        className={`w-full flex items-center justify-center overflow-visible transition-all duration-700 ${
          is3D ? 'pt-0 pb-4 min-h-[500px]' : 'p-2'
        }`}
        style={{
          perspective: is3D ? '1400px' : undefined,
          transformStyle: is3D ? 'preserve-3d' : undefined,
        }}
      >
        {/* Main Board Slab */}
        <div
          className={`relative w-full max-w-[700px] aspect-square bg-[#FDFDFE] rounded-3xl border-4 border-gray-200 p-2 select-none transition-all duration-700 ease-out ${
            is3D ? 'origin-center' : 'shadow-xl'
          }`}
          style={{
            transform: is3D
              ? 'rotateX(34deg) rotateZ(-45deg) scale(0.70) translateY(-10px)'
              : 'none',
            boxShadow: is3D
              ? '0 30px 50px -10px rgba(0, 0, 0, 0.4), 0 10px 0 #CBD5E1, 0 18px 0 #94A3B8, 0 24px 30px rgba(0,0,0,0.25)'
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

            {/* Sân Bến Cảng Trung Tâm (9x9) */}
            <div
              style={{
                gridRow: '2 / 11',
                gridColumn: '2 / 11',
                transformStyle: is3D ? 'preserve-3d' : undefined,
              }}
              className="bg-radial from-pink-50/40 via-white to-gray-50 rounded-2xl border border-gray-200 shadow-inner relative overflow-hidden flex items-center justify-center p-2"
            >
              {/* Unified Center Courtyard: Nằm chính giữa, hướng thẳng vào mắt người nhìn */}
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-2.5 z-10 select-none"
                style={{
                  transform: is3D
                    ? 'rotateZ(45deg) rotateX(-34deg) translateZ(12px)'
                    : undefined,
                  transformOrigin: 'center center',
                }}
              >
                {/* 1. KHAY 2 BỘ THẺ BÀI: BIẾN ĐỘNG THỊ TRƯỜNG & SỰ CỐ VẬN HÀNH */}
                <div className="w-full flex items-center justify-around px-2">
                  {/* Bộ Thẻ 1: Biến Động Thị Trường (Market Deck) */}
                  <div className="flex flex-col items-center group cursor-pointer">
                    <div className="relative w-22 sm:w-26 h-14 bg-gradient-to-tr from-pink-600 to-[#E1007A] rounded-xl shadow-[0_8px_16px_rgba(225,0,122,0.35)] border-2 border-white flex flex-col items-center justify-center text-white p-1 text-center transition transform group-hover:-translate-y-0.5">
                      <div className="absolute -top-1 -left-1 w-full h-full bg-pink-700/60 rounded-xl -z-10" />
                      <div className="absolute -top-1.5 -left-1.5 w-full h-full bg-pink-800/40 rounded-xl -z-20" />
                      <span className="text-sm leading-none">📈</span>
                      <span className="text-[8px] font-black uppercase tracking-tight leading-tight mt-0.5">
                        THỊ TRƯỜNG
                      </span>
                    </div>
                    <span className="text-[8px] font-bold text-gray-400 mt-0.5">10 THẺ BÀI</span>
                  </div>

                  {/* Bộ Thẻ 2: Sự Cố & Vận Hành (Ops Deck) */}
                  <div className="flex flex-col items-center group cursor-pointer">
                    <div className="relative w-22 sm:w-26 h-14 bg-gradient-to-tr from-amber-600 to-orange-500 rounded-xl shadow-[0_8px_16px_rgba(245,158,11,0.35)] border-2 border-white flex flex-col items-center justify-center text-white p-1 text-center transition transform group-hover:-translate-y-0.5">
                      <div className="absolute -top-1 -right-1 w-full h-full bg-amber-700/60 rounded-xl -z-10" />
                      <div className="absolute -top-1.5 -right-1.5 w-full h-full bg-amber-800/40 rounded-xl -z-20" />
                      <span className="text-sm leading-none">⚙️</span>
                      <span className="text-[8px] font-black uppercase tracking-tight leading-tight mt-0.5">
                        VẬN HÀNH
                      </span>
                    </div>
                    <span className="text-[8px] font-bold text-gray-400 mt-0.5">10 THẺ BÀI</span>
                  </div>
                </div>

                {/* 2. LOGO & TÊN GAME - ĐẶT CHÍNH GIỮA BÀN CỜ THEO HƯỚNG MẮT NHÌN */}
                <div className="text-center w-full max-w-xs my-0.5">
                  <div className="inline-block px-2.5 py-0.5 rounded-full bg-[#E1007A] text-white font-black text-[8px] sm:text-[9px] tracking-widest shadow-md shadow-pink-200">
                    OCEAN NETWORK EXPRESS
                  </div>
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mt-0.5 leading-none">
                    ONE MONOPOLY
                  </h1>
                </div>

                {/* 3. XÚC XẮC */}
                <div className="flex flex-col items-center">
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
