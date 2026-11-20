import { Server as HttpServer } from 'node:http';
import { Server, Socket } from 'socket.io';
import { GameAction, GameState, VesselToken } from '@one-monopoly/shared';
import { getTimerPlayerId, Room, RoomManager } from './roomManager.js';

export function gameStateForPlayer(state: GameState, viewerId: string | undefined): GameState {
  return {
    ...state,
    players: state.players.map((player) => {
      if (player.id === viewerId || !player.secretMission || player.secretMission.isCompleted) return player;
      const { secretMission, ...publicPlayer } = player;
      return publicPlayer;
    }),
  };
}

export function setupSocketServer(httpServer: HttpServer): { io: Server; roomManager: RoomManager } {
  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const serializeRoom = (room: Room) => ({
    id: room.id,
    hostId: room.hostId,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      token: p.token,
      isReady: p.isReady,
      isOnline: p.isOnline,
    })),
    isGameStarted: room.isGameStarted,
    hasActiveGame: !!room.gameState,
  });

  const roomManager = new RoomManager({
    onBroadcastUpdate: (roomId, state, events) => {
      const room = roomManager.getRoom(roomId);
      if (!room) return;
      for (const [socketId, playerId] of room.socketToPlayer) {
        io.to(socketId).emit('game:update', { state: gameStateForPlayer(state, playerId), events });
      }
    },
    onTimerTick: (roomId, remainingSeconds, playerId) => {
      io.to(roomId).emit('game:timer', { remainingSeconds, playerId });
    },
    onLobbyUpdate: (roomId) => {
      const room = roomManager.getRoom(roomId);
      if (room) {
        io.to(roomId).emit('room:state', serializeRoom(room));
      }
    },
  });

  io.on('connection', (socket: Socket) => {
    // 1. Create Room
    socket.on(
      'room:create',
      (
        data: { playerName: string; token: VesselToken },
        callback?: (res: any) => void
      ) => {
        const { room, sessionToken, playerId } = roomManager.createRoom(
          data.playerName,
          data.token,
          socket.id
        );
        socket.join(room.id);
        const serialized = serializeRoom(room);
        io.to(room.id).emit('room:state', serialized);
        if (callback) {
          callback({
            success: true,
            roomId: room.id,
            playerId,
            sessionToken,
            room: serialized,
          });
        }
      }
    );

    // 2. Join Room (or Reconnect)
    socket.on(
      'room:join',
      (
        data: {
          roomId: string;
          playerName: string;
          token: VesselToken;
          sessionToken?: string;
        },
        callback?: (res: any) => void
      ) => {
        const result = roomManager.joinRoom(
          data.roomId,
          data.playerName,
          data.token,
          socket.id,
          data.sessionToken
        );

        if (!result.success || !result.room) {
          if (callback) callback({ success: false, error: result.error });
          return;
        }

        socket.join(result.room.id);
        const serialized = serializeRoom(result.room);
        io.to(result.room.id).emit('room:state', serialized);

        // If reconnecting to an ongoing game, send latest GameState
        const state = result.room.gameState && gameStateForPlayer(result.room.gameState, result.playerId);
        if (result.isReconnect && state) {
          socket.emit('game:init', {
            state,
          });
          if (result.room.timer && !state.winnerId) {
            socket.emit('game:timer', {
              remainingSeconds: result.room.timer.getRemainingSeconds(),
              playerId: getTimerPlayerId(state),
            });
          }
        }

        if (callback) {
          callback({
            success: true,
            roomId: result.room.id,
            playerId: result.playerId,
            sessionToken: result.sessionToken,
            room: serialized,
            isReconnect: result.isReconnect,
            gameState: state,
          });
        }
      }
    );

    // 3. Ready Toggle
    socket.on(
      'room:ready',
      (data: { roomId: string; playerId: string; isReady: boolean }) => {
        roomManager.setReady(data.roomId, data.playerId, data.isReady);
      }
    );

    // 4. Start Game
    socket.on(
      'room:start',
      (data: { roomId: string; playerId: string }, callback?: (res: any) => void) => {
        const result = roomManager.startGame(data.roomId, data.playerId);
        if (callback) callback(result);
      }
    );

    // 5. Game Action
    socket.on(
      'game:action',
      (
        data: { roomId: string; playerId: string; action: GameAction },
        callback?: (res: any) => void
      ) => {
        const result = roomManager.dispatchSocketAction(socket.id, data);
        if (callback) {
          // A successful dispatch has matched data.playerId to this socket's seat.
          callback(result.state ? { ...result, state: gameStateForPlayer(result.state, data.playerId) } : result);
        }
      }
    );

    // 6. Quick Reaction / Emote
    socket.on(
      'game:reaction',
      (data: { roomId: string; playerId: string; emoji: string }) => {
        io.to(data.roomId).emit('game:reaction', {
          playerId: data.playerId,
          emoji: data.emoji,
        });
      }
    );

    // 7. Disconnect
    socket.on('disconnect', () => {
      roomManager.handleDisconnect(socket.id);
    });
  });

  return { io, roomManager };
}
