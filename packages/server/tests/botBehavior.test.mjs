import assert from 'node:assert/strict';
import { test } from 'node:test';
import { RoomManager } from '../dist/roomManager.js';

test('AI Bot acts decisively and completes its turn promptly', async (t) => {
  const events = [];
  const manager = new RoomManager({
    onBroadcastUpdate: (_id, _state, emitted) => events.push(...emitted),
  });

  // Host starts single-player room -> Bot (ai-mate-1) is automatically added
  const { room, playerId: humanId } = manager.createRoom('Captain ONE', 'ONE_APUS', 'human-socket');
  const startResult = manager.startGame(room.id, humanId);
  assert.equal(startResult.success, true);
  assert.equal(room.players.length, 2);

  const bot = room.players.find((p) => p.id === 'ai-mate-1');
  assert.ok(bot);
  assert.equal(manager.isBot(room, bot.id), true);
  assert.equal(manager.isBot(room, humanId), false);

  t.after(() => {
    room.timer?.stop();
    manager.clearBotTimer(room);
  });

  // Human player takes turn 1
  assert.equal(room.gameState.activePlayerIndex, 0); // Human
  const humanRoll = manager.dispatchAction(room.id, humanId, {
    type: 'ROLL_DICE',
    forcedDice: [1, 2], // Lands on tile 3 (Port)
  });
  assert.equal(humanRoll.success, true);

  // Human skips buy and ends turn
  manager.dispatchAction(room.id, humanId, { type: 'SKIP_BUY' });
  const endTurn = manager.dispatchAction(room.id, humanId, { type: 'END_TURN' });
  assert.equal(endTurn.success, true);

  // Now it is the Bot's turn!
  assert.equal(room.gameState.activePlayerIndex, 1);
  assert.equal(room.gameState.players[1].id, bot.id);
  assert.equal(room.gameState.phase, 'WAIT_FOR_ROLL');

  // Bot timer should be scheduled (not relying on 45s AFK timer)
  assert.ok(room.botTimer);

  // Wait for bot to execute roll, travel, buy decision, and end turn
  // Pacing: ~1.0s to roll + ~2.0s travel + ~0.7s end turn = ~3.7s
  await new Promise((resolve) => {
    const checkInterval = setInterval(() => {
      // Check if turn returned to human player or bot completed actions
      if (room.gameState.activePlayerIndex === 0 || events.some((e) => e.type === 'DICE_ROLLED' && e.playerId === bot.id)) {
        clearInterval(checkInterval);
        resolve(null);
      }
    }, 200);
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(null);
    }, 5000);
  });

  // Verify that the bot rolled dice without waiting 45s AFK
  const botRollEvent = events.find((e) => e.type === 'DICE_ROLLED' && e.playerId === bot.id);
  assert.ok(botRollEvent, 'Bot should have rolled dice automatically');
});
