import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OneMonopolyEngine } from '../src/gameEngine.js';
import { BOARD_TILES } from '../src/boardData.js';

describe('OneMonopolyEngine Unit Tests', () => {
  const initialPlayers = [
    { id: 'p1', name: 'Captain Apus', token: 'ONE_APUS' as const },
    { id: 'p2', name: 'Chief Magenta', token: 'ONE_MAGENTA' as const },
  ];

  it('createGame initializes game state properly', () => {
    const state = OneMonopolyEngine.createGame('room-1', initialPlayers);

    assert.equal(state.roomId, 'room-1');
    assert.equal(state.players.length, 2);
    assert.equal(state.players[0].balance, 1500);
    assert.equal(state.players[0].position, 0);
    assert.equal(state.phase, 'WAIT_FOR_ROLL');
    assert.equal(state.activePlayerIndex, 0);
    assert.equal(state.winnerId, null);

    // Verify properties initialized
    assert.equal(state.properties[1].ownerId, null);
    assert.equal(state.properties[1].containerLevel, 0);
    assert.equal(state.properties[1].isMortgaged, false);
  });

  it('ROLL_DICE moves player and prompts for buy on unowned port', () => {
    const state = OneMonopolyEngine.createGame('room-1', initialPlayers);

    // Force dice [1, 2] -> sum = 3 -> lands on tile 3 (VNVUT)
    const { state: nextState, events } = OneMonopolyEngine.dispatch(state, {
      type: 'ROLL_DICE',
      forcedDice: [1, 2],
    });

    assert.equal(nextState.players[0].position, 3);
    assert.equal(nextState.phase, 'AWAITING_BUY_DECISION');

    const rollEvent = events.find((e) => e.type === 'DICE_ROLLED');
    assert.ok(rollEvent);
    const stepEvent = events.find((e) => e.type === 'SHIP_STEPPED');
    assert.ok(stepEvent);
  });

  it('BUY_PROPERTY deducts cash and assigns ownership', () => {
    const state = OneMonopolyEngine.createGame('room-1', initialPlayers);
    const s1 = OneMonopolyEngine.dispatch(state, {
      type: 'ROLL_DICE',
      forcedDice: [1, 2], // Tile 3 (VNVUT, price $60M)
    }).state;

    const { state: s2, events } = OneMonopolyEngine.dispatch(s1, {
      type: 'BUY_PROPERTY',
    });

    assert.equal(s2.players[0].balance, 1500 - 60);
    assert.equal(s2.properties[3].ownerId, 'p1');
    assert.equal(s2.phase, 'END_OF_TURN');

    const purchaseEvent = events.find((e) => e.type === 'TILE_PURCHASED');
    assert.ok(purchaseEvent);
  });

  it('Passed GO awards $200M', () => {
    const state = OneMonopolyEngine.createGame('room-1', initialPlayers);
    state.players[0].position = 38;

    // Roll 4 -> 38 + 4 = 42 % 40 = 2 (passed 0)
    const { state: nextState, events } = OneMonopolyEngine.dispatch(state, {
      type: 'ROLL_DICE',
      forcedDice: [2, 2],
    });

    assert.equal(nextState.players[0].position, 2);
    // Initial 1500 + 200 (GO) = 1700
    assert.ok(nextState.players[0].balance >= 1700);

    const goEvent = events.find((e) => e.type === 'PASSED_GO');
    assert.ok(goEvent);
  });

  it('Rolling 3 consecutive doubles sends player to CUSTOMS_HOLD', () => {
    let state = OneMonopolyEngine.createGame('room-1', initialPlayers);

    // Double 1
    state = OneMonopolyEngine.dispatch(state, {
      type: 'ROLL_DICE',
      forcedDice: [1, 1], // Tile 2 (MARKET)
    }).state;
    state = OneMonopolyEngine.dispatch(state, { type: 'END_TURN' }).state;
    // Keep active player as p1 for testing 3 doubles logic directly:
    state.activePlayerIndex = 0;
    state.phase = 'WAIT_FOR_ROLL';
    state.hasRolled = false;
    state.consecutiveDoubles = 1;

    // Double 2
    state = OneMonopolyEngine.dispatch(state, {
      type: 'ROLL_DICE',
      forcedDice: [2, 2],
    }).state;
    assert.equal(state.consecutiveDoubles, 2);

    state.phase = 'WAIT_FOR_ROLL';
    state.hasRolled = false;

    // Double 3 -> Sent to hold
    const res = OneMonopolyEngine.dispatch(state, {
      type: 'ROLL_DICE',
      forcedDice: [3, 3],
    });

    assert.equal(res.state.players[0].position, 10);
    assert.equal(res.state.players[0].inHold, true);
    assert.equal(res.state.phase, 'END_OF_TURN');

    const holdEvent = res.events.find((e) => e.type === 'SENT_TO_HOLD');
    assert.ok(holdEvent);
  });

  it('Player in CUSTOMS_HOLD can escape by paying $50M fine', () => {
    const state = OneMonopolyEngine.createGame('room-1', initialPlayers);
    state.players[0].inHold = true;
    state.players[0].position = 10;

    const { state: nextState, events } = OneMonopolyEngine.dispatch(state, {
      type: 'PAY_HOLD_FINE',
    });

    assert.equal(nextState.players[0].inHold, false);
    assert.equal(nextState.players[0].balance, 1500 - 50);

    const releasedEvent = events.find((e) => e.type === 'RELEASED_FROM_HOLD');
    assert.ok(releasedEvent);
  });

  it('Even Building Rule works correctly for INTRA_ASIA route', () => {
    const state = OneMonopolyEngine.createGame('room-1', initialPlayers);
    // Player 1 owns both INTRA_ASIA ports: Tile 1 (VNSGN) and Tile 3 (VNVUT)
    state.properties[1].ownerId = 'p1';
    state.properties[3].ownerId = 'p1';

    // Build container on Tile 1 -> level 1
    let res = OneMonopolyEngine.dispatch(state, {
      type: 'BUILD_CONTAINER',
      tileId: 1,
    });
    assert.equal(res.state.properties[1].containerLevel, 1);
    assert.equal(res.state.properties[3].containerLevel, 0);

    // Try to build container on Tile 1 again (level 2) while Tile 3 is still level 0 -> Must be blocked!
    res = OneMonopolyEngine.dispatch(res.state, {
      type: 'BUILD_CONTAINER',
      tileId: 1,
    });
    assert.equal(res.state.properties[1].containerLevel, 1, 'Blocked by even building rule');

    // Build on Tile 3 -> level 1
    res = OneMonopolyEngine.dispatch(res.state, {
      type: 'BUILD_CONTAINER',
      tileId: 3,
    });
    assert.equal(res.state.properties[3].containerLevel, 1);

    // Now Tile 1 can be built to level 2!
    res = OneMonopolyEngine.dispatch(res.state, {
      type: 'BUILD_CONTAINER',
      tileId: 1,
    });
    assert.equal(res.state.properties[1].containerLevel, 2);
  });

  it('Demurrage rent calculation & monopoly double rent', () => {
    const state = OneMonopolyEngine.createGame('room-1', initialPlayers);
    // P2 owns tile 1 (VNSGN) base rent is 2
    state.properties[1].ownerId = 'p2';

    // 1 port owned: rent = 2
    let rent = OneMonopolyEngine.calculateRent(state, 1, [1, 2]);
    assert.equal(rent, 2);

    // Full monopoly owned (Tile 1 and Tile 3): rent doubled = 4
    state.properties[3].ownerId = 'p2';
    rent = OneMonopolyEngine.calculateRent(state, 1, [1, 2]);
    assert.equal(rent, 4);

    // 1 container built: rentTier[1] = 10
    state.properties[1].containerLevel = 1;
    rent = OneMonopolyEngine.calculateRent(state, 1, [1, 2]);
    assert.equal(rent, 10);
  });

  it('Debt creation and settlement when landing on expensive property', () => {
    const state = OneMonopolyEngine.createGame('room-1', initialPlayers);
    // P2 owns Tokyo Hub (Tile 39) with Mega Terminal (Level 5): Rent is $2000M
    state.properties[39].ownerId = 'p2';
    state.properties[39].containerLevel = 5;

    // P1 lands on Tile 39 with only $1500M
    const res = OneMonopolyEngine.dispatch(state, {
      type: 'ROLL_DICE',
      forcedDice: [20, 19], // Landing on 39
    });

    assert.equal(res.state.phase, 'AWAITING_DEBT_RESOLUTION');
    assert.ok(res.state.pendingDebt);
    assert.equal(res.state.pendingDebt?.creditorId, 'p2');
    assert.equal(res.state.pendingDebt?.amount, 2000);

    const debtEvent = res.events.find((e) => e.type === 'DEBT_CREATED');
    assert.ok(debtEvent);
  });

  it('Bankruptcy triggers GAME_OVER when 1 survivor remains', () => {
    const state = OneMonopolyEngine.createGame('room-1', initialPlayers);
    state.phase = 'AWAITING_DEBT_RESOLUTION';
    state.pendingDebt = {
      creditorId: 'p2',
      amount: 2000,
      reason: 'Tokyo Terminal',
    };

    const res = OneMonopolyEngine.dispatch(state, {
      type: 'DECLARE_BANKRUPTCY',
    });

    assert.equal(res.state.players[0].isBankrupt, true);
    assert.equal(res.state.winnerId, 'p2');

    const gameOverEvent = res.events.find((e) => e.type === 'GAME_OVER');
    assert.ok(gameOverEvent);
  });
});
