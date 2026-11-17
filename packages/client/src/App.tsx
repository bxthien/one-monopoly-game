import React, { useState, useEffect } from 'react';
import { GameCard, GameEvent } from '@one-monopoly/shared';
import { useSocket } from './hooks/useSocket.js';
import { Lobby } from './components/Lobby.js';
import { Board } from './components/Board.js';
import { PlayerSidebar } from './components/PlayerSidebar.js';
import { ReactionFloatingBar } from './components/ReactionFloatingBar.js';
import { GameOverModal } from './components/GameOverModal.js';
import { Anchor, LogOut, Radio, AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const {
    isConnected,
    room,
    gameState,
    myPlayerId,
    turnTimer,
    latestEvents,
    reactions,
    errorMsg,
    clearError,
    createRoom,
    joinRoom,
    toggleReady,
    startGame,
    sendAction,
    sendReaction,
    leaveRoom,
  } = useSocket();

  const [activeCard, setActiveCard] = useState<GameCard | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [eventLogs, setEventLogs] = useState<string[]>([]);

  // Listen to new events and process animation & log
  useEffect(() => {
    if (latestEvents.length === 0) return;

    for (const evt of latestEvents) {
      if (evt.type === 'DICE_ROLLED') {
        setIsRolling(true);
        setTimeout(() => setIsRolling(false), 600);
      }

      if (evt.type === 'CARD_DRAWN') {
        setActiveCard(evt.card);
      }

      // Add to event logs
      let logMsg = '';
      if (evt.type === 'DICE_ROLLED') {
        logMsg = `🎲 Đổ được ${evt.dice[0]} + ${evt.dice[1]} = ${evt.dice[0] + evt.dice[1]}`;
      } else if (evt.type === 'PASSED_GO') {
        logMsg = `🏁 Đi qua Singapore Hub nhận $${evt.reward}M`;
      } else if (evt.type === 'TILE_PURCHASED') {
        logMsg = `🏗️ Đã mua ô #${evt.tileId} với giá $${evt.price}M`;
      } else if (evt.type === 'DEMURRAGE_PAID') {
        logMsg = `💸 Nộp $${evt.amount}M phí lưu bãi`;
      } else if (evt.type === 'SENT_TO_HOLD') {
        logMsg = `⚓ Bị giữ tàu kiểm hóa: ${evt.reason}`;
      } else if (evt.type === 'RELEASED_FROM_HOLD') {
        logMsg = `🚢 Đã được thông quan hải quan`;
      } else if (evt.type === 'CONTAINER_BUILT') {
        logMsg = `📦 Nâng cấp container lên cấp ${evt.newLevel}`;
      } else if (evt.type === 'CONTAINER_SOLD') {
        logMsg = `💰 Bán bớt container thu hồi $${evt.refund}M`;
      } else if (evt.type === 'PLAYER_BANKRUPT') {
        logMsg = `💥 Người chơi đã tuyên bố phá sản!`;
      }

      if (logMsg) {
        setEventLogs((prev) => [logMsg, ...prev.slice(0, 15)]);
      }
    }
  }, [latestEvents]);

  return (
    <div className="min-h-screen bg-[#F4F6F9] flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 px-6 py-3.5 sticky top-0 z-30 shadow-xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#E1007A] flex items-center justify-center text-white font-black text-base shadow-sm">
            ONE
          </div>
          <div>
            <h1 className="text-base font-black text-gray-900 tracking-tight leading-none">
              ONE MONOPOLY
            </h1>
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              Ocean Network Express Logistics
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
            <Radio
              className={`w-3.5 h-3.5 ${
                isConnected ? 'text-emerald-500 animate-pulse' : 'text-red-500'
              }`}
            />
            <span>{isConnected ? 'Đã kết nối' : 'Đang kết nối...'}</span>
          </div>

          {room && (
            <button
              onClick={leaveRoom}
              className="p-2 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition"
              title="Rời phòng"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Global Toast Error Alert */}
      {errorMsg && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl flex items-center gap-2 z-50 animate-bounce">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
          <button onClick={clearError} className="ml-2 font-black text-sm">
            ×
          </button>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-4 max-w-7xl mx-auto w-full flex items-start justify-center">
        {!room || !gameState ? (
          <Lobby
            room={room}
            myPlayerId={myPlayerId}
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
            onToggleReady={toggleReady}
            onStartGame={startGame}
            onLeaveRoom={leaveRoom}
          />
        ) : (
          <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Monopoly Board 11x11 */}
            <div className="lg:col-span-8 flex justify-center">
              <Board
                gameState={gameState}
                myPlayerId={myPlayerId}
                onAction={sendAction}
                isRolling={isRolling}
                activeCard={activeCard}
                onCloseCard={() => setActiveCard(null)}
              />
            </div>

            {/* Right: Sidebar Players & Activity Log */}
            <div className="lg:col-span-4 flex flex-col gap-4">
              <PlayerSidebar
                gameState={gameState}
                myPlayerId={myPlayerId}
                turnTimer={turnTimer}
              />

              {/* Live Activity Log */}
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  NHẬT KÝ VẬN HÀNH (LOGISTICS LOG)
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto text-xs text-gray-600 font-medium">
                  {eventLogs.length === 0 ? (
                    <div className="text-gray-400 italic">Ván chơi mới bắt đầu...</div>
                  ) : (
                    eventLogs.map((log, idx) => (
                      <div key={idx} className="py-0.5 border-b border-gray-50 last:border-0 truncate">
                        {log}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Floating Reactions & Game Over Modal */}
      {room && gameState && (
        <>
          <ReactionFloatingBar reactions={reactions} onSendReaction={sendReaction} />
          <GameOverModal gameState={gameState} onRestart={leaveRoom} />
        </>
      )}
    </div>
  );
};
