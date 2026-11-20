import {
  AUCTION_BID_SECONDS,
  GameAction,
  GameEvent,
  GameState,
  OneMonopolyEngine,
  VesselToken,
  VESSEL_TOKENS,
} from '@one-monopoly/shared';
import crypto from 'node:crypto';
import { TurnTimer } from './turnTimer.js';

const TURN_SECONDS = 45;

export function getTimerPlayerId(state: GameState): string {
  if (state.phase === 'AWAITING_AUCTION' && state.auction) return state.auction.bidderId;
  return state.players[state.activePlayerIndex].id;
}

export interface RoomPlayer {
  id: string;
  name: string;
  token: VesselToken;
  isReady: boolean;
  isOnline: boolean;
  sessionToken: string;
}

export interface Room {
  id: string;
  hostId: string;
  players: RoomPlayer[];
  gameState: GameState | null;
  isGameStarted: boolean;
  timer: TurnTimer | null;
  socketToPlayer: Map<string, string>; // socketId -> playerId
  playerToSocket: Map<string, string>; // playerId -> socketId
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private onBroadcastUpdate?: (roomId: string, state: GameState, events: GameEvent[]) => void;
  private onTimerTick?: (roomId: string, seconds: number, playerId: string) => void;
  private onLobbyUpdate?: (roomId: string) => void;

  constructor(callbacks?: {
    onBroadcastUpdate?: (roomId: string, state: GameState, events: GameEvent[]) => void;
    onTimerTick?: (roomId: string, seconds: number, playerId: string) => void;
    onLobbyUpdate?: (roomId: string) => void;
  }) {
    if (callbacks) {
      this.onBroadcastUpdate = callbacks.onBroadcastUpdate;
      this.onTimerTick = callbacks.onTimerTick;
      this.onLobbyUpdate = callbacks.onLobbyUpdate;
    }
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  public createRoom(
    hostName: string,
    token: VesselToken,
    socketId: string
  ): { room: Room; sessionToken: string; playerId: string } {
    const roomId = `ONE-${Math.floor(1000 + Math.random() * 9000)}`;
    const playerId = `usr-${crypto.randomUUID().slice(0, 8)}`;
    const sessionToken = crypto.randomUUID();

    const host: RoomPlayer = {
      id: playerId,
      name: hostName.trim() || 'Captain ONE',
      token,
      isReady: true,
      isOnline: true,
      sessionToken,
    };

    const room: Room = {
      id: roomId,
      hostId: playerId,
      players: [host],
      gameState: null,
      isGameStarted: false,
      timer: null,
      socketToPlayer: new Map([[socketId, playerId]]),
      playerToSocket: new Map([[playerId, socketId]]),
    };

    this.rooms.set(roomId, room);
    return { room, sessionToken, playerId };
  }

  public joinRoom(
    roomId: string,
    playerName: string,
    token: VesselToken,
    socketId: string,
    sessionToken?: string
  ): { success: boolean; error?: string; room?: Room; sessionToken?: string; playerId?: string; isReconnect?: boolean } {
    const room = this.getRoom(roomId);
    if (!room) {
      return { success: false, error: 'Phòng không tồn tại!' };
    }

    // 1. Reconnect check via sessionToken
    if (sessionToken) {
      const existingPlayer = room.players.find((p) => p.sessionToken === sessionToken);
      if (existingPlayer) {
        const previousSocket = room.playerToSocket.get(existingPlayer.id);
        if (previousSocket) room.socketToPlayer.delete(previousSocket);
        existingPlayer.isOnline = true;
        room.socketToPlayer.set(socketId, existingPlayer.id);
        room.playerToSocket.set(existingPlayer.id, socketId);

        if (room.gameState) {
          const gp = room.gameState.players.find((p) => p.id === existingPlayer.id);
          if (gp) gp.isOnline = true;
        }

        return {
          success: true,
          room,
          sessionToken,
          playerId: existingPlayer.id,
          isReconnect: true,
        };
      }
    }

    // 2. Joining as a new player
    if (room.isGameStarted) {
      return { success: false, error: 'Ván chơi đã bắt đầu, không thể tham gia mới!' };
    }

    if (room.players.length >= 4) {
      return { success: false, error: 'Phòng đã đầy (tối đa 4 người chơi)!' };
    }

    // Check if token already taken
    const tokenTaken = room.players.some((p) => p.token === token);
    if (tokenTaken) {
      // Pick available token
      const available = VESSEL_TOKENS.find((t) => !room.players.some((p) => p.token === t));
      if (available) token = available;
    }

    const playerId = `usr-${crypto.randomUUID().slice(0, 8)}`;
    const newSessionToken = crypto.randomUUID();

    const newPlayer: RoomPlayer = {
      id: playerId,
      name: playerName.trim() || `Player ${room.players.length + 1}`,
      token,
      isReady: false,
      isOnline: true,
      sessionToken: newSessionToken,
    };

    room.players.push(newPlayer);
    room.socketToPlayer.set(socketId, playerId);
    room.playerToSocket.set(playerId, socketId);

    if (this.onLobbyUpdate) {
      this.onLobbyUpdate(room.id);
    }

    return {
      success: true,
      room,
      sessionToken: newSessionToken,
      playerId,
      isReconnect: false,
    };
  }

  public setReady(roomId: string, playerId: string, isReady: boolean): boolean {
    const room = this.getRoom(roomId);
    if (!room || room.isGameStarted) return false;

    const player = room.players.find((p) => p.id === playerId);
    if (!player) return false;

    player.isReady = isReady;
    if (this.onLobbyUpdate) {
      this.onLobbyUpdate(room.id);
    }
    return true;
  }

  public startGame(roomId: string, callerId: string): { success: boolean; error?: string } {
    const room = this.getRoom(roomId);
    if (!room) return { success: false, error: 'Phòng không tồn tại!' };
    if (room.hostId !== callerId) return { success: false, error: 'Chỉ phòng trưởng (Host) mới có quyền bắt đầu!' };
    if (room.isGameStarted) return { success: false, error: 'Trò chơi đã bắt đầu!' };

    // Tự động bổ sung AI Bot nếu chỉ có 1 người chơi
    const playersToStart = [...room.players];
    if (playersToStart.length === 1) {
      playersToStart.push({
        id: 'ai-mate-1',
        name: 'AI Thuyền Phó (Bot)',
        token: room.players[0].token === 'ONE_APUS' ? 'PILOT_BOAT' : 'ONE_APUS',
        isReady: true,
        isOnline: true,
        sessionToken: 'bot-token-1',
      });
    }

    const gameState = OneMonopolyEngine.createGame(
      room.id,
      playersToStart.map((p) => ({
        id: p.id,
        name: p.name,
        token: p.token,
      }))
    );

    room.gameState = gameState;
    room.isGameStarted = true;

    // Start 45s turn timer
    this.setupRoomTimer(room);

    if (this.onBroadcastUpdate) {
      this.onBroadcastUpdate(room.id, room.gameState, []);
    }

    return { success: true };
  }

  private setupRoomTimer(room: Room): void {
    if (room.timer) {
      room.timer.stop();
    }

    room.timer = new TurnTimer(
      TURN_SECONDS,
      (seconds) => {
        if (!room.gameState || room.gameState.winnerId) return;
        this.onTimerTick?.(room.id, seconds, getTimerPlayerId(room.gameState));
      },
      () => {
        this.handleAFKTimeout(room.id);
      }
    );

    room.timer.start();
  }

  public dispatchSocketAction(
    socketId: string,
    data: { roomId: string; playerId: string; action: GameAction }
  ) {
    const room = typeof data?.roomId === 'string' ? this.getRoom(data.roomId) : undefined;
    const actorId = room?.socketToPlayer.get(socketId);
    if (!actorId || actorId !== data.playerId) {
      return { success: false, error: 'Kết nối này không đại diện cho người chơi trong phòng.' };
    }
    return this.dispatchAction(data.roomId, actorId, data.action);
  }

  public dispatchAction(
    roomId: string,
    playerId: string,
    action: GameAction
  ): { success: boolean; error?: string; state?: GameState; events?: GameEvent[] } {
    const room = this.getRoom(roomId);
    if (!room || !room.gameState) return { success: false, error: 'Phòng hoặc ván chơi không tồn tại' };
    if (!action || typeof action.type !== 'string') return { success: false, error: 'Hành động không hợp lệ.' };

    const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
    const isAuctionAction = action.type === 'AUCTION_BID' || action.type === 'AUCTION_PASS';
    const isTradeAction = action.type === 'OFFER_TRADE' || action.type === 'RESPOND_TRADE' || action.type === 'CANCEL_TRADE';
    const inAuction = room.gameState.phase === 'AWAITING_AUCTION';
    if (isAuctionAction && (!inAuction || room.gameState.auction?.bidderId !== playerId)) {
      return { success: false, error: 'Chưa đến lượt đấu giá của bạn.' };
    }
    if (inAuction && !isAuctionAction && !isTradeAction) return { success: false, error: 'Hãy hoàn tất phiên đấu giá trước.' };

    // Some actions can only be triggered by the active player
    // Slot Charter response can only be answered by the property owner
    if (action.type === 'RESPOND_SLOT_CHARTER') {
      if (room.gameState.pendingSlotCharter?.ownerId !== playerId) {
        return { success: false, error: 'Chỉ chủ sở hữu cảng mới có quyền quyết định thỏa thuận chia sẻ chỗ!' };
      }
    } else if (
      action.type === 'ROLL_DICE' ||
      action.type === 'BUY_PROPERTY' ||
      action.type === 'SKIP_BUY' ||
      action.type === 'PAY_HOLD_FINE' ||
      action.type === 'USE_CLEARANCE_PASS' ||
      action.type === 'RESOLVE_STORM' ||
      action.type === 'PROPOSE_SLOT_CHARTER' ||
      action.type === 'END_TURN'
    ) {
      if (activePlayer.id !== playerId) {
        return { success: false, error: 'Chưa đến lượt của bạn!' };
      }
    }

    // Debt resolution actions can only be by the debtor
    if (action.type === 'SETTLE_DEBT' || action.type === 'DECLARE_BANKRUPTCY') {
      if (activePlayer.id !== playerId) {
        return { success: false, error: 'Chỉ người đang nợ mới được xử lý nợ!' };
      }
    }

    const prevPhase = room.gameState.phase;
    const prevActiveIndex = room.gameState.activePlayerIndex;

    const { state: nextState, events } = OneMonopolyEngine.dispatch(room.gameState, action, playerId);
    if (isTradeAction && nextState === room.gameState) {
      return { success: false, error: 'Đề nghị giao dịch đã thay đổi hoặc thao tác không hợp lệ.' };
    }
    if (isAuctionAction && nextState.phase === prevPhase && nextState.auction?.revision === room.gameState.auction?.revision) {
      return { success: false, error: 'Lượt đấu giá đã thay đổi hoặc giá đặt không hợp lệ.' };
    }
    if (!isTradeAction && (prevPhase === 'AWAITING_STORM_DECISION' || action.type === 'RESOLVE_STORM') &&
        !events.some((event) => event.type === 'STORM_RESOLVED')) {
      return { success: false, error: 'Không thể thực hiện lựa chọn ứng phó bão này.' };
    }
    room.gameState = nextState;

    // A doubles roll can open and close an auction in one dispatch when nobody can bid.
    const auctionEnded = events.some((event) => event.type === 'AUCTION_ENDED');
    if (nextState.winnerId) {
      room.timer?.stop();
    } else if (isAuctionAction || auctionEnded || nextState.phase !== prevPhase || nextState.activePlayerIndex !== prevActiveIndex) {
      room.timer?.reset(nextState.phase === 'AWAITING_AUCTION' ? AUCTION_BID_SECONDS : TURN_SECONDS);
    }

    if (this.onBroadcastUpdate) {
      this.onBroadcastUpdate(room.id, nextState, events);
    }

    return { success: true, state: nextState, events };
  }

  public handleAFKTimeout(roomId: string): void {
    const room = this.getRoom(roomId);
    if (!room || !room.gameState || room.gameState.winnerId) return;

    const activePlayer = room.gameState.players[room.gameState.activePlayerIndex];
    if (!activePlayer) return;

    switch (room.gameState.phase) {
      case 'WAIT_FOR_ROLL':
        this.dispatchAction(roomId, activePlayer.id, { type: 'ROLL_DICE' });
        break;
      case 'AWAITING_BUY_DECISION':
        this.dispatchAction(roomId, activePlayer.id, { type: 'SKIP_BUY' });
        break;
      case 'AWAITING_AUCTION': {
        const auction = room.gameState.auction;
        if (auction) {
          this.dispatchAction(roomId, auction.bidderId, {
            type: 'AUCTION_PASS', auctionId: auction.id, revision: auction.revision,
          });
        }
        break;
      }
      case 'AWAITING_STORM_DECISION':
        this.dispatchAction(roomId, activePlayer.id, { type: 'RESOLVE_STORM', choice: 'DRIFT' });
        break;
      case 'AWAITING_SLOT_CHARTER_RESPONSE': {
        const charter = room.gameState.pendingSlotCharter;
        if (charter) {
          this.dispatchAction(roomId, charter.ownerId, { type: 'RESPOND_SLOT_CHARTER', accept: false });
        }
        break;
      }
      case 'AWAITING_DEBT_RESOLUTION':
        this.dispatchAction(roomId, activePlayer.id, { type: 'DECLARE_BANKRUPTCY' });
        break;
      case 'END_OF_TURN':
        this.dispatchAction(roomId, activePlayer.id, { type: 'END_TURN' });
        break;
    }
  }

  public handleDisconnect(socketId: string): void {
    for (const room of this.rooms.values()) {
      const playerId = room.socketToPlayer.get(socketId);
      if (playerId) {
        room.socketToPlayer.delete(socketId);
        room.playerToSocket.delete(playerId);
        const player = room.players.find((p) => p.id === playerId);
        if (player) {
          player.isOnline = false;
        }

        if (room.gameState) {
          const gp = room.gameState.players.find((p) => p.id === playerId);
          if (gp) gp.isOnline = false;
        }

        if (this.onLobbyUpdate) {
          this.onLobbyUpdate(room.id);
        }
        break;
      }
    }
  }
}
