import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { GameState } from '@one-monopoly/shared';
import { TOKEN_CONFIG, TokenBadge } from './TokenBadge.js';
import { Trophy, RotateCcw } from 'lucide-react';

interface Props {
  gameState: GameState;
  onRestart: () => void;
}

export const GameOverModal: React.FC<Props> = ({ gameState, onRestart }) => {
  if (!gameState.winnerId) return null;

  const winner = gameState.players.find((p) => p.id === gameState.winnerId);
  if (!winner) return null;

  const cfg = TOKEN_CONFIG[winner.token];

  useEffect(() => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
    });
  }, []);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-gray-100 text-center relative">
        <div className="w-20 h-20 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Trophy className="w-10 h-10" />
        </div>

        <span className="text-xs font-black uppercase tracking-widest text-[#E1007A] bg-pink-50 px-3 py-1 rounded-full border border-pink-200">
          VÔ ĐỊCH HẢI TRÌNH ONE
        </span>

        <h2 className="text-3xl font-black text-gray-900 mt-3 mb-2">{winner.name}</h2>
        <p className="text-sm text-gray-500 mb-6">
          Đã thống trị toàn bộ mạng lưới cảng biển và đánh bại mọi đối thủ trên đại dương!
        </p>

        <div className="flex items-center justify-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 mb-6">
          <TokenBadge token={winner.token} size="md" />
          <div className="text-left">
            <span className="text-xs text-gray-400 font-bold block">TÀI SẢN KẾT THÚC</span>
            <span className="text-lg font-black text-emerald-600">${winner.balance}M</span>
          </div>
        </div>

        <button
          onClick={onRestart}
          className="w-full py-4 rounded-2xl bg-[#E1007A] hover:bg-[#B80063] text-white font-black text-base flex items-center justify-center gap-2 shadow-xl shadow-pink-200 transition"
        >
          <RotateCcw className="w-5 h-5" /> CHƠI LẠI VÁN MỚI
        </button>
      </div>
    </div>
  );
};
