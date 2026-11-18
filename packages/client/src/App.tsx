import React, { useState, useEffect } from 'react';
import { GameCard, GameEvent } from '@one-monopoly/shared';
import { useSocket } from './hooks/useSocket.js';
import { Lobby } from './components/Lobby.js';
import { Board } from './components/Board.js';
import { PlayerSidebar } from './components/PlayerSidebar.js';
import { ActionControls } from './components/ActionControls.js';
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
  const [is3D, setIs3D] = useState(true);

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
      } else if (evt.type === 'GREEN_FLEET_UPGRADED') {
        logMsg = `🌱 Nâng cấp Tàu Nhiên Liệu Xanh (Green Fuel Ready)`;
      } else if (evt.type === 'SLOT_CHARTER_ACCEPTED') {
        logMsg = `🤝 Liên minh "As ONE, We Can": Chia sẻ chỗ thành công (giảm 50% cước)`;
      } else if (evt.type === 'SLOT_CHARTER_RENT_SPLIT') {
        logMsg = `⚓ Chia đôi 50/50 doanh thu cước cảng cho 2 bên liên minh`;
      } else if (evt.type === 'MISSION_COMPLETED') {
        logMsg = `🎯 Hoàn thành ${evt.mission.title} (+${evt.reward}M)!`;
      } else if (evt.type === 'CARBON_TAX_EXEMPTED') {
        logMsg = `🌱 Miễn 100% Thuế Carbon nhờ Tàu Nhiên Liệu Xanh`;
      } else if (evt.type === 'PLAYER_BANKRUPT') {
        logMsg = `💥 Người chơi đã tuyên bố phá sản!`;
      }

      if (logMsg) {
        setEventLogs((prev) => [logMsg, ...prev.slice(0, 15)]);
      }
    }
  }, [latestEvents]);

  return (
    <div className="w-screen h-screen overflow-hidden flex flex-col bg-[#F4F6F9] font-sans select-none relative">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-200 px-4 py-2 sticky top-0 z-50 shadow-xs flex items-center justify-between h-12 shrink-0">
        {/* Left: Logo & Title */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#E1007A] flex items-center justify-center text-white font-black text-sm shadow-sm">
            ONE
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-black text-gray-900 tracking-tight leading-none">
              ONE MONOPOLY
            </h1>
            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              Ocean Network Express Logistics
            </span>
          </div>
        </div>

        {/* Center: Góc Nhìn UI Toggle (2D / 3D) & Thông Tin Vòng / Phòng */}
        {gameState && (
          <div className="flex items-center gap-3">
            {/* UI Toggle Switch: 2D vs 3D */}
            <div className="flex items-center gap-2 bg-gray-100/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-gray-200 shadow-inner">
              <span
                className={`text-[11px] font-bold cursor-pointer ${
                  !is3D ? 'text-gray-900' : 'text-gray-400'
                }`}
                onClick={() => setIs3D(false)}
              >
                2D
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={is3D}
                onClick={() => setIs3D(!is3D)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  is3D ? 'bg-[#E1007A]' : 'bg-gray-300'
                }`}
                title={`Chuyển sang góc nhìn ${is3D ? '2D' : '3D'}`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center text-[9px] ${
                    is3D ? 'translate-x-5' : 'translate-x-0'
                  }`}
                >
                  {is3D ? '🎲' : '📐'}
                </span>
              </button>
              <span
                className={`text-[11px] font-bold cursor-pointer ${
                  is3D ? 'text-[#E1007A]' : 'text-gray-400'
                }`}
                onClick={() => setIs3D(true)}
              >
                3D
              </span>
            </div>

            {/* Vòng & Phòng Badge */}
            <div className="text-[11px] font-bold text-gray-600 bg-gray-100 px-2.5 py-1 rounded-xl border border-gray-200 hidden md:block">
              VÒNG {gameState.turnCount} • PHÒNG {gameState.roomId}
            </div>
          </div>
        )}

        {/* Right: Trạng Thái, Nhật Ký & Nút Thoát */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-xl border border-gray-100">
            <Radio
              className={`w-3.5 h-3.5 ${
                isConnected ? 'text-emerald-500 animate-pulse' : 'text-red-500'
              }`}
            />
            <span className="hidden sm:inline">
              {isConnected ? 'Đã kết nối' : 'Đang kết nối...'}
            </span>
          </div>

          {/* Nhật ký vận hành thu gọn dạng dropdown */}
          {gameState && (
            <details className="group relative">
              <summary className="list-none cursor-pointer bg-white px-2.5 py-1 rounded-xl shadow-xs border border-gray-200 text-xs font-bold text-gray-600 hover:text-gray-900 flex items-center gap-1 transition">
                <span>📋 Nhật ký ({eventLogs.length})</span>
              </summary>
              <div className="absolute right-0 top-9 w-72 bg-white/95 backdrop-blur-md rounded-2xl p-3 shadow-xl border border-gray-200 z-50 text-xs">
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1.5 pb-1 border-b">
                  NHẬT KÝ VẬN HÀNH
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto text-gray-600">
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
            </details>
          )}

          {room && (
            <button
              onClick={leaveRoom}
              className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-xl transition"
              title="Rời phòng"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </header>

      {/* Global Toast Error Alert */}
      {errorMsg && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 bg-red-600 text-white text-xs font-bold px-4 py-2 rounded-2xl shadow-xl flex items-center gap-2 z-50 animate-bounce">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
          <button onClick={clearError} className="ml-2 font-black text-sm">
            ×
          </button>
        </div>
      )}

      {/* Main Content Area */}
      {!room || !gameState ? (
        <main className="flex-1 w-full h-[calc(100vh-3rem)] flex items-center justify-center p-4 overflow-y-auto">
          <Lobby
            room={room}
            myPlayerId={myPlayerId}
            onCreateRoom={createRoom}
            onJoinRoom={joinRoom}
            onToggleReady={toggleReady}
            onStartGame={startGame}
            onLeaveRoom={leaveRoom}
          />
        </main>
      ) : (
        <main className="relative flex-1 w-full h-[calc(100vh-3rem)] overflow-hidden">
          {/* LAYER 0: Bàn Cờ Nằm Ở Chính Giữa Màn Hình (Zoom to, Rõ nét) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto">
              <Board
                gameState={gameState}
                myPlayerId={myPlayerId}
                onAction={sendAction}
                isRolling={isRolling}
                activeCard={activeCard}
                onCloseCard={() => setActiveCard(null)}
                is3D={is3D}
              />
            </div>
          </div>

          {/* LAYER 1: Thông Tin Người Chơi (Góc Trên Bên Trái, Dùng Absolute Đè Lên) */}
          <div className="absolute top-3 left-4 z-40 pointer-events-auto">
            <PlayerSidebar
              gameState={gameState}
              myPlayerId={myPlayerId}
              turnTimer={turnTimer}
              onAction={sendAction}
            />
          </div>

          {/* LAYER 2: Action Controls (Docked Góc Dưới Trung Tâm, Dùng Absolute) */}
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-40 max-w-md w-full px-4 pointer-events-auto">
            <div className="bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-xl border-2 border-pink-100">
              <ActionControls
                gameState={gameState}
                myPlayerId={myPlayerId}
                onAction={sendAction}
                isRolling={isRolling}
              />
            </div>
          </div>
        </main>
      )}

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
