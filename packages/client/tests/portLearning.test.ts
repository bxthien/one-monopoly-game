import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { BOARD_TILES, OneMonopolyEngine, type GameState } from '@one-monopoly/shared';
import { readPortLanding } from '../src/components/ports/portArrival.js';
import { portGuide } from '../src/components/ports/portGuide.js';
import { portModels } from '../src/components/ports/portModels.js';

describe('port atlas and miniature catalog', () => {
  it('covers the 17 port deeds and Singapore GO, and no other board spaces', () => {
    const deeds = BOARD_TILES.filter(tile => tile.type === 'PORT');
    assert.equal(deeds.length, 17);
    const codes = [...deeds.map(tile => tile.code), 'SGSIN'].sort();
    assert.equal(BOARD_TILES.find(tile => tile.code === 'SGSIN')?.type, 'GO');
    assert.deepEqual(Object.keys(portGuide).sort(), codes);
    assert.deepEqual(Object.keys(portModels).sort(), codes);
    for (const code of codes) {
      const guide = portGuide[code];
      assert.equal(guide.code, code);
      assert.ok([guide.name, guide.country, guide.fact, portModels[code].label].every(text => text.trim()), code);
      assert.ok(Math.abs(guide.latitude) <= 90 && Math.abs(guide.longitude) <= 180, code);
    }
  });

  it('places representative ports near their waterfronts on both sides of the equator and prime meridian', () => {
    const referencePoints = [
      ['SGSIN', 1.26, 103.85], ['BRSSZ', -23.96, -46.30], ['USLAX', 33.74, -118.27],
      ['ESVLC', 39.45, -.32], ['DEHAM', 53.53, 9.96], ['JPTYO', 35.62, 139.79],
    ] as const;
    for (const [code, latitude, longitude] of referencePoints) {
      const port = portGuide[code];
      assert.ok(Math.abs(port.latitude - latitude) < .25 && Math.abs(port.longitude - longitude) < .25, code);
    }
  });

  it('renders a different raised landmark within each quay’s model bounds', () => {
    const signatures = new Set<string>();
    for (const [code, model] of Object.entries(portModels)) {
      const raisedVertices = new Set<string>();
      for (const face of model.faces) {
        assert.ok(face.points.length >= 3, code);
        assert.match(face.color, /^#(?:[\da-f]{3}|[\da-f]{6})$/i, code);
        for (const [x, y, z] of face.points) {
          assert.ok(Math.abs(x) <= 5 && Math.abs(y) <= 5 && z >= -.5 && z <= 8, code);
          if (z > 0) raisedVertices.add([x, y, z].join(','));
        }
      }
      assert.ok(raisedVertices.size > 3, code);
      // Ignore materials, face order and the shared quay when checking for duplicate landmarks.
      const signature = [...raisedVertices].sort().join('|');
      assert.ok(!signatures.has(signature), `${code} reuses another port's geometry`);
      signatures.add(signature);
    }
  });
});

function gameAt(tile: number) {
  const game = OneMonopolyEngine.createGame('atlas', [
    { id: 'captain', name: 'Linh', token: 'ONE_APUS' },
    { id: 'pilot', name: 'Minh', token: 'PILOT_BOAT' },
  ]);
  game.players[0].position = tile;
  return game;
}

function roll(game: GameState, dice: [number, number]) {
  return OneMonopolyEngine.dispatch(game, { type: 'ROLL_DICE', forcedDice: dice });
}

describe('port arrivals', () => {
  it('follows the whole card relocation from Los Angeles via a market space to Singapore', () => {
    const game = gameAt(23);
    game.marketDeck = ['MKT-04'];
    const { state, events } = roll(game, [1, 2]);
    assert.deepEqual(events.filter(event => event.type === 'SHIP_STEPPED').map(step => step.to), [26, 0]);
    const arrival = readPortLanding(state, events);
    assert.ok(arrival);
    assert.equal(arrival.playerName, 'Linh');
    assert.equal(arrival.origin?.code, 'USLAX');
    assert.equal(arrival.port.code, 'SGSIN');
  });

  it('allows a port destination even when the departure space has no atlas entry', () => {
    const { state, events } = roll(gameAt(4), [1, 2]);
    const arrival = readPortLanding(state, events);
    assert.ok(arrival);
    assert.equal(arrival.port.code, 'AEJEA');
    assert.equal(arrival.origin, undefined);
  });

  it('clears the chart when a card transfers the moving ship to customs in the same batch', () => {
    const game = gameAt(3);
    game.opsDeck = ['OPS-03'];
    const { state, events } = roll(game, [1, 2]);
    assert.ok(events.some(event => event.type === 'SHIP_STEPPED'));
    assert.ok(events.some(event => event.type === 'SENT_TO_HOLD'));
    assert.ok(state.players[0].inHold);
    assert.equal(readPortLanding(state, events), null);
  });

  it('clears on a service-line landing after passing Singapore', () => {
    const { state, events } = roll(gameAt(31), [2, 3]);
    assert.ok(events.some(event => event.type === 'PASSED_GO'));
    assert.equal(BOARD_TILES[state.players[0].position].type, 'SERVICE_LINE');
    assert.equal(readPortLanding(state, events), null);
  });

  it('clears on a dice roll without movement in customs', () => {
    const game = gameAt(8);
    game.players[0].inHold = true;
    const { state, events } = roll(game, [1, 2]);
    assert.ok(events.some(event => event.type === 'DICE_ROLLED'));
    assert.ok(!events.some(event => event.type === 'SHIP_STEPPED'));
    assert.equal(readPortLanding(state, events), null);
  });

  it('preserves an open chart through empty updates and property purchases', () => {
    const { state, events } = roll(gameAt(0), [1, 2]);
    assert.equal(readPortLanding(state, events)?.port.code, 'VNVUT');
    const purchase = OneMonopolyEngine.dispatch(state, { type: 'BUY_PROPERTY' });
    assert.ok(purchase.events.some(event => event.type === 'TILE_PURCHASED'));
    assert.equal(readPortLanding(purchase.state, purchase.events), undefined);
    assert.equal(readPortLanding(purchase.state, []), undefined);
  });

  it('drops a landing when the authoritative player position has already changed', () => {
    const { state, events } = roll(gameAt(0), [1, 2]);
    state.players[0].position = 8;
    assert.equal(readPortLanding(state, events), null);
  });
});
