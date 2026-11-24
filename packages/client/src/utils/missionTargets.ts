import { BOARD_TILES, GameState, SecretMissionCard } from '@one-monopoly/shared';

export interface MissionTargetItem {
  id: string;
  tileId?: number;
  code?: string;
  name: string;
  description?: string;
  isCompleted: boolean;
  ownerName?: string;
  isOwnedByMe: boolean;
}

export interface MissionProgressInfo {
  missionId: string;
  title: string;
  completedCount: number;
  totalCount: number;
  isFullyCompleted: boolean;
  items: MissionTargetItem[];
  targetTileIds: Set<number>;
  completedTileIds: Set<number>;
}

export function resolveMissionProgress(
  mission: SecretMissionCard | undefined,
  gameState: GameState | null,
  myPlayerId: string | null
): MissionProgressInfo | null {
  if (!mission || !gameState || !myPlayerId) return null;

  const player = gameState.players.find((p) => p.id === myPlayerId);
  if (!player) return null;

  const getTileOwnerInfo = (tileId: number) => {
    const prop = gameState.properties[tileId];
    if (!prop || !prop.ownerId) {
      return { isOwnedByMe: false, ownerName: undefined };
    }
    const isOwnedByMe = prop.ownerId === myPlayerId;
    const owner = gameState.players.find((p) => p.id === prop.ownerId);
    return {
      isOwnedByMe,
      ownerName: isOwnedByMe ? 'Bạn' : (owner?.name || 'Đối thủ'),
    };
  };

  const createTileItem = (tileId: number): MissionTargetItem => {
    const tile = BOARD_TILES[tileId];
    const { isOwnedByMe, ownerName } = getTileOwnerInfo(tileId);
    return {
      id: `tile-${tileId}`,
      tileId,
      code: tile?.code,
      name: tile?.name || `Ô #${tileId}`,
      isCompleted: isOwnedByMe,
      ownerName,
      isOwnedByMe,
    };
  };

  const items: MissionTargetItem[] = [];
  const targetTileIds = new Set<number>();
  const completedTileIds = new Set<number>();
  let totalCount = 3;

  switch (mission.id) {
    case 'MISSION-1': {
      // Cái Mép (3), Los Angeles (23), Tuyến PS3 (28)
      [3, 23, 28].forEach((id) => {
        const item = createTileItem(id);
        items.push(item);
        targetTileIds.add(id);
        if (item.isCompleted) completedTileIds.add(id);
      });
      totalCount = 3;
      break;
    }

    case 'MISSION-2': {
      // Tokyo (31), Busan (17), và 1 Siêu tàu cấp 5
      [31, 17].forEach((id) => {
        const item = createTileItem(id);
        items.push(item);
        targetTileIds.add(id);
        if (item.isCompleted) completedTileIds.add(id);
      });

      const hasLevel5 = Object.values(gameState.properties).some(
        (p) => p.ownerId === myPlayerId && p.containerLevel === 5
      );
      items.push({
        id: 'special-level5',
        name: 'Siêu tàu 24,000 TEU (Cấp 5)',
        description: 'Nâng cấp 1 cảng lên mức tối đa',
        isCompleted: hasLevel5,
        isOwnedByMe: hasLevel5,
      });
      totalCount = 3;
      break;
    }

    case 'MISSION-3': {
      // ONE QUOTE (10), ONE Eco Calculator (22), và 1 Tàu Nhiên Liệu Xanh
      [10, 22].forEach((id) => {
        const item = createTileItem(id);
        items.push(item);
        targetTileIds.add(id);
        if (item.isCompleted) completedTileIds.add(id);
      });

      const hasGreen = Object.values(gameState.properties).some(
        (p) => p.ownerId === myPlayerId && p.hasGreenFleet
      );
      items.push({
        id: 'special-green',
        name: 'Tàu Nhiên Liệu Xanh (ESG)',
        description: 'Lắp đặt động cơ xanh cho 1 cảng',
        isCompleted: hasGreen,
        isOwnedByMe: hasGreen,
      });
      totalCount = 3;
      break;
    }

    case 'MISSION-4': {
      // 4 Tuyến Dịch Vụ: VSS (4), MD2 (13), FE2 (20), PS3 (28) (cần tối thiểu 3)
      [4, 13, 20, 28].forEach((id) => {
        const item = createTileItem(id);
        items.push(item);
        targetTileIds.add(id);
        if (item.isCompleted) completedTileIds.add(id);
      });
      totalCount = 3; // Cần 3/4
      break;
    }

    case 'MISSION-5': {
      // Cát Lái (1), Cái Mép (3), Tuyến VSS (4)
      [1, 3, 4].forEach((id) => {
        const item = createTileItem(id);
        items.push(item);
        targetTileIds.add(id);
        if (item.isCompleted) completedTileIds.add(id);
      });
      totalCount = 3;
      break;
    }

    default: {
      totalCount = 1;
      items.push({
        id: 'general-mission',
        name: mission.title,
        description: mission.description,
        isCompleted: !!mission.isCompleted,
        isOwnedByMe: !!mission.isCompleted,
      });
    }
  }

  const completedCount = items.filter((it) => it.isCompleted).length;
  const isFullyCompleted = !!mission.isCompleted || completedCount >= totalCount;

  return {
    missionId: mission.id,
    title: mission.title,
    completedCount: Math.min(completedCount, totalCount),
    totalCount,
    isFullyCompleted,
    items,
    targetTileIds,
    completedTileIds,
  };
}
