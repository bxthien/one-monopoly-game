import React, { useState, useEffect, useRef } from 'react';
import { BOARD_TILES, GameAction, GameCard, GameState, OneMonopolyEngine, Player } from '@one-monopoly/shared';
import { TileView } from './TileView.js';
import { DiceView } from './DiceView.js';
import { PropertyModal } from './PropertyModal.js';
import { CardModal } from './CardModal.js';

interface Props {
  gameState: GameState;
  myPlayerId: string | null;
  onAction: (action: GameAction) => void;
  isRolling: boolean;
  activeCard: GameCard | null;
  onCloseCard: () => void;
  is3D?: boolean;
}

export const Board: React.FC<Props> = ({
  gameState,
  myPlayerId,
  onAction,
  isRolling,
  activeCard,
  onCloseCard,
  is3D = true,
}) => {
  const [selectedTileId, setSelectedTileId] = useState<number | null>(null);

  // Quản lý vị trí hiển thị từng bước (Step-by-step path traversal animation)
  const [displayPositions, setDisplayPositions] = useState<Record<string, number>>({});
  const [movingPlayerIds, setMovingPlayerIds] = useState<Set<string>>(new Set());
  const activeAnimationsRef = useRef<Record<string, boolean>>({});

  useEffect(() => {
    gameState.players.forEach((p) => {
      const currentDisplayed = displayPositions[p.id];

      // Khởi tạo ban đầu
      if (currentDisplayed === undefined) {
        setDisplayPositions((prev) => ({ ...prev, [p.id]: p.position }));
        return;
      }

      // Khi nhân vật di chuyển và chưa có luồng animation
      if (currentDisplayed !== p.position && !activeAnimationsRef.current[p.id]) {
        const start = currentDisplayed;
        const target = p.position;
        const stepCount = (target - start + 32) % 32;

        // Nếu là di chuyển cờ xúc xắc bình thường (1-12 ô)
        if (stepCount > 0 && stepCount <= 12) {
          activeAnimationsRef.current[p.id] = true;
          setMovingPlayerIds((prev) => new Set(prev).add(p.id));

          const path: number[] = [];
          for (let i = 1; i <= stepCount; i++) {
            path.push((start + i) % 32);
          }

          let stepIndex = 0;
          const interval = setInterval(() => {
            if (stepIndex < path.length) {
              const nextTile = path[stepIndex];
              setDisplayPositions((prev) => ({ ...prev, [p.id]: nextTile }));
              stepIndex++;
            } else {
              clearInterval(interval);
              activeAnimationsRef.current[p.id] = false;
              setMovingPlayerIds((prev) => {
                const next = new Set(prev);
                next.delete(p.id);
                return next;
              });
            }
          }, 220); // 220ms mỗi bước: tạo nhịp bước đi chân thực
        } else {
          // Trường hợp dịch chuyển tức thời (vào Hold / phá sản)
          setDisplayPositions((prev) => ({ ...prev, [p.id]: p.position }));
        }
      }
    });
  }, [gameState.players]);

  // Group players by current position on the board (sử dụng displayPositions động)
  const getPlayersOnTile = (tileId: number): Player[] => {
    return gameState.players.filter((p) => {
      const pos = displayPositions[p.id] !== undefined ? displayPositions[p.id] : p.position;
      return pos === tileId && !p.isBankrupt;
    });
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
                    playersOnTile={getPlayersOnTile(tile.id)}
                    orientation={getTileOrientation(tile.id)}
                    is3D={is3D}
                    movingPlayerIds={movingPlayerIds}
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
