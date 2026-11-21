import { test } from 'node:test';
import assert from 'node:assert/strict';
import { OneMonopolyEngine as engine } from '@one-monopoly/shared';
import { getFreightBotAction as choose } from '../dist/freightBot.js';

function game() {
  const state = engine.createGame('routes', [{id:'pilot', name:'An', token:'ONE_APUS'}, {id:'human', name:'Bình', token:'PILOT_BOAT'}], 'logistics');
  state.logistics.market.tender = null;
  return state;
}
const step = state => {
  const next = engine.dispatch(state, choose(state), 'pilot').state;
  assert.notEqual(next, state);
  return next;
};

test('the pilot chooses a reefer for an immediate sailing, but dry freight when booking after the voyage', () => {
  const s = game();
  const immediate = choose(s);
  assert.equal(immediate.type, 'LOAD_CARGO');
  assert.equal(immediate.reefer, true);
  let arriving = step(step(s));
  arriving = step(arriving);
  assert.equal(arriving.players[0].lastDelivery.reeferBonus, 8);
  delete s.players[0].lastDelivery;
  s.phase = 'END_OF_TURN'; s.logistics.hasSailed = true;
  const preload = choose(s);
  assert.equal(preload.type, 'LOAD_CARGO');
  assert.notEqual(preload.reefer, true);
});

test('the pilot spends its one feeder sailing only when the due reefer has a confirmed receiver', () => {
  const s = game();
  s.players[0].position = 3;
  s.players[0].cargo = { bookingId: 1, originTileId: 0, destinationTileId: 1, kind: 'laden', reeferDueRound:s.turnCount };
  s.phase = 'END_OF_TURN'; s.logistics.hasSailed = true;
  assert.equal(choose(s).type, 'SAIL_FEEDER');
  let paid = step(s);
  assert.equal(paid.logistics.feederAvailable.pilot, false);
  paid = step(paid);
  assert.equal(paid.players[0].lastDelivery.reeferBonus, 8);
  s.logistics.ports[1].demand = 0;
  assert.notEqual(choose(s).type, 'SAIL_FEEDER');
});

test('a captain accepts a feasible return, loads it and receives the backhaul premium at the original berth', () => {
  let s = game();
  s.players[0].position = 1;
  s.players[0].lastDelivery = {bookingId:1, kind:'laden', originTileId:0, destinationTileId:1, tileId:1, reward:12, distanceNm:596};
  s.players[0].backhaul = {bookingId:1, originTileId:1, destinationTileId:0, offeredRound:1, deadlineRound:2, status:'offered'};
  s.cargoRevision = 3;
  assert.equal(choose(s).type, 'ACCEPT_BACKHAUL');
  for (let i=0; i<4; i++) s = step(s);
  assert.equal(s.players[0].lastBackhaul.status, 'fulfilled');
  assert.equal(s.players[0].lastDelivery.backhaulBonus, 6);
});

for (const work of ['tender', 'backhaul']) {
  test(`a nearby ${work} saves its deadline with the feeder and pays only on discharge`, () => {
    let s = game();
    s.turnCount = 2;
    s.phase = 'END_OF_TURN'; s.logistics.hasSailed = true;
    s.players[0].position = 3;
    s.players[0].cargo = {bookingId:12, originTileId:0, destinationTileId:1, kind:'laden'};
    if (work === 'tender') {
      s.logistics.ports[1].demand = 0;
      s.logistics.market.contract = {tenderId:1, playerId:'pilot', kind:'laden', destinationTileId:1, amount:11, deliveryRound:2, status:'active'};
    } else {
      s.players[0].backhaul = {bookingId:8, originTileId:0, destinationTileId:1, offeredRound:1, deadlineRound:2, status:'active'};
    }
    assert.equal(choose(s).type, 'SAIL_FEEDER');
    s = step(s);
    assert.equal(s.players[0].balance, 0);
    s = step(s);
    assert.equal(s.players[0].balance, work === 'tender' ? 23 : 18);
  });
}
