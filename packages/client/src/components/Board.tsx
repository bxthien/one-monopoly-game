import React, { useState } from 'react';
import { BOARD_TILES, GameAction, GameCard, GameState, Player } from '@one-monopoly/shared';
import { TileView } from './TileView.js';
import { DiceView } from './DiceView.js';
import { ActionControls } from './ActionControls.js';
import { PropertyModal } from './PropertyModal.js';
import { CardModal } from './CardModal.js';

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
    <div className="relative w-full max-w-[850px] aspect-square bg-[#FDFDFE] rounded-3xl shadow-2xl border-4 border-gray-200 p-2 overflow-hidden select-none">
      {/* 11x11 Grid Container */}
      <div className="grid grid-cols-11 grid-rows-11 w-full h-full gap-1">
        {/* Render 40 Tiles around perimeter */}
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
                onClick={() => setSelectedTileId(tile.id)}
              />
            </div>
          );
        })}

        {/* Center Board Area (9x9) */}
        <div
          style={{ gridRow: '2 / 11', gridColumn: '2 / 11' }}
          className="bg-radial from-pink-50/40 via-white to-gray-50 flex flex-col items-center justify-between p-6 rounded-2xl border border-gray-100/60 shadow-inner"
        >
          {/* Top Center Logo */}
          <div className="text-center">
            <div className="inline-block px-4 py-1.5 rounded-full bg-[#E1007A] text-white font-black text-xs tracking-widest shadow-md shadow-pink-200">
              OCEAN NETWORK EXPRESS
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tighter mt-1">
              ONE MONOPOLY
            </h1>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
              VÒNG {gameState.turnCount} • PHÒNG {gameState.roomId}
            </p>
          </div>

          {/* Middle Center: Dice Roll Display */}
          <div className="my-auto flex flex-col items-center gap-3">
            <DiceView dice={gameState.dice} isRolling={isRolling} />
          </div>

          {/* Bottom Center: Interactive Action Controls */}
          <div className="w-full max-w-md">
            <ActionControls
              gameState={gameState}
              myPlayerId={myPlayerId}
              onAction={onAction}
              isRolling={isRolling}
            />
          </div>
        </div>
      </div>

      {/* Detail Property Modal */}
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

      {/* Card Drawn Modal */}
      <CardModal card={activeCard} onClose={onCloseCard} />
    </div>
  );
};
