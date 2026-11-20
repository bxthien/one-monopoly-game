import React, { useState, useLayoutEffect } from 'react';
import { BOARD_TILES, GameAction, GameCard, GameState, OneMonopolyEngine, Player } from '@one-monopoly/shared';
import { TileView } from './TileView.js';
import { DiceView } from './DiceView.js';
import { PropertyModal } from './PropertyModal.js';
import { CardModal } from './CardModal.js';
import { Pawn3D } from './Pawn3D.js';
import { BoardSky } from './BoardSky.js';
import type { BoardLighting } from './boardLighting.js';
import { forwardHeading, type TravelFrame } from './boardTravel.js';
import { useBoardPlayback, type RentReceipt } from './useBoardPlayback.js';
import { useIdleMotion } from '../hooks/useIdleMotion.js';
import type { SubscribeBoard } from '../hooks/useSocket.js';
import './chart-board.css';
import './tile-rent.css';

interface Props {
  gameState: GameState;
  sky: BoardLighting;
  subscribeBoard: SubscribeBoard;
  myPlayerId: string | null;
  onAction: (action: GameAction) => void;
  isRolling: boolean;
  activeCard: GameCard | null;
  onCloseCard: () => void;
  is3D?: boolean;
  onPawnMovingChange?: (isMoving: boolean) => void;
  onRentReceiptsChange?: (receipts: Record<number, RentReceipt>) => void;
}

// Bảng toạ độ phần trăm chính xác theo tâm từng ô cờ (0..31) trên lưới 9x9 (1.35fr + 7*1fr + 1.35fr)
const TILE_CENTER_PERCENT: Record<number, { x: number; y: number }> = {
  0: { x: 6.96, y: 93.04 }, // Cảng Singapore SGSIN (Xuất phát)
  1: { x: 6.96, y: 80.93 },
  2: { x: 6.96, y: 70.62 },
  3: { x: 6.96, y: 60.31 },
  4: { x: 6.96, y: 50.00 },
  5: { x: 6.96, y: 39.69 },
  6: { x: 6.96, y: 29.38 },
  7: { x: 6.96, y: 19.07 },
  8: { x: 6.96, y: 6.96 }, // Giữ Hàng Hải Quan CUSTOMS_HOLD
  9: { x: 19.07, y: 6.96 },
  10: { x: 29.38, y: 6.96 },
  11: { x: 39.69, y: 6.96 },
  12: { x: 50.00, y: 6.96 },
  13: { x: 60.31, y: 6.96 },
  14: { x: 70.62, y: 6.96 },
  15: { x: 80.93, y: 6.96 },
  16: { x: 93.04, y: 6.96 }, // Cảng Neo Đậu FREE_ANCHOR
  17: { x: 93.04, y: 19.07 },
  18: { x: 93.04, y: 29.38 },
  19: { x: 93.04, y: 39.69 },
  20: { x: 93.04, y: 50.00 },
  21: { x: 93.04, y: 60.31 },
  22: { x: 93.04, y: 70.62 },
  23: { x: 93.04, y: 80.93 },
  24: { x: 93.04, y: 93.04 }, // Vào Khu Hải Quan GO_TO_HOLD
  25: { x: 80.93, y: 93.04 },
  26: { x: 70.62, y: 93.04 },
  27: { x: 60.31, y: 93.04 },
  28: { x: 50.00, y: 93.04 },
  29: { x: 39.69, y: 93.04 },
  30: { x: 29.38, y: 93.04 },
  31: { x: 19.07, y: 93.04 },
};

// Original schematic of the Pacific basin. The open ocean is the dice landing area.
const PacificChart = React.memo(function PacificChart() {
  return (
    <svg className="pacific-chart" viewBox="0 0 480 480" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="chart-graticule" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M40 0H0V40" fill="none" stroke="#75a7a0" strokeWidth="1" />
          <path d="M18 20h4m-2-2v4" fill="none" stroke="#8eb3a8" strokeWidth=".8" />
        </pattern>
        <pattern id="chart-land" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill="#ece7ca" />
          <path d="m-1 1 2-2m-1 7 6-6m-1 7 2-2" stroke="#d4d2b6" strokeWidth=".9" />
        </pattern>
        <g id="chart-coasts" strokeLinejoin="round">
          {/* East Asia and its offshore islands */}
          <path d="M-5-5h207l-12 12-13 2-8 10-12 4-2 12-9 7-6 13 4 10-6 12-5-6 1-18-9 4-10 14-4 14 5 5-8 7-3 14-7 7-4-3 1-10-8 1-5 12 6 8-3 7-11 2-6 11-11 4 3 12-9 12-10 5-3 10-15 8-7 11 6 11-2 15-8 9-7-2 1-8-8-13-4-1-1 28 6 11-1 7-9-13-5-20-9-8-9-1z" />
          <path d="m103 133 7-7 5-9 7-3-4 11-9 9-7 2z M111 112l3-7 7-4 1 6-6 5z M73 166l4-10 4-1-1 8-5 6z M69 193l5-6 5 8-2 10-5-4z M78 211l4-6 3 5-2 6z M73 220l5-5 8 5-6 4z" />
          {/* Indonesia, Australia and New Zealand */}
          <path d="m20 250 10 4 7 11 15 9-4 3-17-11z M51 277l22 4 9 3-1 3-24-4z M53 242l8-9 8 2 6-6 1 13-10 12-10-3z M98 258l13-2 8 4 14 2 6 8-14-3-12 1z" />
          <path d="m65 323 9-10 11-1 2-8 9-3 5 4 6-9 10-2 5 6 8 4 4-18 5 4 4 17 12 14 6 20-3 18-7 10-5 2-4-7-10 3-11-11-9-2-17 5-16-1-8-6-8 1-1-18z M140 377l8 1-4 9-5-3z M181 364l5 7-3 9-5 4-2-3 5-9z M177 385l-8 11-10 7-3-4 10-9z" />
          {/* Alaska, the west coast of the Americas and the Andean coast */}
          <path d="M485-5H308l-6 8-12 2-1 5 10 1-3 8 7 5-3 8-16 8-16 13 11-4 14-7 13-3 13-10 7 1 7 10 15 2 9 7 13 4 8 10 2 7 12 3 2 9 7 13-1 11 8 11 1 13 8 11 5 14 9 9 3 13 5 8 2-4-3-12-7-15 4 1 6 14 9 10 3 9 10 6 5 8 9 2 5 7 8 2 9 6z" />
          <path d="m407 139 4 9 4 4-1 3-5-6z M369 63l10 5 4 8-6-3-6-6z M352 52l9 3 3 6-5-2z M263 54l-8 3-5 1 7-4z" />
          <path d="m485 229-11-4-9-8-13 1-7 10-6 3-4 17-6 5 2 13-4 13 5 15 8 9 8 16 5 5 5 16 6 8 3 16-5 18 3 13-5 19 5 13 5 12 7 7 9 2z" />
        </g>
      </defs>
      <rect width="480" height="480" fill="url(#chart-graticule)" opacity=".64" />
      {[19, 11, 5].map((width) => (
        <use key={width} href="#chart-coasts" fill="none" stroke="#80b3a9" strokeOpacity=".22" strokeWidth={width} />
      ))}
      <use href="#chart-coasts" fill="url(#chart-land)" stroke="#7f9d88" strokeWidth="1.3" />
      <g fill="none" strokeLinecap="round" strokeDasharray="5 4">
        <path d="M43 174Q188 12 404 107" stroke="#b92d67" strokeWidth="1.9" />
        <path d="M112 127Q286 37 422 150Q452 202 431 274" stroke="#417e80" strokeWidth="1.6" />
        <path d="M43 174Q39 279 151 330Q193 363 201 394" stroke="#417e80" strokeWidth="1.5" />
      </g>
      <g fill="#fff8dd" stroke="#9f305d" strokeWidth="2">
        {[[43, 174], [112, 127], [404, 107], [422, 150], [431, 274], [151, 330]].map(([x, y]) => (
          <circle key={x} cx={x} cy={y} r="3.6" />
        ))}
      </g>
      <g transform="translate(356 369)" fill="none" stroke="#487f79">
        <circle r="28" opacity=".5" />
        <circle r="32" strokeDasharray="1 5.28" />
        <path d="M-38 0h76M0-38v76" strokeWidth=".8" />
        {[0, 90, 180, 270].map((angle) => (
          <g key={angle} transform={`rotate(${angle})`}>
            <path d="m0-30 5 25-5 5z" fill="#2d6765" />
            <path d="m0-30-5 25 5 5z" fill="#f2e9cb" />
          </g>
        ))}
        <circle r="3.5" fill="#b82a63" stroke="#f3e8c9" />
      </g>
      <g fill="none" stroke="#4b827b" strokeWidth="1.2">
        <rect x="7" y="7" width="466" height="466" opacity=".5" />
        <path d="M12 30V12h18m420 0h18v18m0 420v18h-18m-420 0H12v-18" />
      </g>
    </svg>
  );
});

interface MovingPawnProps {
  player: Player;
  frame?: TravelFrame;
  allowIdle: boolean;
  exposure: number;
  tile: number;
  heading: number;
  is3D: boolean;
  zIndex: number;
  stackIndex: number;
  stackSize: number;
  advance: (id: string, frame: TravelFrame) => void;
}

function MovingPawn({ player, frame, allowIdle, exposure, tile, heading, is3D, zIndex, stackIndex, stackSize, advance }: MovingPawnProps) {
  useLayoutEffect(() => {
    if (!frame) return;
    if (frame.duration === 0) {
      advance(player.id, frame);
      return;
    }
    const timer = setTimeout(() => advance(player.id, frame), frame.duration);
    return () => clearTimeout(timer);
  }, [player.id, frame, advance]);

  const coord = TILE_CENTER_PERCENT[tile];
  return (
    <div className="absolute pointer-events-none" style={{
      left: `${coord.x}%`,
      top: `${coord.y}%`,
      transition: frame?.gliding ? `left ${frame.duration}ms linear, top ${frame.duration}ms linear` : 'none',
      transform: 'translate(-50%, -50%)',
      transformStyle: is3D ? 'preserve-3d' : undefined,
      zIndex,
    }}>
      <Pawn3D player={player} idle={allowIdle && !frame} exposure={exposure} is3D={is3D} heading={heading} stackIndex={stackIndex} stackSize={stackSize} />
    </div>
  );
}

export const Board: React.FC<Props> = ({
  gameState,
  sky,
  subscribeBoard,
  myPlayerId,
  onAction,
  isRolling,
  activeCard,
  onCloseCard,
  is3D = true,
  onPawnMovingChange,
  onRentReceiptsChange,
}) => {
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);

  const idleMotion = useIdleMotion();
  const allowIdle = idleMotion && selectedTileId === null && !activeCard && !gameState.winnerId;
  const { tracks, claims, rentReceipts, advance } = useBoardPlayback(gameState, subscribeBoard);
  const moving = gameState.players.some((player) => !player.isBankrupt && tracks[player.id]?.frames.length);
  useLayoutEffect(() => { onPawnMovingChange?.(moving); }, [moving, onPawnMovingChange]);
  useLayoutEffect(() => { onRentReceiptsChange?.(rentReceipts); }, [rentReceipts, onRentReceiptsChange]);

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

  const livePlayers = gameState.players.filter((player) => !player.isBankrupt);

  return (
    <div className="relative flex items-center justify-center">
      {/* 3D Perspective Scene Container */}
      <div
        className="w-full flex items-center justify-center overflow-visible transition-all duration-700"
        style={{
          perspective: is3D ? '2000px' : undefined,
          transformStyle: is3D ? 'preserve-3d' : undefined,
        }}
      >
        {/* Printed board and layered edge */}
        <div
          className={`chart-slab relative ${
            is3D ? 'board-tilted' : 'board-flat'
          } aspect-square origin-center border-4 p-2 select-none transition-all duration-700 ease-out`}
          data-sky-phase={sky.phase}
          data-light={sky.body}
          data-weather={sky.weather}
          style={{
            '--cast-x': `${sky.shadowX.toFixed(2)}px`,
            '--cast-y': `${sky.shadowY.toFixed(2)}px`,
            '--cast-blur': `${sky.shadowBlur}px`,
            '--cast-opacity': sky.shadowOpacity,
            '--model-exposure': sky.exposure,
            transform: is3D
              ? 'rotateX(var(--board-tilt)) rotateZ(var(--board-yaw)) scale(var(--board-scale))'
              : 'none',
            transformStyle: is3D ? 'preserve-3d' : undefined,
          } as React.CSSProperties}
        >
          {/* Lưới 9x9: 4 ô góc hình vuông (1.35fr x 1.35fr), các ô cạnh hình chữ nhật (1fr x 1.35fr) */}
          <div
            className="board-grid w-full h-full gap-1 grid"
            style={{
              gridTemplateColumns: 'minmax(0, 1.35fr) repeat(7, minmax(0, 1fr)) minmax(0, 1.35fr)',
              gridTemplateRows: 'minmax(0, 1.35fr) repeat(7, minmax(0, 1fr)) minmax(0, 1.35fr)',
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
                    claim={claims[tile.id]}
                    receipt={rentReceipts[tile.id]}
                    owner={owner}
                    currentRent={currentRent}
                    orientation={getTileOrientation(tile.id)}
                    is3D={is3D}
                    myPlayerId={myPlayerId}
                    onClick={() => setSelectedTileId(tile.id)}
                  />
                </div>
              );
            })}

            {/* Hải đồ Thái Bình Dương và khu vực gieo xúc xắc */}
            <div
              style={{
                gridRow: '2 / 9',
                gridColumn: '2 / 9',
                transformStyle: is3D ? 'preserve-3d' : undefined,
              }}
              className="chart-water pointer-events-none relative flex items-center justify-center p-3"
            >
              <PacificChart />
              <BoardSky sky={sky} />

              {/* Khối xúc xắc 3D khối hộp Magenta & Navy - Billboard counter-rotate để không bị cấn móp, giống y chang 2D */}
              <div
                className="w-full h-full flex items-center justify-center select-none z-10"
                style={{
                  transform: is3D ? 'var(--board-billboard) translateZ(38px) scale(var(--model-scale))' : undefined,
                  transformStyle: is3D ? 'preserve-3d' : undefined,
                  transformOrigin: 'center center',
                }}
              >
                <DiceView is3D={is3D} dice={gameState.dice} isRolling={isRolling} hasRolled={gameState.hasRolled} />
              </div>
            </div>
          </div>

          {/* Keep each player's pawn mounted as it travels between tiles. */}
          <div
            className="absolute inset-2 pointer-events-none z-30"
            style={{ transformStyle: is3D ? 'preserve-3d' : undefined }}
          >
            {livePlayers.map((player, index) => {
              const track = tracks[player.id];
              const frame = track?.frames[0];
              const pose = frame ?? track?.settled;
              const tile = pose?.tile ?? player.position;
              const occupants = frame?.gliding ? [] : livePlayers.filter((other) => {
                const otherTrack = tracks[other.id];
                const next = otherTrack?.frames[0];
                return !next?.gliding && (next?.tile ?? otherTrack?.settled.tile ?? other.position) === tile;
              });
              return (
                <MovingPawn
                  key={player.id}
                  player={player}
                  frame={frame}
                  allowIdle={allowIdle}
                  exposure={sky.exposure}
                  tile={tile}
                  heading={pose?.heading ?? forwardHeading(tile)}
                  is3D={is3D}
                  zIndex={player.id === gameState.players[gameState.activePlayerIndex]?.id ? 45 : 20 + index}
                  stackIndex={Math.max(0, occupants.indexOf(player))}
                  stackSize={occupants.length || 1}
                  advance={advance}
                />
              );
            })}
          </div>

          {/* Floating Rent Receipts in 3D Scene */}
          <div
            className="absolute inset-2 pointer-events-none z-50"
            style={{ transformStyle: is3D ? 'preserve-3d' : undefined }}
          >
            {Object.values(rentReceipts).map((receipt) => {
              const coord = TILE_CENTER_PERCENT[receipt.tileId];
              if (!coord) return null;
              return (
                <div
                  key={`receipt-${receipt.tileId}`}
                  className="absolute pointer-events-none tile-rent-container"
                  style={{
                    left: `${coord.x}%`,
                    top: `${coord.y}%`,
                    transform: is3D
                      ? 'translate(-50%, -50%) rotateZ(calc(0deg - var(--board-yaw))) rotateX(calc(0deg - var(--board-tilt) - 12deg)) translateZ(54px)'
                      : 'translate(-50%, -50%)',
                    transformStyle: is3D ? 'preserve-3d' : undefined,
                  }}
                  aria-hidden="true"
                >
                  <div className="tile-rent-popup">
                    {receipt.lines.map((line, idx) => (
                      <div
                        key={idx}
                        className={`tile-rent-line ${line.type === 'deduct' ? 'tile-rent-deduct' : 'tile-rent-credit'}`}
                      >
                        <span className="tile-rent-name">{line.playerName}:</span>
                        <span className="tile-rent-val">
                          {line.type === 'deduct' ? `-$${line.amount}M 💸` : `+$${line.amount}M 💰`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <span className="sr-only" role="status">
        {Object.values(claims).map((claim) => (
          <span key={claim.tileId}>{gameState.players.find((player) => player.id === claim.playerId)?.name} đã mua {BOARD_TILES[claim.tileId].name}. </span>
        ))}
        {Object.values(rentReceipts).map((receipt) => (
          <span key={`rent-${receipt.tileId}`}>
            Thanh toán cước tại {BOARD_TILES[receipt.tileId]?.name}: {receipt.lines.map((l) => `${l.playerName} ${l.type === 'deduct' ? 'bị trừ' : 'nhận'} $${l.amount}M`).join(', ')}.
          </span>
        ))}
      </span>

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
