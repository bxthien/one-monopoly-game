import React, { useState, useEffect } from 'react';
import { BOARD_TILES, GameCard } from '@one-monopoly/shared';
import { useSocket } from './hooks/useSocket.js';
import { Lobby } from './components/Lobby.js';
import { Board } from './components/Board.js';
import { PlayerSidebar } from './components/PlayerSidebar.js';
import { ActionControls } from './components/ActionControls.js';
import { ReactionFloatingBar } from './components/ReactionFloatingBar.js';
import { GameOverModal } from './components/GameOverModal.js';
import { AlertCircle, BookOpen, Box, Compass, LogOut, Map, MapPin, Radio, X } from 'lucide-react';

export const App: React.FC = () => {
  const {
    isConnected,
    subscribeBoard,
    room,
    gameState,
    myPlayerId,
    turnTimer,
    latestEvents,
    reactions,
    errorMsg,
    isRolling,
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
  const [isPawnMoving, setIsPawnMoving] = useState(false);
  const pendingCardRef = React.useRef<GameCard | null>(null);
  const [eventLogs, setEventLogs] = useState<string[]>([]);
  const [is3D, setIs3D] = useState(true);

  // Khi xúc xắc đã dừng và nhân vật đã lướt tới bến đích -> Mới hiển thị thẻ bài (Chance/Chest)
  useEffect(() => {
    if (!isRolling && !isPawnMoving && pendingCardRef.current) {
      const card = pendingCardRef.current;
      const timer = setTimeout(() => {
        pendingCardRef.current = null;
        setActiveCard(card);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isRolling, isPawnMoving]);

  // Listen to new events and process animation & log
  useEffect(() => {
    if (latestEvents.length === 0) return;

    for (const evt of latestEvents) {
      if (evt.type === 'CARD_DRAWN') {
        // Lưu vào hàng đợi, chờ xúc xắc xong và nhân vật cập bến mới mở thẻ
        pendingCardRef.current = evt.card;
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
        logMsg = `⚓ Chủ cảng nhận $${evt.ownerAmount ?? evt.splitAmount}M, đối tác nhận $${evt.splitAmount}M`;
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

  const activePlayer = gameState?.players[gameState.activePlayerIndex];

  return (
    <div className="chart-app">
      <header className="chart-masthead">
        <div className="chart-brand">
          <Compass aria-hidden="true" />
          <div><strong>ONE</strong> <span>Monopoly</span></div>
        </div>
        <nav className="chart-nav" aria-label="Thông tin phòng">
          {room && <span className="chart-room">Phòng <b>{room.id}</b></span>}
          <span className={`chart-connection ${isConnected ? 'online' : ''}`} title={isConnected ? 'Đã kết nối' : 'Đang kết nối...'}>
            <Radio size={16} aria-hidden="true" />
            <span>{isConnected ? 'Đã kết nối' : 'Đang kết nối...'}</span>
          </span>
          {gameState && (
            <details className="chart-log">
              <summary aria-label="Nhật ký vận hành"><BookOpen size={17} /> <span>Nhật ký</span></summary>
              <div className="chart-log-popover">
                <h2>Nhật ký vận hành</h2>
                {eventLogs.length === 0
                  ? <p>Ván chơi mới bắt đầu.</p>
                  : <ol>{eventLogs.map((log, idx) => <li key={idx}>{log}</li>)}</ol>}
              </div>
            </details>
          )}
          {room && <button className="chart-nav-icon" onClick={leaveRoom} title="Rời phòng" aria-label="Rời phòng"><LogOut size={17} /></button>}
        </nav>
      </header>

      {errorMsg && (
        <div className="chart-error" role="alert">
          <AlertCircle size={17} />
          <span>{errorMsg}</span>
          <button onClick={clearError} aria-label="Đóng thông báo"><X size={16} /></button>
        </div>
      )}

      {!room || !gameState || !activePlayer ? (
        <main className="chart-lobby-main">
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
        <main className="game-table">
          <section className="chart-sheet" aria-label="Hải đồ hành trình">
            <header className="chart-sheet-header">
              <div className="chart-sheet-heading">
                <h1>Hải đồ</h1>
                <span>Vòng {gameState.turnCount}</span>
              </div>
              <div className="chart-view-picker" role="group" aria-label="Góc nhìn bàn cờ">
                <button type="button" aria-pressed={!is3D} onClick={() => setIs3D(false)}><Map size={15} />2D</button>
                <button type="button" aria-pressed={is3D} onClick={() => setIs3D(true)}><Box size={15} />3D</button>
              </div>
            </header>
            <div className="board-viewport">
              <Board
                gameState={gameState}
                subscribeBoard={subscribeBoard}
                myPlayerId={myPlayerId}
                onAction={sendAction}
                isRolling={isRolling}
                activeCard={activeCard}
                onCloseCard={() => setActiveCard(null)}
                is3D={is3D}
                onPawnMovingChange={setIsPawnMoving}
              />
            </div>
            <div className="chart-position"><MapPin size={14} /><span>Vị trí tàu</span><strong>{BOARD_TILES[activePlayer.position].name}</strong></div>
          </section>
          <aside className="table-controls">
            <PlayerSidebar gameState={gameState} myPlayerId={myPlayerId} turnTimer={turnTimer} />
            <div className="table-actions">
              <ActionControls
                gameState={gameState}
                myPlayerId={myPlayerId}
                onAction={sendAction}
                isRolling={isRolling}
                isPawnMoving={isPawnMoving}
              />
            </div>
            <ReactionFloatingBar reactions={reactions} onSendReaction={sendReaction} />
          </aside>
          <GameOverModal gameState={gameState} onRestart={leaveRoom} />
        </main>
      )}
    </div>
  );
};
