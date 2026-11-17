import {
  BoardTile,
  CardEffect,
  EngineResult,
  GameAction,
  GameCard,
  GameEvent,
  GameState,
  LoopGroup,
  Player,
  PropertyState,
  VesselToken,
} from './types.js';
import {
  BOARD_TILES,
  GAME_CARDS,
  GO_REWARD,
  GO_TO_HOLD_TILE_INDEX,
  HOLD_FINE_AMOUNT,
  HOLD_TILE_INDEX,
  INFRA_TILES,
  LOOP_GROUPS_CONFIG,
  MAX_HOLD_TURNS,
  SERVICE_LINES,
  STARTING_BALANCE,
} from './boardData.js';

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export class OneMonopolyEngine {
  public static createGame(
    roomId: string,
    playersData: Array<{ id: string; name: string; token: VesselToken }>
  ): GameState {
    const players: Player[] = playersData.map((p) => ({
      id: p.id,
      name: p.name,
      token: p.token,
      balance: STARTING_BALANCE,
      position: 0,
      inHold: false,
      holdTurns: 0,
      customsClearancePasses: 0,
      isBankrupt: false,
      isOnline: true,
    }));

    const properties: Record<number, PropertyState> = {};
    for (const tile of BOARD_TILES) {
      if (tile.type === 'PORT' || tile.type === 'SERVICE_LINE' || tile.type === 'INFRA') {
        properties[tile.id] = {
          ownerId: null,
          containerLevel: 0,
          isMortgaged: false,
        };
      }
    }

    const marketCardIds = shuffle(
      GAME_CARDS.filter((c) => c.type === 'MARKET').map((c) => c.id)
    );
    const opsCardIds = shuffle(
      GAME_CARDS.filter((c) => c.type === 'OPS').map((c) => c.id)
    );

    return {
      roomId,
      players,
      activePlayerIndex: 0,
      properties,
      phase: 'WAIT_FOR_ROLL',
      dice: [1, 1],
      consecutiveDoubles: 0,
      hasRolled: false,
      marketDeck: marketCardIds,
      opsDeck: opsCardIds,
      pendingDebt: null,
      winnerId: null,
      turnCount: 1,
      gameStarted: true,
    };
  }

  public static dispatch(state: GameState, action: GameAction): EngineResult {
    // If game has ended, reject further actions
    if (state.winnerId !== null) {
      return { state, events: [] };
    }

    const nextState: GameState = JSON.parse(JSON.stringify(state));
    const events: GameEvent[] = [];
    const activePlayer = nextState.players[nextState.activePlayerIndex];

    switch (action.type) {
      case 'ROLL_DICE':
        OneMonopolyEngine.handleRollDice(nextState, events, activePlayer, action.forcedDice);
        break;

      case 'BUY_PROPERTY':
        OneMonopolyEngine.handleBuyProperty(nextState, events, activePlayer);
        break;

      case 'SKIP_BUY':
        OneMonopolyEngine.handleSkipBuy(nextState, events, activePlayer);
        break;

      case 'BUILD_CONTAINER':
        OneMonopolyEngine.handleBuildContainer(nextState, events, activePlayer, action.tileId);
        break;

      case 'SELL_CONTAINER':
        OneMonopolyEngine.handleSellContainer(nextState, events, activePlayer, action.tileId);
        break;

      case 'MORTGAGE_TILE':
        OneMonopolyEngine.handleMortgageTile(nextState, events, activePlayer, action.tileId);
        break;

      case 'UNMORTGAGE_TILE':
        OneMonopolyEngine.handleUnmortgageTile(nextState, events, activePlayer, action.tileId);
        break;

      case 'PAY_HOLD_FINE':
        OneMonopolyEngine.handlePayHoldFine(nextState, events, activePlayer);
        break;

      case 'USE_CLEARANCE_PASS':
        OneMonopolyEngine.handleUseClearancePass(nextState, events, activePlayer);
        break;

      case 'SETTLE_DEBT':
        OneMonopolyEngine.handleSettleDebt(nextState, events, activePlayer);
        break;

      case 'DECLARE_BANKRUPTCY':
        OneMonopolyEngine.handleDeclareBankruptcy(nextState, events, activePlayer);
        break;

      case 'END_TURN':
        OneMonopolyEngine.handleEndTurn(nextState, events, activePlayer);
        break;
    }

    return { state: nextState, events };
  }

  // ======================== ACTION HANDLERS ======================== //

  private static handleRollDice(
    state: GameState,
    events: GameEvent[],
    player: Player,
    forcedDice?: [number, number]
  ): void {
    if (state.phase !== 'WAIT_FOR_ROLL' || state.hasRolled) {
      return;
    }

    const d1 = forcedDice ? forcedDice[0] : Math.floor(Math.random() * 6) + 1;
    const d2 = forcedDice ? forcedDice[1] : Math.floor(Math.random() * 6) + 1;
    const dice: [number, number] = [d1, d2];
    const isDouble = d1 === d2;
    state.dice = dice;
    state.hasRolled = true;

    events.push({
      type: 'DICE_ROLLED',
      playerId: player.id,
      dice,
      isDouble,
    });

    // 1. If currently in CUSTOMS_HOLD
    if (player.inHold) {
      if (isDouble) {
        player.inHold = false;
        player.holdTurns = 0;
        state.consecutiveDoubles = 0;
        events.push({
          type: 'RELEASED_FROM_HOLD',
          playerId: player.id,
          method: 'DICE_DOUBLE',
        });
        OneMonopolyEngine.movePlayerSteps(state, events, player, d1 + d2);
      } else {
        player.holdTurns++;
        if (player.holdTurns >= MAX_HOLD_TURNS) {
          // Mandatory exit: pay $50M fine
          if (player.balance >= HOLD_FINE_AMOUNT) {
            player.balance -= HOLD_FINE_AMOUNT;
            player.inHold = false;
            player.holdTurns = 0;
            events.push({
              type: 'TAX_PAID',
              playerId: player.id,
              tileId: HOLD_TILE_INDEX,
              amount: HOLD_FINE_AMOUNT,
            });
            events.push({
              type: 'RELEASED_FROM_HOLD',
              playerId: player.id,
              method: 'FINE',
            });
            OneMonopolyEngine.movePlayerSteps(state, events, player, d1 + d2);
          } else {
            // Must create debt to bank
            player.inHold = false;
            player.holdTurns = 0;
            events.push({
              type: 'RELEASED_FROM_HOLD',
              playerId: player.id,
              method: 'FINE',
            });
            OneMonopolyEngine.createDebt(
              state,
              events,
              player.id,
              'BANK',
              HOLD_FINE_AMOUNT,
              'Phí lưu bãi bắt buộc sau 3 lượt kẹt cảng'
            );
            OneMonopolyEngine.movePlayerSteps(state, events, player, d1 + d2, false);
          }
        } else {
          // Still in hold
          state.phase = 'END_OF_TURN';
        }
      }
      return;
    }

    // 2. Normal movement
    if (isDouble) {
      state.consecutiveDoubles++;
      if (state.consecutiveDoubles === 3) {
        OneMonopolyEngine.sendToHold(state, events, player, 'Tung xúc xắc đôi 3 lần liên tiếp');
        state.phase = 'END_OF_TURN';
        return;
      }
    } else {
      state.consecutiveDoubles = 0;
    }

    OneMonopolyEngine.movePlayerSteps(state, events, player, d1 + d2);
  }

  private static movePlayerSteps(
    state: GameState,
    events: GameEvent[],
    player: Player,
    steps: number,
    resolveLanding = true
  ): void {
    const from = player.position;
    let to = (from + steps) % 40;
    if (to < 0) to += 40;

    // Check passing GO (if stepped forward and wrapped around)
    if (steps > 0 && to < from) {
      player.balance += GO_REWARD;
      events.push({
        type: 'PASSED_GO',
        playerId: player.id,
        reward: GO_REWARD,
      });
      events.push({
        type: 'BALANCE_CHANGED',
        playerId: player.id,
        newBalance: player.balance,
        delta: GO_REWARD,
        reason: 'Đi qua Singapore Global Hub',
      });
    }

    player.position = to;
    events.push({
      type: 'SHIP_STEPPED',
      playerId: player.id,
      from,
      to,
    });

    if (resolveLanding) {
      OneMonopolyEngine.resolveTileLanding(state, events, player, to);
    }
  }

  private static resolveTileLanding(
    state: GameState,
    events: GameEvent[],
    player: Player,
    tileId: number
  ): void {
    const tile = BOARD_TILES[tileId];

    switch (tile.type) {
      case 'GO':
      case 'CUSTOMS_HOLD':
      case 'FREE_ANCHOR':
        OneMonopolyEngine.finishStepPhase(state);
        break;

      case 'GO_TO_HOLD':
        OneMonopolyEngine.sendToHold(state, events, player, 'Lệnh Giữ Tàu Kiểm Hóa (Ô 30)');
        state.phase = 'END_OF_TURN';
        break;

      case 'TAX': {
        const amount = tile.taxAmount || 100;
        if (player.balance >= amount) {
          player.balance -= amount;
          events.push({
            type: 'TAX_PAID',
            playerId: player.id,
            tileId,
            amount,
          });
          events.push({
            type: 'BALANCE_CHANGED',
            playerId: player.id,
            newBalance: player.balance,
            delta: -amount,
            reason: tile.name,
          });
          OneMonopolyEngine.finishStepPhase(state);
        } else {
          OneMonopolyEngine.createDebt(state, events, player.id, 'BANK', amount, tile.name, tileId);
        }
        break;
      }

      case 'MARKET_CARD':
      case 'OPS_CARD':
        OneMonopolyEngine.drawCard(state, events, player, tile.type === 'MARKET_CARD' ? 'MARKET' : 'OPS');
        break;

      case 'PORT':
      case 'SERVICE_LINE':
      case 'INFRA': {
        const prop = state.properties[tileId];
        if (!prop || prop.ownerId === null) {
          // Unowned: allow buy decision
          if (tile.price && player.balance >= tile.price) {
            state.phase = 'AWAITING_BUY_DECISION';
          } else {
            OneMonopolyEngine.finishStepPhase(state);
          }
        } else if (prop.ownerId === player.id) {
          // Already owned by this player
          OneMonopolyEngine.finishStepPhase(state);
        } else {
          // Owned by another player: calculate rent/demurrage
          if (prop.isMortgaged) {
            // Mortgaged: 0 rent
            OneMonopolyEngine.finishStepPhase(state);
          } else {
            const rent = OneMonopolyEngine.calculateRent(state, tileId, state.dice);
            const owner = state.players.find((p) => p.id === prop.ownerId);
            if (!owner || owner.isBankrupt) {
              OneMonopolyEngine.finishStepPhase(state);
              return;
            }

            if (player.balance >= rent) {
              player.balance -= rent;
              owner.balance += rent;
              events.push({
                type: 'DEMURRAGE_PAID',
                debtorId: player.id,
                creditorId: owner.id,
                tileId,
                amount: rent,
              });
              events.push({
                type: 'BALANCE_CHANGED',
                playerId: player.id,
                newBalance: player.balance,
                delta: -rent,
                reason: `Tiền lưu bãi tại ${tile.name}`,
              });
              events.push({
                type: 'BALANCE_CHANGED',
                playerId: owner.id,
                newBalance: owner.balance,
                delta: rent,
                reason: `Thu tiền lưu bãi từ ${player.name}`,
              });
              OneMonopolyEngine.finishStepPhase(state);
            } else {
              OneMonopolyEngine.createDebt(
                state,
                events,
                player.id,
                owner.id,
                rent,
                `Tiền lưu bãi tại ${tile.name}`,
                tileId
              );
            }
          }
        }
        break;
      }
    }
  }

  public static calculateRent(state: GameState, tileId: number, dice: [number, number]): number {
    const tile = BOARD_TILES[tileId];
    const prop = state.properties[tileId];
    if (!prop || !prop.ownerId || prop.isMortgaged) return 0;

    const ownerId = prop.ownerId;

    if (tile.type === 'PORT') {
      if (!tile.rentTiers) return 0;
      if (prop.containerLevel > 0) {
        return tile.rentTiers[prop.containerLevel] || 0;
      }
      // Check monopoly (all ports in loop owned by same player and none mortgaged)
      const groupConfig = LOOP_GROUPS_CONFIG[tile.group!];
      const ownsAll = groupConfig.tileIds.every(
        (id) => state.properties[id]?.ownerId === ownerId
      );
      if (ownsAll) {
        return tile.rentTiers[0] * 2;
      }
      return tile.rentTiers[0];
    }

    if (tile.type === 'SERVICE_LINE') {
      const ownedLinesCount = SERVICE_LINES.filter(
        (id) => state.properties[id]?.ownerId === ownerId
      ).length;
      return 25 * Math.pow(2, ownedLinesCount - 1);
    }

    if (tile.type === 'INFRA') {
      const ownedInfraCount = INFRA_TILES.filter(
        (id) => state.properties[id]?.ownerId === ownerId
      ).length;
      const diceSum = dice[0] + dice[1];
      const multiplier = ownedInfraCount >= 2 ? 10 : 4;
      return diceSum * multiplier;
    }

    return 0;
  }

  private static drawCard(
    state: GameState,
    events: GameEvent[],
    player: Player,
    type: 'MARKET' | 'OPS'
  ): void {
    const deck = type === 'MARKET' ? state.marketDeck : state.opsDeck;
    if (deck.length === 0) {
      OneMonopolyEngine.finishStepPhase(state);
      return;
    }

    const cardId = deck.shift()!;
    // Place drawn card at the bottom of the deck
    deck.push(cardId);

    const card = GAME_CARDS.find((c) => c.id === cardId);
    if (!card) {
      OneMonopolyEngine.finishStepPhase(state);
      return;
    }

    events.push({
      type: 'CARD_DRAWN',
      playerId: player.id,
      card,
    });

    OneMonopolyEngine.applyCardEffect(state, events, player, card.effect);
  }

  private static applyCardEffect(
    state: GameState,
    events: GameEvent[],
    player: Player,
    effect: CardEffect
  ): void {
    switch (effect.type) {
      case 'CASH': {
        const amount = effect.amount || 0;
        if (amount >= 0) {
          player.balance += amount;
          events.push({
            type: 'BALANCE_CHANGED',
            playerId: player.id,
            newBalance: player.balance,
            delta: amount,
            reason: 'Thẻ bài thưởng tiền',
          });
          OneMonopolyEngine.finishStepPhase(state);
        } else {
          const fine = Math.abs(amount);
          if (player.balance >= fine) {
            player.balance -= fine;
            events.push({
              type: 'TAX_PAID',
              playerId: player.id,
              tileId: player.position,
              amount: fine,
            });
            events.push({
              type: 'BALANCE_CHANGED',
              playerId: player.id,
              newBalance: player.balance,
              delta: -fine,
              reason: 'Thẻ bài phạt tiền',
            });
            OneMonopolyEngine.finishStepPhase(state);
          } else {
            OneMonopolyEngine.createDebt(
              state,
              events,
              player.id,
              'BANK',
              fine,
              'Thẻ bài phạt tiền'
            );
          }
        }
        break;
      }

      case 'MOVE_TO': {
        const targetTile = effect.targetTile ?? 0;
        if (targetTile < player.position && targetTile !== 0) {
          // Passed GO
          player.balance += GO_REWARD;
          events.push({
            type: 'PASSED_GO',
            playerId: player.id,
            reward: GO_REWARD,
          });
        }
        const from = player.position;
        player.position = targetTile;
        events.push({
          type: 'SHIP_STEPPED',
          playerId: player.id,
          from,
          to: targetTile,
        });
        OneMonopolyEngine.resolveTileLanding(state, events, player, targetTile);
        break;
      }

      case 'MOVE_STEPS': {
        const steps = effect.steps || 0;
        OneMonopolyEngine.movePlayerSteps(state, events, player, steps, true);
        break;
      }

      case 'GO_TO_HOLD':
        OneMonopolyEngine.sendToHold(state, events, player, 'Lệnh giữ tàu từ Thẻ Bài');
        state.phase = 'END_OF_TURN';
        break;

      case 'GET_PASS':
        player.customsClearancePasses++;
        OneMonopolyEngine.finishStepPhase(state);
        break;

      case 'PAY_PER_CONTAINER': {
        let totalFine = 0;
        for (const tileId of Object.keys(state.properties)) {
          const prop = state.properties[Number(tileId)];
          if (prop?.ownerId === player.id) {
            if (prop.containerLevel === 5) {
              totalFine += effect.perMegaTerminalAmount || 100;
            } else if (prop.containerLevel > 0) {
              totalFine += prop.containerLevel * (effect.perContainerAmount || 25);
            }
          }
        }

        if (totalFine === 0) {
          OneMonopolyEngine.finishStepPhase(state);
          return;
        }

        if (player.balance >= totalFine) {
          player.balance -= totalFine;
          events.push({
            type: 'TAX_PAID',
            playerId: player.id,
            tileId: player.position,
            amount: totalFine,
          });
          events.push({
            type: 'BALANCE_CHANGED',
            playerId: player.id,
            newBalance: player.balance,
            delta: -totalFine,
            reason: 'Bảo trì container / Mega terminal',
          });
          OneMonopolyEngine.finishStepPhase(state);
        } else {
          OneMonopolyEngine.createDebt(
            state,
            events,
            player.id,
            'BANK',
            totalFine,
            'Bảo trì container / Mega terminal'
          );
        }
        break;
      }

      case 'COLLECT_FROM_PLAYERS': {
        const amount = effect.amount || 50;
        let collected = 0;
        for (const p of state.players) {
          if (p.id !== player.id && !p.isBankrupt) {
            const actual = Math.min(p.balance, amount);
            p.balance -= actual;
            collected += actual;
          }
        }
        player.balance += collected;
        events.push({
          type: 'BALANCE_CHANGED',
          playerId: player.id,
          newBalance: player.balance,
          delta: collected,
          reason: 'Thu phí liên minh từ đối thủ',
        });
        OneMonopolyEngine.finishStepPhase(state);
        break;
      }

      case 'PAY_PLAYERS': {
        const amount = effect.amount || 50;
        const activeOthers = state.players.filter((p) => p.id !== player.id && !p.isBankrupt);
        const needed = amount * activeOthers.length;

        if (player.balance >= needed) {
          player.balance -= needed;
          for (const p of activeOthers) {
            p.balance += amount;
          }
          events.push({
            type: 'BALANCE_CHANGED',
            playerId: player.id,
            newBalance: player.balance,
            delta: -needed,
            reason: 'Hỗ trợ đình công cho người chơi khác',
          });
          OneMonopolyEngine.finishStepPhase(state);
        } else {
          OneMonopolyEngine.createDebt(
            state,
            events,
            player.id,
            'BANK',
            needed,
            'Hỗ trợ đình công cho người chơi khác'
          );
        }
        break;
      }
    }
  }

  private static finishStepPhase(state: GameState): void {
    if (state.pendingDebt !== null) {
      state.phase = 'AWAITING_DEBT_RESOLUTION';
      return;
    }
    const [d1, d2] = state.dice;
    const isDouble = d1 === d2;
    const activePlayer = state.players[state.activePlayerIndex];

    // If rolled double and not in hold, player gets another roll!
    if (isDouble && !activePlayer.inHold && state.consecutiveDoubles > 0) {
      state.phase = 'WAIT_FOR_ROLL';
      state.hasRolled = false;
    } else {
      state.phase = 'END_OF_TURN';
    }
  }

  private static sendToHold(
    state: GameState,
    events: GameEvent[],
    player: Player,
    reason: string
  ): void {
    player.position = HOLD_TILE_INDEX;
    player.inHold = true;
    player.holdTurns = 0;
    state.consecutiveDoubles = 0;
    events.push({
      type: 'SENT_TO_HOLD',
      playerId: player.id,
      reason,
    });
  }

  private static createDebt(
    state: GameState,
    events: GameEvent[],
    debtorId: string,
    creditorId: string | 'BANK',
    amount: number,
    reason: string,
    tileId?: number
  ): void {
    state.pendingDebt = {
      creditorId,
      amount,
      reason,
      tileId,
    };
    state.phase = 'AWAITING_DEBT_RESOLUTION';
    events.push({
      type: 'DEBT_CREATED',
      debtorId,
      creditorId,
      amount,
      reason,
    });
  }

  private static handleBuyProperty(
    state: GameState,
    events: GameEvent[],
    player: Player
  ): void {
    if (state.phase !== 'AWAITING_BUY_DECISION') return;
    const tile = BOARD_TILES[player.position];
    const prop = state.properties[player.position];
    if (!tile || !prop || prop.ownerId !== null || !tile.price) return;

    if (player.balance < tile.price) return;

    player.balance -= tile.price;
    prop.ownerId = player.id;

    events.push({
      type: 'TILE_PURCHASED',
      playerId: player.id,
      tileId: tile.id,
      price: tile.price,
    });
    events.push({
      type: 'BALANCE_CHANGED',
      playerId: player.id,
      newBalance: player.balance,
      delta: -tile.price,
      reason: `Mua cảng/tuyến ${tile.name}`,
    });

    OneMonopolyEngine.finishStepPhase(state);
  }

  private static handleSkipBuy(
    state: GameState,
    _events: GameEvent[],
    _player: Player
  ): void {
    if (state.phase !== 'AWAITING_BUY_DECISION') return;
    OneMonopolyEngine.finishStepPhase(state);
  }

  private static handleBuildContainer(
    state: GameState,
    events: GameEvent[],
    player: Player,
    tileId: number
  ): void {
    const tile = BOARD_TILES[tileId];
    const prop = state.properties[tileId];
    if (!tile || !prop || prop.ownerId !== player.id || tile.type !== 'PORT') return;
    if (prop.isMortgaged) return;
    if (prop.containerLevel >= 5) return;

    const groupConfig = LOOP_GROUPS_CONFIG[tile.group!];
    if (!groupConfig) return;

    // 1. Must own all ports in loop and none mortgaged
    const ownsAllAndNotMortgaged = groupConfig.tileIds.every((id) => {
      const p = state.properties[id];
      return p && p.ownerId === player.id && !p.isMortgaged;
    });
    if (!ownsAllAndNotMortgaged) return;

    // 2. Even Building Rule: current tile cannot be built if any tile in group has lower level
    const minLevelInGroup = Math.min(
      ...groupConfig.tileIds.map((id) => state.properties[id]!.containerLevel)
    );
    if (prop.containerLevel > minLevelInGroup) return;

    const cost = tile.buildCost || groupConfig.buildCost;
    if (player.balance < cost) return;

    player.balance -= cost;
    prop.containerLevel++;

    events.push({
      type: 'CONTAINER_BUILT',
      playerId: player.id,
      tileId,
      newLevel: prop.containerLevel,
      cost,
    });
    events.push({
      type: 'BALANCE_CHANGED',
      playerId: player.id,
      newBalance: player.balance,
      delta: -cost,
      reason: `Xây container tại ${tile.name}`,
    });
  }

  private static handleSellContainer(
    state: GameState,
    events: GameEvent[],
    player: Player,
    tileId: number
  ): void {
    const tile = BOARD_TILES[tileId];
    const prop = state.properties[tileId];
    if (!tile || !prop || prop.ownerId !== player.id || tile.type !== 'PORT') return;
    if (prop.containerLevel <= 0) return;

    const groupConfig = LOOP_GROUPS_CONFIG[tile.group!];
    if (!groupConfig) return;

    // Even Selling Rule: cannot sell from a tile if any tile in group has higher level
    const maxLevelInGroup = Math.max(
      ...groupConfig.tileIds.map((id) => state.properties[id]!.containerLevel)
    );
    if (prop.containerLevel < maxLevelInGroup) return;

    const cost = tile.buildCost || groupConfig.buildCost;
    const refund = Math.floor(cost * 0.5);

    prop.containerLevel--;
    player.balance += refund;

    events.push({
      type: 'CONTAINER_SOLD',
      playerId: player.id,
      tileId,
      newLevel: prop.containerLevel,
      refund,
    });
    events.push({
      type: 'BALANCE_CHANGED',
      playerId: player.id,
      newBalance: player.balance,
      delta: refund,
      reason: `Bán bớt container tại ${tile.name}`,
    });
  }

  private static handleMortgageTile(
    state: GameState,
    events: GameEvent[],
    player: Player,
    tileId: number
  ): void {
    const tile = BOARD_TILES[tileId];
    const prop = state.properties[tileId];
    if (!tile || !prop || prop.ownerId !== player.id || prop.isMortgaged) return;

    // Cannot mortgage if any tile in the group still has containers
    if (tile.type === 'PORT') {
      const groupConfig = LOOP_GROUPS_CONFIG[tile.group!];
      const hasAnyContainers = groupConfig.tileIds.some(
        (id) => (state.properties[id]?.containerLevel || 0) > 0
      );
      if (hasAnyContainers) return;
    }

    const mortgageValue = tile.mortgageValue || Math.floor((tile.price || 0) * 0.5);
    prop.isMortgaged = true;
    player.balance += mortgageValue;

    events.push({
      type: 'TILE_MORTGAGED',
      playerId: player.id,
      tileId,
      amount: mortgageValue,
    });
    events.push({
      type: 'BALANCE_CHANGED',
      playerId: player.id,
      newBalance: player.balance,
      delta: mortgageValue,
      reason: `Thế chấp ${tile.name}`,
    });
  }

  private static handleUnmortgageTile(
    state: GameState,
    events: GameEvent[],
    player: Player,
    tileId: number
  ): void {
    const tile = BOARD_TILES[tileId];
    const prop = state.properties[tileId];
    if (!tile || !prop || prop.ownerId !== player.id || !prop.isMortgaged) return;

    const mortgageValue = tile.mortgageValue || Math.floor((tile.price || 0) * 0.5);
    const unmortgageCost = Math.ceil(mortgageValue * 1.1); // 10% interest

    if (player.balance < unmortgageCost) return;

    player.balance -= unmortgageCost;
    prop.isMortgaged = false;

    events.push({
      type: 'TILE_UNMORTGAGED',
      playerId: player.id,
      tileId,
      cost: unmortgageCost,
    });
    events.push({
      type: 'BALANCE_CHANGED',
      playerId: player.id,
      newBalance: player.balance,
      delta: -unmortgageCost,
      reason: `Chuộc tài sản ${tile.name}`,
    });
  }

  private static handlePayHoldFine(
    state: GameState,
    events: GameEvent[],
    player: Player
  ): void {
    if (!player.inHold || state.phase !== 'WAIT_FOR_ROLL' || state.hasRolled) return;
    if (player.balance < HOLD_FINE_AMOUNT) return;

    player.balance -= HOLD_FINE_AMOUNT;
    player.inHold = false;
    player.holdTurns = 0;

    events.push({
      type: 'TAX_PAID',
      playerId: player.id,
      tileId: HOLD_TILE_INDEX,
      amount: HOLD_FINE_AMOUNT,
    });
    events.push({
      type: 'RELEASED_FROM_HOLD',
      playerId: player.id,
      method: 'FINE',
    });
    events.push({
      type: 'BALANCE_CHANGED',
      playerId: player.id,
      newBalance: player.balance,
      delta: -HOLD_FINE_AMOUNT,
      reason: 'Nộp phí thông quan tự nguyện',
    });
  }

  private static handleUseClearancePass(
    state: GameState,
    events: GameEvent[],
    player: Player
  ): void {
    if (!player.inHold || state.phase !== 'WAIT_FOR_ROLL' || state.hasRolled) return;
    if (player.customsClearancePasses <= 0) return;

    player.customsClearancePasses--;
    player.inHold = false;
    player.holdTurns = 0;

    events.push({
      type: 'RELEASED_FROM_HOLD',
      playerId: player.id,
      method: 'PASS',
    });
  }

  private static handleSettleDebt(
    state: GameState,
    events: GameEvent[],
    player: Player
  ): void {
    if (state.phase !== 'AWAITING_DEBT_RESOLUTION' || !state.pendingDebt) return;
    const debt = state.pendingDebt;

    if (player.balance < debt.amount) return;

    player.balance -= debt.amount;
    if (debt.creditorId !== 'BANK') {
      const creditor = state.players.find((p) => p.id === debt.creditorId);
      if (creditor) {
        creditor.balance += debt.amount;
      }
    }

    events.push({
      type: 'DEBT_SETTLED',
      debtorId: player.id,
      creditorId: debt.creditorId,
      amount: debt.amount,
    });

    state.pendingDebt = null;
    OneMonopolyEngine.finishStepPhase(state);
  }

  private static handleDeclareBankruptcy(
    state: GameState,
    events: GameEvent[],
    player: Player
  ): void {
    player.isBankrupt = true;
    const creditorId = state.pendingDebt?.creditorId || 'BANK';
    player.bankruptTo = creditorId;

    events.push({
      type: 'PLAYER_BANKRUPT',
      debtorId: player.id,
      creditorId,
    });

    if (creditorId !== 'BANK') {
      const creditor = state.players.find((p) => p.id === creditorId);
      if (creditor) {
        // Transfer remaining cash
        creditor.balance += Math.max(0, player.balance);
        player.balance = 0;

        // Transfer all properties (reset containers to 0, keep mortgaged state)
        for (const tileId of Object.keys(state.properties)) {
          const prop = state.properties[Number(tileId)];
          if (prop && prop.ownerId === player.id) {
            prop.ownerId = creditor.id;
            prop.containerLevel = 0;
          }
        }
      }
    } else {
      // Bank liquidation: reset all properties to unowned
      for (const tileId of Object.keys(state.properties)) {
        const prop = state.properties[Number(tileId)];
        if (prop && prop.ownerId === player.id) {
          prop.ownerId = null;
          prop.containerLevel = 0;
          prop.isMortgaged = false;
        }
      }
      player.balance = 0;
    }

    state.pendingDebt = null;

    // Check game over
    const activeSurvivors = state.players.filter((p) => !p.isBankrupt);
    if (activeSurvivors.length === 1) {
      state.winnerId = activeSurvivors[0].id;
      events.push({
        type: 'GAME_OVER',
        winnerId: state.winnerId,
      });
      return;
    }

    // Pass turn to next active player
    OneMonopolyEngine.handleEndTurn(state, events, player);
  }

  private static handleEndTurn(
    state: GameState,
    _events: GameEvent[],
    _player: Player
  ): void {
    if (state.pendingDebt !== null) return;

    let nextIndex = (state.activePlayerIndex + 1) % state.players.length;
    let loopCount = 0;
    while (state.players[nextIndex].isBankrupt && loopCount < state.players.length) {
      nextIndex = (nextIndex + 1) % state.players.length;
      loopCount++;
    }

    if (nextIndex <= state.activePlayerIndex) {
      state.turnCount++;
    }

    state.activePlayerIndex = nextIndex;
    state.hasRolled = false;
    state.consecutiveDoubles = 0;
    state.phase = 'WAIT_FOR_ROLL';
  }
}
