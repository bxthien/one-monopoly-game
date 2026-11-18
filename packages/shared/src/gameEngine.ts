import {
  BoardTile,
  CardEffect,
  EngineResult,
  GameAction,
  GameCard,
  GameEvent,
  GameState,
  LoopGroup,
  PendingSlotCharter,
  Player,
  PropertyState,
  SecretMissionCard,
  VesselToken,
} from './types.js';
import {
  BOARD_TILES,
  GAME_CARDS,
  GO_REWARD,
  GO_TO_HOLD_TILE_INDEX,
  GREEN_FLEET_COST,
  GREEN_FLEET_ESG_BONUS,
  HOLD_FINE_AMOUNT,
  HOLD_TILE_INDEX,
  INFRA_TILES,
  LOOP_GROUPS_CONFIG,
  MAX_HOLD_TURNS,
  SECRET_MISSIONS,
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
    const shuffledMissions = shuffle(SECRET_MISSIONS);

    const players: Player[] = playersData.map((p, idx) => ({
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
      secretMission: JSON.parse(
        JSON.stringify(shuffledMissions[idx % shuffledMissions.length])
      ),
    }));

    const properties: Record<number, PropertyState> = {};
    for (const tile of BOARD_TILES) {
      if (tile.type === 'PORT' || tile.type === 'SERVICE_LINE' || tile.type === 'INFRA') {
        properties[tile.id] = {
          ownerId: null,
          containerLevel: 0,
          isMortgaged: false,
          hasGreenFleet: false,
          slotCharter: null,
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
      pendingSlotCharter: null,
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

      case 'UPGRADE_GREEN_FLEET':
        OneMonopolyEngine.handleUpgradeGreenFleet(nextState, events, activePlayer, action.tileId);
        break;

      case 'PROPOSE_SLOT_CHARTER':
        OneMonopolyEngine.handleProposeSlotCharter(nextState, events, activePlayer, action.tileId);
        break;

      case 'RESPOND_SLOT_CHARTER':
        OneMonopolyEngine.handleRespondSlotCharter(nextState, events, action.accept);
        break;

      case 'CLAIM_MISSION_REWARD':
        OneMonopolyEngine.checkMissionCompletion(nextState, events, activePlayer);
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

    // Check mission completion after actions
    if (activePlayer && !activePlayer.isBankrupt) {
      OneMonopolyEngine.checkMissionCompletion(nextState, events, activePlayer);
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
    let to = (from + steps) % BOARD_TILES.length;
    if (to < 0) to += BOARD_TILES.length;

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

        // Check Green Fleet exemption on Carbon Tax
        if (tile.code === 'CARBON-TAX') {
          const hasAnyGreenFleet = Object.values(state.properties).some(
            (prop) => prop.ownerId === player.id && prop.hasGreenFleet
          );
          if (hasAnyGreenFleet) {
            events.push({
              type: 'CARBON_TAX_EXEMPTED',
              playerId: player.id,
              tileId,
              reason: 'Sở hữu Huy hiệu Tàu Nhiên Liệu Xanh (Green Fuel Ready)',
            });
            OneMonopolyEngine.finishStepPhase(state);
            return;
          }
        }

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
            const owner = state.players.find((p) => p.id === prop.ownerId);
            if (!owner || owner.isBankrupt) {
              OneMonopolyEngine.finishStepPhase(state);
              return;
            }

            const rent = OneMonopolyEngine.calculateRent(state, tileId, state.dice);

            // Check if player can propose Slot Chartering ("As ONE, We Can")
            const playerOwnsServiceLine = SERVICE_LINES.some(
              (lineId) => state.properties[lineId]?.ownerId === player.id
            );
            if (tile.type === 'PORT' && prop.containerLevel >= 1 && playerOwnsServiceLine) {
              // Pause and offer Slot Chartering proposal
              state.pendingSlotCharter = {
                requesterId: player.id,
                ownerId: owner.id,
                tileId,
                originalRent: rent,
                discountedRent: Math.floor(rent * 0.5),
              };
              // Note: Phase stays in AWAITING_BUY_DECISION or special charter state
              // We transition to AWAITING_SLOT_CHARTER_RESPONSE so player can choose to propose or pay regular
              state.phase = 'AWAITING_SLOT_CHARTER_RESPONSE';
              return;
            }

            // Check if there is an active Slot Charter agreement on this tile (split rent with partner)
            if (prop.slotCharter && prop.slotCharter.active) {
              const partnerId = prop.slotCharter.partnerId;
              const partner = state.players.find((p) => p.id === partnerId);

              if (partner && !partner.isBankrupt && partner.id !== player.id) {
                // Third party visitor! Split 50/50 between owner and partner
                const halfRent = Math.floor(rent * 0.5);
                if (player.balance >= rent) {
                  player.balance -= rent;
                  owner.balance += halfRent;
                  partner.balance += halfRent;

                  events.push({
                    type: 'SLOT_CHARTER_RENT_SPLIT',
                    visitorId: player.id,
                    ownerId: owner.id,
                    partnerId: partner.id,
                    tileId,
                    splitAmount: halfRent,
                  });
                  events.push({
                    type: 'BALANCE_CHANGED',
                    playerId: player.id,
                    newBalance: player.balance,
                    delta: -rent,
                    reason: `Cước cảng liên minh tại ${tile.name}`,
                  });
                  events.push({
                    type: 'BALANCE_CHANGED',
                    playerId: owner.id,
                    newBalance: owner.balance,
                    delta: halfRent,
                    reason: `Nhận 50% cước liên minh từ ${player.name}`,
                  });
                  events.push({
                    type: 'BALANCE_CHANGED',
                    playerId: partner.id,
                    newBalance: partner.balance,
                    delta: halfRent,
                    reason: `Nhận 50% cước chia sẻ chỗ (Slot Charter) từ ${player.name}`,
                  });

                  // Deactivate charter agreement
                  prop.slotCharter.active = false;
                  OneMonopolyEngine.finishStepPhase(state);
                  return;
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
                  return;
                }
              }
            }

            // Normal Demurrage Payment
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
            reason: 'Bảo trì Lô container / Siêu tàu ONE Innovation',
          });
          OneMonopolyEngine.finishStepPhase(state);
        } else {
          OneMonopolyEngine.createDebt(
            state,
            events,
            player.id,
            'BANK',
            totalFine,
            'Bảo trì Lô container / Siêu tàu ONE Innovation'
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
      reason:
        prop.containerLevel === 5
          ? `Nâng cấp Siêu tàu ONE Innovation (24.000 TEU) tại ${tile.name}`
          : `Đặt Lô Container Magenta thứ ${prop.containerLevel} tại ${tile.name}`,
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
    // If downgraded from level 5, also remove green fleet
    if (prop.containerLevel < 5) {
      prop.hasGreenFleet = false;
    }
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

  // ==================== TÍNH NĂNG MỚI: TÀU NHIÊN LIỆU XANH ==================== //
  private static handleUpgradeGreenFleet(
    state: GameState,
    events: GameEvent[],
    player: Player,
    tileId: number
  ): void {
    const tile = BOARD_TILES[tileId];
    const prop = state.properties[tileId];
    if (!tile || !prop || prop.ownerId !== player.id || prop.isMortgaged) return;
    if (prop.containerLevel !== 5) return; // Chỉ áp dụng cho Siêu tàu ONE Innovation (Mức 5)
    if (prop.hasGreenFleet) return; // Đã nâng cấp rồi
    if (player.balance < GREEN_FLEET_COST) return;

    player.balance -= GREEN_FLEET_COST;
    prop.hasGreenFleet = true;

    events.push({
      type: 'GREEN_FLEET_UPGRADED',
      playerId: player.id,
      tileId,
      cost: GREEN_FLEET_COST,
    });
    events.push({
      type: 'BALANCE_CHANGED',
      playerId: player.id,
      newBalance: player.balance,
      delta: -GREEN_FLEET_COST,
      reason: `Nâng cấp Tàu Nhiên Liệu Xanh (Green Fuel Ready) tại ${tile.name}`,
    });
  }

  // ==================== TÍNH NĂNG MỚI: SLOT CHARTERING (AS ONE, WE CAN) ==================== //
  private static handleProposeSlotCharter(
    state: GameState,
    events: GameEvent[],
    player: Player,
    tileId: number
  ): void {
    if (state.phase !== 'AWAITING_SLOT_CHARTER_RESPONSE' || !state.pendingSlotCharter) return;
    const charter = state.pendingSlotCharter;
    if (charter.requesterId !== player.id || charter.tileId !== tileId) return;

    events.push({
      type: 'SLOT_CHARTER_PROPOSED',
      requesterId: player.id,
      ownerId: charter.ownerId,
      tileId,
    });
    // Awaiting owner response
  }

  private static handleRespondSlotCharter(
    state: GameState,
    events: GameEvent[],
    accept: boolean
  ): void {
    if (state.phase !== 'AWAITING_SLOT_CHARTER_RESPONSE' || !state.pendingSlotCharter) return;
    const charter = state.pendingSlotCharter;
    const requester = state.players.find((p) => p.id === charter.requesterId);
    const owner = state.players.find((p) => p.id === charter.ownerId);
    const prop = state.properties[charter.tileId];
    const tile = BOARD_TILES[charter.tileId];

    if (!requester || !owner || !prop || !tile) return;

    if (accept) {
      // 50% discount accepted!
      const rent = charter.discountedRent;
      requester.balance -= rent;
      owner.balance += rent;

      // Set slot charter agreement for future 3rd party split
      prop.slotCharter = {
        partnerId: requester.id,
        active: true,
      };

      events.push({
        type: 'SLOT_CHARTER_ACCEPTED',
        requesterId: requester.id,
        ownerId: owner.id,
        tileId: charter.tileId,
        rentPaid: rent,
      });
      events.push({
        type: 'DEMURRAGE_PAID',
        debtorId: requester.id,
        creditorId: owner.id,
        tileId: charter.tileId,
        amount: rent,
      });
      events.push({
        type: 'BALANCE_CHANGED',
        playerId: requester.id,
        newBalance: requester.balance,
        delta: -rent,
        reason: `Trả 50% cước chia sẻ chỗ tại ${tile.name}`,
      });
      events.push({
        type: 'BALANCE_CHANGED',
        playerId: owner.id,
        newBalance: owner.balance,
        delta: rent,
        reason: `Thu 50% cước chia sẻ chỗ từ ${requester.name}`,
      });

      state.pendingSlotCharter = null;
      OneMonopolyEngine.finishStepPhase(state);
    } else {
      // Rejected: Requester must pay full 100% rent
      const rent = charter.originalRent;
      events.push({
        type: 'SLOT_CHARTER_REJECTED',
        requesterId: requester.id,
        ownerId: owner.id,
        tileId: charter.tileId,
      });

      state.pendingSlotCharter = null;

      if (requester.balance >= rent) {
        requester.balance -= rent;
        owner.balance += rent;
        events.push({
          type: 'DEMURRAGE_PAID',
          debtorId: requester.id,
          creditorId: owner.id,
          tileId: charter.tileId,
          amount: rent,
        });
        events.push({
          type: 'BALANCE_CHANGED',
          playerId: requester.id,
          newBalance: requester.balance,
          delta: -rent,
          reason: `Tiền lưu bãi tại ${tile.name}`,
        });
        events.push({
          type: 'BALANCE_CHANGED',
          playerId: owner.id,
          newBalance: owner.balance,
          delta: rent,
          reason: `Thu tiền lưu bãi từ ${requester.name}`,
        });
        OneMonopolyEngine.finishStepPhase(state);
      } else {
        OneMonopolyEngine.createDebt(
          state,
          events,
          requester.id,
          owner.id,
          rent,
          `Tiền lưu bãi tại ${tile.name}`,
          charter.tileId
        );
      }
    }
  }

  // ==================== TÍNH NĂNG MỚI: KIỂM TRA THẺ NHIỆM VỤ BÍ MẬT ==================== //
  public static checkMissionCompletion(
    state: GameState,
    events: GameEvent[],
    player: Player
  ): void {
    if (!player.secretMission || player.secretMission.isCompleted || player.isBankrupt) return;

    const mission = player.secretMission;
    let completed = false;

    switch (mission.id) {
      case 'MISSION-1':
        // Cái Mép (3), Los Angeles (23), Tuyến PS3 (28)
        completed =
          state.properties[3]?.ownerId === player.id &&
          state.properties[23]?.ownerId === player.id &&
          state.properties[28]?.ownerId === player.id;
        break;

      case 'MISSION-2':
        // Tokyo (31), Busan (17), and 1 Siêu tàu ONE Innovation (level 5)
        completed =
          state.properties[31]?.ownerId === player.id &&
          state.properties[17]?.ownerId === player.id &&
          Object.values(state.properties).some(
            (p) => p.ownerId === player.id && p.containerLevel === 5
          );
        break;

      case 'MISSION-3':
        // ONE QUOTE (10), ONE Eco Calculator (22), and at least 1 Green Fleet
        completed =
          state.properties[10]?.ownerId === player.id &&
          state.properties[22]?.ownerId === player.id &&
          Object.values(state.properties).some(
            (p) => p.ownerId === player.id && p.hasGreenFleet
          );
        break;

      case 'MISSION-4':
        // At least 3 of 4 service lines (4, 13, 20, 28)
        completed =
          SERVICE_LINES.filter((id) => state.properties[id]?.ownerId === player.id).length >= 3;
        break;

      case 'MISSION-5':
        // Intra-Asia (1, 3) and Tuyến VSS (4)
        completed =
          state.properties[1]?.ownerId === player.id &&
          state.properties[3]?.ownerId === player.id &&
          state.properties[4]?.ownerId === player.id;
        break;
    }

    if (completed) {
      mission.isCompleted = true;
      player.balance += mission.reward;
      events.push({
        type: 'MISSION_COMPLETED',
        playerId: player.id,
        mission,
        reward: mission.reward,
      });
      events.push({
        type: 'BALANCE_CHANGED',
        playerId: player.id,
        newBalance: player.balance,
        delta: mission.reward,
        reason: `Hoàn thành ${mission.title}`,
      });
    }
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
            prop.hasGreenFleet = false;
            prop.slotCharter = null;
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
          prop.hasGreenFleet = false;
          prop.slotCharter = null;
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
    if (state.pendingDebt !== null || state.pendingSlotCharter !== null) return;

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
