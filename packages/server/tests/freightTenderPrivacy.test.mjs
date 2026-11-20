import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { test } from 'node:test';
import { io as connect } from 'socket.io-client';
import { RoomManager } from '../dist/roomManager.js';
import { gameStateForPlayer, setupSocketServer } from '../dist/socketServer.js';

function bid(state, amount) {
  return {
    type: 'BID_FREIGHT_TENDER', tenderId: state.logistics.market.tender.id,
    revision: state.cargoRevision, amount,
  };
}

function visibleBids(snapshot, entrants, mine) {
  const tender = snapshot.logistics.market.tender;
  assert.deepEqual(tender.bids, mine);
  assert.deepEqual([...tender.bidderIds].sort(), [...entrants].sort());
  assert.equal(tender.bidCount, entrants.length);
}

test('socket dispatch hides prices even before serialization and rejected bids leave deadlines intact', t => {
  t.mock.timers.enable({ apis: ['setInterval', 'setTimeout'] });
  const updates = [];
  const manager = new RoomManager({ onBroadcastUpdate: (_id, _state, events) => updates.push(events) });
  const { room, playerId } = manager.createRoom('Linh', 'ONE_APUS', 'captain');
  manager.startGame(room.id, playerId);
  t.after(() => { room.timer?.stop(); manager.clearBotTimer(room); });
  const bot = room.players[1].id;
  const send = (actor, action) => manager.dispatchSocketAction('captain', { roomId: room.id, playerId: actor, action });
  const initialBid = bid(room.gameState, 12);
  t.mock.timers.tick(2000);
  const amount = send(playerId, initialBid);
  assert.ok(amount.success, amount.error);
  visibleBids(amount.state, [playerId], { [playerId]: 12 });
  assert.equal(room.timer.getRemainingSeconds(), 43);
  const afterBid = room.gameState;
  const updateCount = updates.length;
  for (const invalid of [initialBid, { ...bid(afterBid, 12), tenderId: -1 }, bid(afterBid, NaN)]) {
    assert.equal(send(playerId, invalid).success, false);
    assert.equal(room.gameState, afterBid);
    assert.equal(updates.length, updateCount);
    assert.equal(room.timer.getRemainingSeconds(), 43);
  }
  const amended = send(playerId, bid(afterBid, 14));
  assert.ok(amended.success);
  visibleBids(amended.state, [playerId], { [playerId]: 14 });
  visibleBids(gameStateForPlayer(room.gameState, bot), [playerId], {});
  visibleBids(gameStateForPlayer(room.gameState, undefined), [playerId], {});
  assert.deepEqual(amended.events, [{ type: 'FREIGHT_TENDER_BID', tenderId: initialBid.tenderId, playerId }]);
  const handover = send(playerId, { type: 'END_TURN' });
  assert.ok(handover.success);
  const timer = room.botTimer;
  assert.ok(timer);
  const state = room.gameState;
  const writes = updates.length;
  t.mock.timers.tick(1000);
  for (const actor of [playerId, bot]) {
    const refused = send(actor, bid(state, 8));
    assert.equal(refused.success, false);
    assert.equal(refused.state, undefined);
    assert.equal(room.botTimer, timer);
    assert.equal(room.gameState, state);
    assert.equal(room.timer.getRemainingSeconds(), 44);
    assert.equal(updates.length, writes);
  }
  t.mock.timers.tick(801);
  assert.notEqual(room.gameState, state, 'bot still acts on the originally scheduled deadline');
});

test('sealed prices stay private on live broadcasts, raw acknowledgements and reconnect, including for the host', async t => {
  const httpServer = createServer();
  try {
    await new Promise((resolve, reject) => httpServer.once('error', reject).listen(0, '127.0.0.1', resolve));
  } catch (error) {
    if (error.code === 'EPERM' || error.code === 'EACCES') return t.skip('Local network listener unavailable');
    throw error;
  }
  const { io, roomManager } = setupSocketServer(httpServer);
  const connected = [];
  let room;
  t.after(async () => {
    room?.timer?.stop();
    connected.forEach(client => client.disconnect());
    await io.close();
  });
  const next = (client, event) => once(client, event, { signal: AbortSignal.timeout(5000) }).then(([packet]) => packet);
  const request = (client, event, data) => client.timeout(5000).emitWithAck(event, data);
  async function open() {
    const client = connect('http://127.0.0.1:' + httpServer.address().port, { autoConnect: false, transports: ['websocket'], reconnection: false });
    connected.push(client);
    const ready = next(client, 'connect');
    client.connect();
    await ready;
    return client;
  }
  let host = await open();
  const rival = await open();
  const bystander = await open();
  const captain = await request(host, 'room:create', { playerName: 'Linh', token: 'ONE_APUS' });
  const { roomId, playerId: first } = captain;
  const second = (await request(rival, 'room:join', { roomId, playerName: 'Minh', token: 'PILOT_BOAT' })).playerId;
  const third = (await request(bystander, 'room:join', { roomId, playerName: 'An', token: 'GANTRY_CRANE' })).playerId;
  room = roomManager.getRoom(roomId);
  const occupants = () => [[host, first], [rival, second], [bystander, third]];
  const action = (client, playerId, command) => request(client, 'game:action', { roomId, playerId, action: command });
  async function broadcast(requestAction) {
    const [packets, ack] = await Promise.all([Promise.all(occupants().map(([client]) => next(client, 'game:update'))), requestAction()]);
    assert.ok(ack.success, ack.error);
    for (const packet of packets) assert.deepEqual(packet.events, packets[0].events);
    return { packets, ack };
  }
  await broadcast(() => request(host, 'room:start', { roomId, playerId: first }));
  const one = await broadcast(() => action(host, first, bid(room.gameState, 12)));
  const firstBid = { [first]: 12 };
  visibleBids(one.packets[0].state, [first], firstBid);
  visibleBids(one.packets[1].state, [first], {});
  visibleBids(one.packets[2].state, [first], {});
  visibleBids(one.ack.state, [first], firstBid);
  assert.deepEqual(one.ack.events, [{
    type: 'FREIGHT_TENDER_BID', playerId: first, tenderId: room.gameState.logistics.market.tender.id,
  }]);
  const wait = await broadcast(() => action(host, first, { type: 'END_TURN' }));
  visibleBids(wait.packets[1].state, [first], {});
  const two = await broadcast(() => action(rival, second, bid(room.gameState, 8)));
  const entrants = [first, second];
  visibleBids(two.packets[0].state, entrants, firstBid);
  visibleBids(two.packets[1].state, entrants, { [second]: 8 });
  visibleBids(two.packets[2].state, entrants, {});
  visibleBids(two.ack.state, entrants, { [second]: 8 });
  assert.deepEqual(two.ack.events, [{
    type: 'FREIGHT_TENDER_BID', playerId: second, tenderId: room.gameState.logistics.market.tender.id,
  }]);
  assert.deepEqual(room.gameState.logistics.market.tender.bids, { [first]: 12, [second]: 8 });

  const oldHost = host;
  const oldUpdates = [];
  oldHost.on('game:update', packet => oldUpdates.push(packet));
  host = await open();
  const [init, resumed] = await Promise.all([
    next(host, 'game:init'),
    request(host, 'room:join', { roomId, playerName: 'Linh', token: 'ONE_APUS', sessionToken: captain.sessionToken }),
  ]);
  assert.ok(resumed.isReconnect);
  visibleBids(init.state, entrants, firstBid);
  assert.deepEqual(resumed.gameState, init.state);
  assert.equal(JSON.stringify(resumed.room).includes('"bids"'), false);
  assert.equal((await action(oldHost, first, bid(room.gameState, 8))).success, false);
  assert.equal((await action(host, second, bid(room.gameState, 8))).success, false);
  assert.equal((await action(bystander, third, bid(room.gameState, 8))).success, false);
  const unauthorizedJoin = await request(oldHost, 'room:join', { roomId, playerName: 'Minh', token: 'PILOT_BOAT' });
  assert.equal(unauthorizedJoin.success, false);
  assert.equal(unauthorizedJoin.gameState, undefined);

  await broadcast(() => action(rival, second, { type: 'END_TURN' }));
  const settled = await broadcast(() => action(bystander, third, { type: 'END_TURN' }));
  for (const packet of [...settled.packets, settled.ack]) {
    visibleBids(packet.state, [], {});
    const market = packet.state.logistics.market;
    assert.equal(market.contract.playerId, second);
    assert.equal(market.contract.amount, 8);
    const award = packet.events.find(e => e.type === 'FREIGHT_TENDER_AWARDED');
    assert.deepEqual(award, {
      type: 'FREIGHT_TENDER_AWARDED', tenderId: 1, deliveryRound: 2, playerId: second,
      kind: market.contract.kind, destinationTileId: market.contract.destinationTileId, amount: 8,
    });
    assert.equal(JSON.stringify({ contract: market.contract, history: market.history, award }).includes(first), false);
    assert.equal(JSON.stringify({ contract: market.contract, history: market.history, award }).includes('"bids"'), false);
  }
  // An acknowledgement on the superseded socket is ordered after any unintended broadcasts to it.
  assert.equal((await action(oldHost, first, { type: 'END_TURN' })).success, false);
  assert.deepEqual(oldUpdates, []);
});
