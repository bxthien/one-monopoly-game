import React, { useEffect, useId, useRef } from 'react';
import confetti from 'canvas-confetti';
import { getLogisticsStandings, LOGISTICS_DELIVERY_TARGET, LOGISTICS_ROUND_LIMIT, type GameState } from '@one-monopoly/shared';
import { Trophy, RotateCcw } from 'lucide-react';
import { BoardDialog } from './BoardDialog.js';
import { TokenBadge } from './TokenBadge.js';
import './freight-scoreboard.css';

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
  const standings = gameState.mode === 'logistics' && gameState.logistics ? getLogisticsStandings(gameState) : null;
  const reachedTarget = standings?.some(row => row.deliveries >= LOGISTICS_DELIVERY_TARGET);
  const tiedForLead = standings && standings.length > 1 && standings[0].deliveries === standings[1].deliveries;
  const tiedOnEarnings = tiedForLead && standings[0].earnings === standings[1].earnings;

  return (
    <BoardDialog labelledBy={`${titleId}-result ${titleId}`}>
      <div className="chart-dialog-sheet chart-winner-sheet">
        <canvas ref={confettiRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 h-full w-full" />
        <span className="chart-event-icon" aria-hidden="true"><Trophy size={28} /></span>
        <p id={`${titleId}-result`} className="chart-dialog-kicker">{standings ? 'Kết quả vận tải ONE' : 'Vô địch hải trình ONE'}</p>
        <h2 id={titleId} className="chart-dialog-title">{winner.name}</h2>
        {standings ? (
          <>
            <p className="chart-dialog-copy">
              {reachedTarget
                ? `Đã khép lại vòng ${gameState.turnCount} sau khi có đội giao đủ ${LOGISTICS_DELIVERY_TARGET} chuyến.`
                : `Đã hoàn thành ${LOGISTICS_ROUND_LIMIT} vòng vận tải.`}
              {' '}{tiedOnEarnings ? 'Bằng số chuyến và tiền cước, các đội xếp theo thứ tự ghế ban đầu.'
                : tiedForLead ? 'Cùng số chuyến đã giao, đội thu được nhiều tiền cước hơn xếp trên.'
                  : 'Đội giao được nhiều chuyến nhất đứng đầu.'}
            </p>
            <table className="freight-standings">
              <caption>Bảng xếp hạng</caption>
              <thead><tr><th scope="col">Đội tàu</th><th scope="col">Đã giao</th><th scope="col">Tiền cước</th></tr></thead>
              <tbody>
                {standings.map((row, index) => {
                  const captain = gameState.players.find(player => player.id === row.playerId)!;
                  return (
                    <tr key={row.playerId}>
                      <th scope="row"><span className="freight-place">{index + 1}.</span> {captain.name}</th>
                      <td><strong>{row.deliveries}</strong><small>{row.deliveries - row.emptyDeliveries} hàng · {row.emptyDeliveries} rỗng</small></td>
                      <td>${row.earnings.toLocaleString('en-US')}M</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </>
        ) : (
          <div className="chart-winner-balance">
            <TokenBadge token={winner.token} size="md" />
            <div>
              <span className="chart-dialog-kicker">Số dư cuối ván</span>
              <strong className="block">${winner.balance.toLocaleString('en-US')}M</strong>
            </div>
          </div>
        )}
        <button type="button" onClick={onRestart} className="chart-button chart-button-primary chart-button-wide">
          <RotateCcw size={18} aria-hidden="true" /> CHƠI LẠI VÁN MỚI
        </button>
      </div>
    </BoardDialog>
  );
};
