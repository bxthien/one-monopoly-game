import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { OneMonopolyEngine } from '@one-monopoly/shared';
import { buildTravelFrames, type TravelFrame } from '../src/components/boardTravel.js';

function rollFrom(tile: number, dice: [number, number]) {
  const game = OneMonopolyEngine.createGame('chart', [
    { id: 'captain', name: 'Captain', token: 'ONE_APUS' },
    { id: 'pilot', name: 'Pilot', token: 'PILOT_BOAT' },
  ]);
  game.players[0].position = tile;
  game.opsDeck = ['OPS-02']; // Move back three spaces.
  game.marketDeck = ['MKT-04']; // Go directly to Singapore.
  return OneMonopolyEngine.dispatch(game, { type: 'ROLL_DICE', forcedDice: dice }).events;
}

const poses = (frames: TravelFrame[]) => frames.map(({ tile, heading }) => [tile, heading]);

describe('board travel playback', () => {
  it('travels clockwise and turns at the corner before leaving it', () => {
    const frames = buildTravelFrames({ tile: 7, heading: 270 }, 'captain', rollFrom(7, [1, 2]));

    assert.deepEqual(poses(frames), [[7, 270], [8, 270], [8, 0], [9, 0], [10, 0]]);
  });

  it('passes through GO exactly once and turns up the left side', () => {
    const frames = buildTravelFrames({ tile: 30, heading: 180 }, 'captain', rollFrom(30, [1, 2]));

    assert.deepEqual(poses(frames), [[30, 180], [31, 180], [0, 180], [0, 270], [1, 270]]);
  });

  it('completes the roll before following a backward card around a corner', () => {
    const frames = buildTravelFrames({ tile: 16, heading: 90 }, 'captain', rollFrom(16, [1, 1]));

    assert.deepEqual(poses(frames), [
      [16, 90], [17, 90], [18, 90], [18, 270], [17, 270], [16, 270], [16, 180], [15, 180],
    ]);
  });

  it('moves directly from the card space to its named destination', () => {
    const frames = buildTravelFrames({ tile: 23, heading: 90 }, 'captain', rollFrom(23, [1, 2]));

    assert.deepEqual(poses(frames), [[23, 90], [24, 90], [24, 180], [25, 180], [26, 180], [0, 270]]);
    assert.deepEqual(frames.filter((frame) => frame.gliding).map((frame) => frame.tile), [24, 25, 26]);
  });

  it('visits the go-to-hold space before transferring directly to customs', () => {
    const frames = buildTravelFrames({ tile: 21, heading: 90 }, 'captain', rollFrom(21, [1, 2]));

    assert.deepEqual(poses(frames), [[21, 90], [22, 90], [23, 90], [24, 90], [8, 0]]);
    assert.deepEqual(frames.filter((frame) => frame.gliding).map((frame) => frame.tile), [22, 23, 24]);
  });

  it('leaves the observing player in place during the other player’s roll and transfer', () => {
    assert.deepEqual(buildTravelFrames({ tile: 21, heading: 90 }, 'pilot', rollFrom(21, [1, 2])), []);
  });
});
