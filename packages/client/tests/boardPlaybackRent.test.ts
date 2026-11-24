import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { GameEvent } from '@one-monopoly/shared';
import { parseRentReceiptFromEvent } from '../src/components/useBoardPlayback.js';

describe('parseRentReceiptFromEvent', () => {
  const players = [
    { id: 'p1', name: 'Captain ONE' },
    { id: 'p2', name: 'Chief Magenta' },
    { id: 'p3', name: 'Pilot Third' },
  ];

  it('parses ordinary DEMURRAGE_PAID event into 2 lines (deduct and credit)', () => {
    const event: GameEvent = {
      type: 'DEMURRAGE_PAID',
      debtorId: 'p1',
      creditorId: 'p2',
      tileId: 3,
      amount: 60,
    };

    const receipt = parseRentReceiptFromEvent(event, players);
    assert.ok(receipt);
    assert.equal(receipt.tileId, 3);
    assert.equal(receipt.lines.length, 2);

    assert.deepEqual(receipt.lines[0], {
      playerId: 'p1',
      playerName: 'Captain ONE',
      amount: 60,
      type: 'deduct',
    });

    assert.deepEqual(receipt.lines[1], {
      playerId: 'p2',
      playerName: 'Chief Magenta',
      amount: 60,
      type: 'credit',
    });
  });

  it('parses SLOT_CHARTER_RENT_SPLIT event into 3 lines (visitor deduct, owner credit, partner credit)', () => {
    const event: GameEvent = {
      type: 'SLOT_CHARTER_RENT_SPLIT',
      visitorId: 'p3',
      ownerId: 'p2',
      partnerId: 'p1',
      tileId: 9,
      splitAmount: 25,
      ownerAmount: 25,
    };

    const receipt = parseRentReceiptFromEvent(event, players);
    assert.ok(receipt);
    assert.equal(receipt.tileId, 9);
    assert.equal(receipt.lines.length, 3);

    // Visitor deducted full 50
    assert.deepEqual(receipt.lines[0], {
      playerId: 'p3',
      playerName: 'Pilot Third',
      amount: 50,
      type: 'deduct',
    });

    // Owner credited 25
    assert.deepEqual(receipt.lines[1], {
      playerId: 'p2',
      playerName: 'Chief Magenta',
      amount: 25,
      type: 'credit',
    });

    // Partner credited 25
    assert.deepEqual(receipt.lines[2], {
      playerId: 'p1',
      playerName: 'Captain ONE',
      amount: 25,
      type: 'credit',
    });
  });

  it('parses PASSED_GO event into credit line at tile 0', () => {
    const event: GameEvent = {
      type: 'PASSED_GO',
      playerId: 'p1',
      reward: 200,
    };
    const receipt = parseRentReceiptFromEvent(event, players);
    assert.ok(receipt);
    assert.equal(receipt.tileId, 0);
    assert.deepEqual(receipt.lines[0], {
      playerId: 'p1',
      playerName: 'Captain ONE',
      amount: 200,
      type: 'credit',
    });
  });

  it('parses TAX_PAID and PROPERTY_TAKEOVER events', () => {
    const taxEvt: GameEvent = {
      type: 'TAX_PAID',
      playerId: 'p2',
      tileId: 21,
      amount: 100,
    };
    const taxReceipt = parseRentReceiptFromEvent(taxEvt, players);
    assert.ok(taxReceipt);
    assert.equal(taxReceipt.tileId, 21);
    assert.equal(taxReceipt.lines[0].type, 'deduct');
    assert.equal(taxReceipt.lines[0].amount, 100);

    const takeoverEvt: GameEvent = {
      type: 'PROPERTY_TAKEOVER',
      tileId: 5,
      previousOwnerId: 'p2',
      newOwnerId: 'p1',
      price: 130,
    };
    const toReceipt = parseRentReceiptFromEvent(takeoverEvt, players);
    assert.ok(toReceipt);
    assert.equal(toReceipt.tileId, 5);
    assert.equal(toReceipt.lines.length, 2);
    assert.equal(toReceipt.lines[0].playerId, 'p1');
    assert.equal(toReceipt.lines[0].type, 'deduct');
    assert.equal(toReceipt.lines[1].playerId, 'p2');
    assert.equal(toReceipt.lines[1].type, 'credit');
  });

  it('returns null for unrelated events', () => {
    const event: GameEvent = {
      type: 'DICE_ROLLED',
      playerId: 'p1',
      dice: [1, 2],
      isDouble: false,
    };
    assert.equal(parseRentReceiptFromEvent(event, players), null);
  });
});
