import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OneMonopolyEngine } from '../src/gameEngine.js';

const players = [
  { id: 'a', name: 'A', token: 'ONE_APUS' as const },
  { id: 'b', name: 'B', token: 'ONE_MAGENTA' as const },
  { id: 'c', name: 'C', token: 'FREIGHT_TRAIN' as const },
];

describe('OPS-02 storm', () => {
  it('drifts back three tiles and lasts through an extra roll until the turn changes', () => {
    const game = OneMonopolyEngine.createGame('storm', players);
    game.opsDeck = ['OPS-02', 'OPS-01'];
    const draw = OneMonopolyEngine.dispatch(game, { type: 'ROLL_DICE', forcedDice: [3, 3] });

    assert.equal(draw.state.stormActive, true);
    assert.equal(draw.state.players[0].position, 3); // OPS tile 6, then drift to port 3.
    assert.equal(draw.state.phase, 'AWAITING_BUY_DECISION');

    const skip = OneMonopolyEngine.dispatch(draw.state, { type: 'SKIP_BUY' });
    assert.equal(skip.state.phase, 'WAIT_FOR_ROLL');
    const extraRoll = OneMonopolyEngine.dispatch(skip.state, { type: 'ROLL_DICE', forcedDice: [1, 2] });
    assert.equal(extraRoll.state.stormActive, true);
    assert.equal(extraRoll.state.players[0].position, 16); // OPS-01 moves the ship to free anchorage.
    const next = OneMonopolyEngine.dispatch(extraRoll.state, { type: 'END_TURN' });
    assert.equal(next.state.activePlayerIndex, 1);
    assert.equal(next.state.stormActive, false);
  });

  it('keeps the storm during unpaid rent and clears it on a bankruptcy handoff', () => {
    const game = OneMonopolyEngine.createGame('debt', players);
    game.opsDeck = ['OPS-02'];
    game.properties[3].ownerId = 'b';
    game.players[0].balance = 1;
    const draw = OneMonopolyEngine.dispatch(game, { type: 'ROLL_DICE', forcedDice: [2, 4] });
    assert.equal(draw.state.pendingDebt?.amount, 4);

    const blocked = OneMonopolyEngine.dispatch(draw.state, { type: 'END_TURN' });
    assert.equal(blocked.state.activePlayerIndex, 0);
    assert.equal(blocked.state.stormActive, true);
    const next = OneMonopolyEngine.dispatch(blocked.state, { type: 'DECLARE_BANKRUPTCY' });
    assert.equal(next.state.players[0].isBankrupt, true);
    assert.equal(next.state.activePlayerIndex, 1);
    assert.equal(next.state.stormActive, false);
  });

  it('ends storm weather when bankruptcy ends the game', () => {
    const game = OneMonopolyEngine.createGame('final-turn', players.slice(0, 2));
    game.stormActive = true;
    game.phase = 'AWAITING_DEBT_RESOLUTION';
    game.pendingDebt = { creditorId: 'b', amount: 4, reason: 'Port rent' };
    const result = OneMonopolyEngine.dispatch(game, { type: 'DECLARE_BANKRUPTCY' });
    assert.equal(result.state.winnerId, 'b');
    assert.equal(result.state.stormActive, false);
  });

  it('keeps clear weather on a non-storm draw from an older snapshot', () => {
    const game = OneMonopolyEngine.createGame('legacy', players);
    assert.equal(game.stormActive, false);
    delete game.stormActive;
    game.opsDeck = ['OPS-01'];
    const draw = OneMonopolyEngine.dispatch(game, { type: 'ROLL_DICE', forcedDice: [2, 4] });
    assert.equal(draw.state.players[0].position, 16);
    assert.equal(draw.state.stormActive ?? false, false);
  });
});
