import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OneMonopolyEngine } from '../src/gameEngine.js';
import { CANAL_TRANSIT_FEE, CANAL_TILE_INDEX, GO_REWARD } from '../src/boardData.js';

describe('Canal Transit (Tile 16) Unit Tests', () => {
  const initialPlayers = [
    { id: 'p1', name: 'Captain Apus', token: 'ONE_APUS' as const },
    { id: 'p2', name: 'Chief Magenta', token: 'ONE_MAGENTA' as const },
  ];

  it('prompts AWAITING_CANAL_CHOICE when player lands on Tile 16 with sufficient funds', () => {
    const state = OneMonopolyEngine.createGame('room-canal-1', initialPlayers);
    // Player 1 at position 10, rolls 6 -> lands on 16
    state.players[0].position = 10;
    const { state: nextState } = OneMonopolyEngine.dispatch(state, {
      type: 'ROLL_DICE',
      forcedDice: [2, 4],
    });

    assert.equal(nextState.players[0].position, CANAL_TILE_INDEX);
    assert.equal(nextState.phase, 'AWAITING_CANAL_CHOICE');
    assert.equal(nextState.awaitingCanalChoice, true);
  });

  it('auto-skips canal choice if player does not have $50M fee', () => {
    const state = OneMonopolyEngine.createGame('room-canal-2', initialPlayers);
    state.players[0].position = 10;
    state.players[0].balance = 30; // less than CANAL_TRANSIT_FEE (50)

    const { state: nextState } = OneMonopolyEngine.dispatch(state, {
      type: 'ROLL_DICE',
      forcedDice: [2, 4],
    });

    assert.equal(nextState.players[0].position, CANAL_TILE_INDEX);
    assert.equal(nextState.awaitingCanalChoice, false);
    assert.equal(nextState.phase, 'END_OF_TURN');
  });

  it('choice SKIP costs $0 and finishes step phase', () => {
    const state = OneMonopolyEngine.createGame('room-canal-3', initialPlayers);
    state.players[0].position = 10;
    const { state: s1 } = OneMonopolyEngine.dispatch(state, {
      type: 'ROLL_DICE',
      forcedDice: [2, 4],
    });
    const balanceBefore = s1.players[0].balance;

    const { state: s2, events } = OneMonopolyEngine.dispatch(s1, {
      type: 'RESOLVE_CANAL_TRANSIT',
      choice: 'SKIP',
    });

    assert.equal(s2.players[0].balance, balanceBefore);
    assert.equal(s2.awaitingCanalChoice, false);
    assert.equal(s2.phase, 'END_OF_TURN');
    assert.ok(events.some((e) => e.type === 'CANAL_TRANSITED' && e.choice === 'SKIP'));
  });

  it('choice ROLL_AGAIN deducts $50M and resets hasRolled for another roll', () => {
    const state = OneMonopolyEngine.createGame('room-canal-4', initialPlayers);
    state.players[0].position = 10;
    const { state: s1 } = OneMonopolyEngine.dispatch(state, {
      type: 'ROLL_DICE',
      forcedDice: [2, 4],
    });
    const balanceBefore = s1.players[0].balance;

    const { state: s2, events } = OneMonopolyEngine.dispatch(s1, {
      type: 'RESOLVE_CANAL_TRANSIT',
      choice: 'ROLL_AGAIN',
    });

    assert.equal(s2.players[0].balance, balanceBefore - CANAL_TRANSIT_FEE);
    assert.equal(s2.players[0].position, CANAL_TILE_INDEX);
    assert.equal(s2.hasRolled, false);
    assert.equal(s2.phase, 'WAIT_FOR_ROLL');
    assert.ok(events.some((e) => e.type === 'CANAL_TRANSITED' && e.choice === 'ROLL_AGAIN'));

    // Player can now roll again immediately
    const { state: s3 } = OneMonopolyEngine.dispatch(s2, {
      type: 'ROLL_DICE',
      forcedDice: [1, 2],
    });
    assert.equal(s3.players[0].position, CANAL_TILE_INDEX + 3);
  });

  it('choice TRANSIT to a Service Line (Tile 20 FE2) cruises there and deducts $50M', () => {
    const state = OneMonopolyEngine.createGame('room-canal-5', initialPlayers);
    state.players[0].position = 10;
    const { state: s1 } = OneMonopolyEngine.dispatch(state, {
      type: 'ROLL_DICE',
      forcedDice: [2, 4],
    });
    const balanceBefore = s1.players[0].balance;

    const { state: s2, events } = OneMonopolyEngine.dispatch(s1, {
      type: 'RESOLVE_CANAL_TRANSIT',
      choice: 'TRANSIT',
      targetTileId: 20, // FE2 Service Line
    });

    assert.equal(s2.players[0].position, 20);
    // Paid 50M fee
    assert.equal(s2.players[0].balance, balanceBefore - CANAL_TRANSIT_FEE);
    assert.ok(events.some((e) => e.type === 'CANAL_TRANSITED' && e.to === 20));
    assert.ok(events.some((e) => e.type === 'SHIP_STEPPED' && e.to === 20));
  });

  it('choice TRANSIT clockwise past Tile 0 awards GO Reward ($200M)', () => {
    const state = OneMonopolyEngine.createGame('room-canal-6', initialPlayers);
    state.players[0].position = 10;
    const { state: s1 } = OneMonopolyEngine.dispatch(state, {
      type: 'ROLL_DICE',
      forcedDice: [2, 4],
    });
    const balanceBefore = s1.players[0].balance;

    // Transit to Tile 4 (VSS Service Line) which is past Tile 0 clockwise from 16
    const { state: s2, events } = OneMonopolyEngine.dispatch(s1, {
      type: 'RESOLVE_CANAL_TRANSIT',
      choice: 'TRANSIT',
      targetTileId: 4,
    });

    assert.equal(s2.players[0].position, 4);
    // Net balance: -50 fee + 200 GO reward = +150
    assert.equal(s2.players[0].balance, balanceBefore - CANAL_TRANSIT_FEE + GO_REWARD);
    assert.ok(events.some((e) => e.type === 'PASSED_GO'));
  });

  it('choice TRANSIT to an owned port enables container upgrade', () => {
    const state = OneMonopolyEngine.createGame('room-canal-7', initialPlayers);
    // Player 1 owns Port 1 (HKHKG)
    state.properties[1].ownerId = 'p1';
    state.players[0].position = 10;

    const { state: s1 } = OneMonopolyEngine.dispatch(state, {
      type: 'ROLL_DICE',
      forcedDice: [2, 4],
    });

    const { state: s2 } = OneMonopolyEngine.dispatch(s1, {
      type: 'RESOLVE_CANAL_TRANSIT',
      choice: 'TRANSIT',
      targetTileId: 1,
    });

    assert.equal(s2.players[0].position, 1);
    assert.equal(s2.canUpgradeCurrentPort, true);
  });

  it('rejects TRANSIT to an unowned rival port', () => {
    const state = OneMonopolyEngine.createGame('room-canal-8', initialPlayers);
    // Port 17 is unowned, not a service line
    state.players[0].position = 10;
    const { state: s1 } = OneMonopolyEngine.dispatch(state, {
      type: 'ROLL_DICE',
      forcedDice: [2, 4],
    });

    const { state: s2, events } = OneMonopolyEngine.dispatch(s1, {
      type: 'RESOLVE_CANAL_TRANSIT',
      choice: 'TRANSIT',
      targetTileId: 17, // Not a service line and not owned by p1
    });

    // Action rejected, state untouched
    assert.equal(s2.players[0].position, CANAL_TILE_INDEX);
    assert.equal(s2.phase, 'AWAITING_CANAL_CHOICE');
    assert.equal(events.length, 0);
  });
});
