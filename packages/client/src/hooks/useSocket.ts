import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { GameAction, GameEvent, GameState, VesselToken } from '@one-monopoly/shared';

export interface RoomState {
  id: string;
  hostId: string;
  players: Array<{
    id: string;
    name: string;
    token: VesselToken;
    isReady: boolean;
    isOnline: boolean;
  }>;
  isGameStarted: boolean;
  hasActiveGame: boolean;
}

export interface ReactionEvent {
  id: string;
  playerId: string;
  emoji: string;
}

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState<RoomState | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [turnTimer, setTurnTimer] = useState<{ seconds: number; playerId: string } | null>(null);
  const [latestEvents, setLatestEvents] = useState<GameEvent[]>([]);
  const [reactions, setReactions] = useState<ReactionEvent[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const rollTimerRef = useRef<any>(null);

  // Initialize socket
  useEffect(() => {
    const serverUrl = (import.meta as any).env?.VITE_SERVER_URL || undefined;
    const socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      // Check auto-reconnect from localStorage
      const savedRoomId = localStorage.getItem('one_monopoly_room_id');
      const savedSessionToken = localStorage.getItem('one_monopoly_session_token');
      const savedPlayerName = localStorage.getItem('one_monopoly_player_name') || 'Captain ONE';
      const savedToken = (localStorage.getItem('one_monopoly_token') as VesselToken) || 'ONE_APUS';

      if (savedRoomId && savedSessionToken) {
        socket.emit(
          'room:join',
          {
            roomId: savedRoomId,
            playerName: savedPlayerName,
            token: savedToken,
            sessionToken: savedSessionToken,
          },
          (res: any) => {
            if (res?.success) {
              setRoom(res.room);
              setMyPlayerId(res.playerId);
              if (res.gameState) {
                setGameState(res.gameState);
              }
            }
          }
        );
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('room:state', (roomData: RoomState) => {
      setRoom(roomData);
    });

    socket.on('game:init', (data: { state: GameState }) => {
      setGameState(data.state);
    });

    socket.on('game:update', (data: { state: GameState; events: GameEvent[] }) => {
      const hasDiceRoll = data.events?.some((e) => e.type === 'DICE_ROLLED');
      if (hasDiceRoll) {
        setIsRolling(true);
        if (rollTimerRef.current) clearTimeout(rollTimerRef.current);
        rollTimerRef.current = setTimeout(() => {
          setIsRolling(false);
        }, 950);
      }
      setGameState(data.state);
      if (data.events && data.events.length > 0) {
        setLatestEvents(data.events);
      }
    });

    socket.on('game:timer', (data: { remainingSeconds: number; playerId: string }) => {
      setTurnTimer({ seconds: data.remainingSeconds, playerId: data.playerId });
    });

    socket.on('game:reaction', (data: { playerId: string; emoji: string }) => {
      const rx: ReactionEvent = {
        id: Math.random().toString(),
        playerId: data.playerId,
        emoji: data.emoji,
      };
      setReactions((prev) => [...prev.slice(-10), rx]);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback(
    (playerName: string, token: VesselToken) => {
      if (!socketRef.current) return;
      socketRef.current.emit(
        'room:create',
        { playerName, token },
        (res: any) => {
          if (res?.success) {
            setRoom(res.room);
            setMyPlayerId(res.playerId);
            localStorage.setItem('one_monopoly_room_id', res.roomId);
            localStorage.setItem('one_monopoly_session_token', res.sessionToken);
            localStorage.setItem('one_monopoly_player_name', playerName);
            localStorage.setItem('one_monopoly_token', token);
          } else {
            setErrorMsg(res?.error || 'Không thể tạo phòng!');
          }
        }
      );
    },
    []
  );

  const joinRoom = useCallback(
    (roomId: string, playerName: string, token: VesselToken) => {
      if (!socketRef.current) return;
      socketRef.current.emit(
        'room:join',
        { roomId, playerName, token },
        (res: any) => {
          if (res?.success) {
            setRoom(res.room);
            setMyPlayerId(res.playerId);
            localStorage.setItem('one_monopoly_room_id', res.roomId);
            localStorage.setItem('one_monopoly_session_token', res.sessionToken);
            localStorage.setItem('one_monopoly_player_name', playerName);
            localStorage.setItem('one_monopoly_token', token);
          } else {
            setErrorMsg(res?.error || 'Không thể tham gia phòng!');
          }
        }
      );
    },
    []
  );

  const toggleReady = useCallback(
    (isReady: boolean) => {
      if (!socketRef.current || !room || !myPlayerId) return;
      socketRef.current.emit('room:ready', {
        roomId: room.id,
        playerId: myPlayerId,
        isReady,
      });
    },
    [room, myPlayerId]
  );

  const startGame = useCallback(() => {
    if (!socketRef.current || !room || !myPlayerId) return;
    socketRef.current.emit('room:start', {
      roomId: room.id,
      playerId: myPlayerId,
    });
  }, [room, myPlayerId]);

  const sendAction = useCallback(
    (action: GameAction) => {
      if (!socketRef.current || !room || !myPlayerId) return;
      if (action.type === 'ROLL_DICE') {
        setIsRolling(true);
      }
      socketRef.current.emit(
        'game:action',
        { roomId: room.id, playerId: myPlayerId, action },
        (res: any) => {
          if (!res?.success) {
            setErrorMsg(res?.error || 'Thao tác không thành công');
          }
        }
      );
    },
    [room, myPlayerId]
  );

  const sendReaction = useCallback(
    (emoji: string) => {
      if (!socketRef.current || !room || !myPlayerId) return;
      socketRef.current.emit('game:reaction', {
        roomId: room.id,
        playerId: myPlayerId,
        emoji,
      });
    },
    [room, myPlayerId]
  );

  const leaveRoom = useCallback(() => {
    localStorage.removeItem('one_monopoly_room_id');
    localStorage.removeItem('one_monopoly_session_token');
    setRoom(null);
    setGameState(null);
    setMyPlayerId(null);
    window.location.reload();
  }, []);

  return {
    isConnected,
    room,
    gameState,
    myPlayerId,
    turnTimer,
    latestEvents,
    reactions,
    errorMsg,
    isRolling,
    clearError: () => setErrorMsg(null),
    createRoom,
    joinRoom,
    toggleReady,
    startGame,
    sendAction,
    sendReaction,
    leaveRoom,
  };
}
