import React, { useEffect, useId, useRef } from 'react';
import confetti from 'canvas-confetti';
import { GameState } from '@one-monopoly/shared';
import { Trophy, RotateCcw } from 'lucide-react';
import { BoardDialog } from './BoardDialog.js';
import { TokenBadge } from './TokenBadge.js';

interface Props {
  gameState: GameState;
  onRestart: () => void;
}

export const GameOverModal: React.FC<Props> = ({ gameState, onRestart }) => {
  const titleId = useId();
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const winner = gameState.players.find((player) => player.id === gameState.winnerId);
  const winnerId = winner?.id;

  useEffect(() => {
    if (!winnerId || !confettiRef.current) return;
    const celebrate = confetti.create(confettiRef.current, { resize: true, disableForReducedMotion: true });
    celebrate({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.65 },
      colors: ['#c4006a', '#183950', '#cca167', '#66a9ac'],
    });
    return () => celebrate.reset();
  }, [winnerId]);

  if (!winner) return null;

  return (
    <BoardDialog labelledBy={`${titleId}-result ${titleId}`}>
      <div className="chart-dialog-sheet chart-winner-sheet">
        <canvas ref={confettiRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 h-full w-full" />
        <span className="chart-event-icon" aria-hidden="true"><Trophy size={28} /></span>
        <p id={`${titleId}-result`} className="chart-dialog-kicker">VÔ ĐỊCH HẢI TRÌNH ONE</p>
        <h2 id={titleId} className="chart-dialog-title">{winner.name}</h2>
        <p className="chart-dialog-copy">
          Đã thống trị toàn bộ mạng lưới cảng biển và đánh bại mọi đối thủ trên đại dương!
        </p>
        <div className="chart-winner-balance">
          <TokenBadge token={winner.token} size="md" />
          <div>
            <span className="chart-dialog-kicker">TÀI SẢN KẾT THÚC</span>
            <strong className="block">${winner.balance}M</strong>
          </div>
        </div>
        <button type="button" onClick={onRestart} className="chart-button chart-button-primary chart-button-wide">
          <RotateCcw size={18} aria-hidden="true" /> CHƠI LẠI VÁN MỚI
        </button>
      </div>
    </BoardDialog>
  );
};
