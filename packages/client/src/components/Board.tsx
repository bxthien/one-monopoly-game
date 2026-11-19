import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { BOARD_TILES, GameAction, GameCard, GameState, OneMonopolyEngine, Player } from '@one-monopoly/shared';
import { TileView } from './TileView.js';
import { DiceView } from './DiceView.js';
import { PropertyModal } from './PropertyModal.js';
import { CardModal } from './CardModal.js';
import { Pawn3D } from './Pawn3D.js';

interface Props {
  gameState: GameState;
  myPlayerId: string | null;
  onAction: (action: GameAction) => void;
  isRolling: boolean;
  activeCard: GameCard | null;
  onCloseCard: () => void;
  is3D?: boolean;
  onPawnMovingChange?: (isMoving: boolean) => void;
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

interface PawnAnimState {
  currentTile: number;
  keyframes: number[] | null;
  isMoving: boolean;
}

export const Board: React.FC<Props> = ({
  gameState,
  myPlayerId,
  onAction,
  isRolling,
  activeCard,
  onCloseCard,
  is3D = true,
  onPawnMovingChange,
}) => {
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);

  // Quản lý trạng thái lướt mượt mà của từng nhân vật qua các cảng (Continuous Gliding Traversal)
  const [animStates, setAnimStates] = useState<Record<string, PawnAnimState>>({});
  const settledPositionsRef = useRef<Record<string, number>>({});
  // Hàng đợi lưu vị trí đích khi xúc xắc vẫn đang quay (Chờ xúc xắc quay xong mới cho tàu chạy)
  const pendingTargetsRef = useRef<Record<string, { start: number; target: number }>>({});
  const prevIsRollingRef = useRef(isRolling);

  const triggerMove = (playerId: string, start: number, target: number) => {
    settledPositionsRef.current[playerId] = target;
    const stepCount = (target - start + 32) % 32;

    // Nếu di chuyển bình thường theo xúc xắc (1-12 ô)
    if (stepCount > 0 && stepCount <= 12) {
      const path: number[] = [start];
      for (let i = 1; i <= stepCount; i++) {
        path.push((start + i) % 32);
      }
      setAnimStates((prev) => ({
        ...prev,
        [playerId]: {
          currentTile: target,
          keyframes: path,
          isMoving: true,
        },
      }));
    } else {
      // Trường hợp dịch chuyển tức thời (vào Hold, dịch chuyển đặc biệt)
      setAnimStates((prev) => ({
        ...prev,
        [playerId]: {
          currentTile: target,
          keyframes: null,
          isMoving: false,
        },
      }));
    }
  };

  useEffect(() => {
    gameState.players.forEach((p) => {
      const settled = settledPositionsRef.current[p.id];

      // Khởi tạo vị trí ban đầu
      if (settled === undefined) {
        settledPositionsRef.current[p.id] = p.position;
        setAnimStates((prev) => ({
          ...prev,
          [p.id]: { currentTile: p.position, keyframes: null, isMoving: false },
        }));
        return;
      }

      // Khi vị trí người chơi thay đổi trên server
      if (settled !== p.position) {
        if (isRolling) {
          // XÚC XẮC ĐANG QUAY: LƯU LẠI VỊ TRÍ ĐÍCH, TUYỆT ĐỐI CHƯA CHO NHÂN VẬT CHẠY!
          pendingTargetsRef.current[p.id] = { start: settled, target: p.position };
        } else {
          // Xúc xắc đã dừng: Kích hoạt di chuyển ngay
          delete pendingTargetsRef.current[p.id];
          triggerMove(p.id, settled, p.position);
        }
      }
    });
  }, [gameState.players, isRolling]);

  // Khi xúc xắc hoàn tất việc quay (isRolling chuyển từ true -> false)
  useEffect(() => {
    if (prevIsRollingRef.current && !isRolling) {
      const pending = { ...pendingTargetsRef.current };
      pendingTargetsRef.current = {};
      Object.entries(pending).forEach(([playerId, { start, target }]) => {
        triggerMove(playerId, start, target);
      });
    }
    prevIsRollingRef.current = isRolling;
  }, [isRolling]);

  // Thông báo trạng thái di chuyển của nhân vật cho App/ActionControls
  useEffect(() => {
    const isAnyMoving = Object.values(animStates).some((s) => s.isMoving);
    onPawnMovingChange?.(isAnyMoving);
  }, [animStates, onPawnMovingChange]);

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
    <div className="relative flex items-center justify-center">
      {/* 3D Perspective Scene Container */}
      <div
        className="w-full flex items-center justify-center overflow-visible transition-all duration-700"
        style={{
          perspective: is3D ? '2000px' : undefined,
          transformStyle: is3D ? 'preserve-3d' : undefined,
        }}
      >
        {/* Main Board Slab - Góc nghiêng 3D isometric chuẩn Business Tour, zoom to rõ nét */}
        <div
          className={`relative ${
            is3D ? 'w-[min(720px,82vh)]' : 'w-[min(600px,74vh)]'
          } aspect-square bg-[#FDFDFE] rounded-3xl border-4 border-gray-200 p-2 select-none transition-all duration-700 ease-out ${
            is3D ? 'origin-center' : 'shadow-2xl'
          }`}
          style={{
            transform: is3D
              ? 'rotateX(46deg) rotateZ(-45deg) scale(0.90) translateY(-26px)'
              : 'none',
            boxShadow: is3D
              ? '0 32px 60px -10px rgba(0, 0, 0, 0.42), 0 10px 0 #CBD5E1, 0 18px 0 #94A3B8, 0 26px 32px rgba(0,0,0,0.28)'
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
                    orientation={getTileOrientation(tile.id)}
                    is3D={is3D}
                    myPlayerId={myPlayerId}
                    onClick={() => setSelectedTileId(tile.id)}
                  />
                </div>
              );
            })}

            {/* Sân Bến Cảng Trung Tâm (7x7) - Chỉ hiển thị xúc xắc, không còn text che khuất */}
            <div
              style={{
                gridRow: '2 / 9',
                gridColumn: '2 / 9',
                transformStyle: is3D ? 'preserve-3d' : undefined,
              }}
              className="bg-radial from-pink-50/70 via-white to-gray-50 rounded-2xl border-2 border-gray-200/90 shadow-inner relative flex items-center justify-center p-3"
            >
              {/* Vòng tròn sân đỗ hải trình trang trí nhẹ (Maritime Dock Rings) */}
              <div className="absolute inset-6 rounded-full border border-pink-100/80 pointer-events-none" />
              <div className="absolute inset-14 rounded-full border border-dashed border-gray-200/60 pointer-events-none" />

              {/* Khối xúc xắc 3D khối hộp Magenta & Navy - Billboard counter-rotate để không bị cấn móp, giống y chang 2D */}
              <div
                className="w-full h-full flex items-center justify-center select-none z-10"
                style={{
                  transform: is3D ? 'rotateZ(45deg) rotateX(-46deg) translateZ(38px)' : undefined,
                  transformStyle: is3D ? 'preserve-3d' : undefined,
                  transformOrigin: 'center center',
                }}
              >
                <DiceView dice={gameState.dice} isRolling={isRolling} hasRolled={gameState.hasRolled} />
              </div>
            </div>
          </div>

          {/* Lớp hiển thị nhân vật 3D toàn cục (Persistent Pawn Overlay Layer: lướt liên tục không chớp tắt, đè lẫn nhau khi chung ô) */}
          <div
            className="absolute inset-2 pointer-events-none z-30"
            style={{ transformStyle: is3D ? 'preserve-3d' : undefined }}
          >
            {gameState.players
              .filter((p) => !p.isBankrupt)
              .map((p, pIdx) => {
                const anim = animStates[p.id];
                const tile = anim ? anim.currentTile : p.position;
                const isMoving = anim?.isMoving ?? false;
                const keyframes = anim?.keyframes;
                const isMultiPoint = !!(keyframes && keyframes.length > 1);

                const currentCoord = TILE_CENTER_PERCENT[tile] || TILE_CENTER_PERCENT[0];
                const animateCoords = isMultiPoint
                  ? {
                      left: keyframes.map((k) => `${TILE_CENTER_PERCENT[k].x}%`),
                      top: keyframes.map((k) => `${TILE_CENTER_PERCENT[k].y}%`),
                    }
                  : {
                      left: `${currentCoord.x}%`,
                      top: `${currentCoord.y}%`,
                    };

                const isCurrentTurn = p.id === gameState.players[gameState.activePlayerIndex]?.id;

                return (
                  <motion.div
                    key={p.id}
                    className="absolute pointer-events-auto"
                    style={{
                      transform: 'translate(-50%, -50%)',
                      transformStyle: is3D ? 'preserve-3d' : undefined,
                      zIndex: isCurrentTurn ? 45 : 20 + pIdx,
                    }}
                    initial={false}
                    animate={animateCoords}
                    transition={{
                      duration: isMultiPoint ? (keyframes.length - 1) * 0.18 : 0.15,
                      ease: 'linear',
                    }}
                    onAnimationComplete={() => {
                      if (isMultiPoint) {
                        setAnimStates((prev) => ({
                          ...prev,
                          [p.id]: {
                            ...prev[p.id],
                            keyframes: null,
                            isMoving: false,
                          },
                        }));
                      }
                    }}
                  >
                    <Pawn3D
                      player={p}
                      isMoving={isMoving}
                      is3D={is3D}
                      isMe={p.id === myPlayerId}
                      stackIndex={pIdx}
                    />
                  </motion.div>
                );
              })}
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
