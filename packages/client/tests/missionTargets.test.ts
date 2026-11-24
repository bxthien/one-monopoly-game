import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMissionProgress } from '../src/utils/missionTargets.js';
import { GameState, SecretMissionCard } from '@one-monopoly/shared';

describe('resolveMissionProgress', () => {
  const dummyMission1: SecretMissionCard = {
    id: 'MISSION-1',
    title: 'Hợp Đồng 1: Cầu Nối Việt Nam – Mỹ',
    description: 'Sở hữu đồng thời Cảng Cái Mép (VNVUT), Cảng Los Angeles (USLAX) và Tuyến PS3.',
    reward: 400,
    isCompleted: false,
  };

  const dummyMission2: SecretMissionCard = {
    id: 'MISSION-2',
    title: 'Hợp Đồng 2: Di Sản Nhật – Singapore',
    description: 'Sở hữu Tokyo Flagship Hub (JPTYO), Cảng Busan (KRPUS) và 1 Siêu tàu ONE Innovation (Mức 5).',
    reward: 500,
    isCompleted: false,
  };

  const dummyMission4: SecretMissionCard = {
    id: 'MISSION-4',
    title: 'Hợp Đồng 4: Vua Tuyến Dịch Vụ Huyết Mạch',
    description: 'Sở hữu ít nhất 3 trong 4 Tuyến Dịch Vụ Toàn Cầu (VSS, MD2, FE2, PS3).',
    reward: 450,
    isCompleted: false,
  };

  const baseState: Partial<GameState> = {
    players: [
      {
        id: 'p1',
        name: 'Player 1',
        token: 'ONE_APUS',
        balance: 1500,
        position: 0,
        inHold: false,
        holdTurns: 0,
        customsClearancePasses: 0,
        isBankrupt: false,
        isOnline: true,
      },
      {
        id: 'p2',
        name: 'Bot',
        token: 'TRUCK',
        balance: 1500,
        position: 0,
        inHold: false,
        holdTurns: 0,
        customsClearancePasses: 0,
        isBankrupt: false,
        isOnline: true,
      },
    ],
    properties: {
      3: { ownerId: 'p1', containerLevel: 0, isMortgaged: false, hasGreenFleet: false, slotCharter: null }, // Cái Mép
      23: { ownerId: 'p2', containerLevel: 0, isMortgaged: false, hasGreenFleet: false, slotCharter: null }, // Los Angeles
      28: { ownerId: null, containerLevel: 0, isMortgaged: false, hasGreenFleet: false, slotCharter: null }, // PS3
    },
  };

  it('returns null if mission or playerId is missing', () => {
    assert.equal(resolveMissionProgress(undefined, baseState as GameState, 'p1'), null);
    assert.equal(resolveMissionProgress(dummyMission1, null, 'p1'), null);
    assert.equal(resolveMissionProgress(dummyMission1, baseState as GameState, null), null);
  });

  it('resolves MISSION-1 with correct target tiles and completion state', () => {
    const res = resolveMissionProgress(dummyMission1, baseState as GameState, 'p1');
    assert.ok(res);
    assert.equal(res.missionId, 'MISSION-1');
    assert.equal(res.completedCount, 1);
    assert.equal(res.totalCount, 3);
    assert.equal(res.isFullyCompleted, false);
    assert.equal(res.items.length, 3);

    // Tile 3 (Cái Mép) is owned by p1
    assert.equal(res.items[0].tileId, 3);
    assert.equal(res.items[0].isCompleted, true);
    assert.equal(res.items[0].isOwnedByMe, true);

    // Tile 23 (LA) is owned by p2
    assert.equal(res.items[1].tileId, 23);
    assert.equal(res.items[1].isCompleted, false);
    assert.equal(res.items[1].ownerName, 'Bot');

    // Tile 28 (PS3) is unowned
    assert.equal(res.items[2].tileId, 28);
    assert.equal(res.items[2].isCompleted, false);

    assert.ok(res.targetTileIds.has(3));
    assert.ok(res.targetTileIds.has(23));
    assert.ok(res.targetTileIds.has(28));
    assert.ok(res.completedTileIds.has(3));
    assert.ok(!res.completedTileIds.has(23));
  });

  it('resolves MISSION-2 including level 5 vessel condition', () => {
    const stateWithLvl5: GameState = {
      ...(baseState as GameState),
      properties: {
        31: { ownerId: 'p1', containerLevel: 5, isMortgaged: false, hasGreenFleet: false, slotCharter: null }, // Tokyo lvl 5
        17: { ownerId: 'p1', containerLevel: 0, isMortgaged: false, hasGreenFleet: false, slotCharter: null }, // Busan
      },
    };
    const res = resolveMissionProgress(dummyMission2, stateWithLvl5, 'p1');
    assert.ok(res);
    assert.equal(res.completedCount, 3);
    assert.equal(res.totalCount, 3);
    assert.equal(res.isFullyCompleted, true);
  });

  it('resolves MISSION-4 with minimum 3 required service lines', () => {
    const res = resolveMissionProgress(dummyMission4, baseState as GameState, 'p1');
    assert.ok(res);
    assert.equal(res.totalCount, 3); // Cần tối thiểu 3
    assert.equal(res.items.length, 4); // 4 tuyến để chọn
  });
});
