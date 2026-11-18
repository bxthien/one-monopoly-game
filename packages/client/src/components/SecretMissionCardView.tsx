import React, { useState } from 'react';
import { GameAction, Player } from '@one-monopoly/shared';
import { Target, CheckCircle2, Award, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface Props {
  player: Player;
  onClaim: () => void;
}

export const SecretMissionCardView: React.FC<Props> = ({ player, onClaim }) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const mission = player.secretMission;

  if (!mission) return null;

  return (
    <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-2xl p-4 shadow-md relative overflow-hidden border border-purple-700/50">
      {/* Decorative background glow */}
      <div className="absolute top-0 right-0 -mr-6 -mt-6 w-24 h-24 bg-[#E1007A]/20 rounded-full blur-xl pointer-events-none" />

      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#E1007A] flex items-center justify-center text-white shadow-sm">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-black tracking-wider text-pink-300 uppercase block leading-none">
              PREMIER ALLIANCE
            </span>
            <span className="text-xs font-black tracking-tight text-white">
              Hợp Đồng Chiến Lược Bí Mật
            </span>
          </div>
        </div>

        <button
          onClick={() => setIsRevealed(!isRevealed)}
          className="text-xs bg-white/10 hover:bg-white/20 text-purple-200 px-2.5 py-1 rounded-lg transition flex items-center gap-1 font-bold"
        >
          {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{isRevealed ? 'Ẩn' : 'Xem'}</span>
        </button>
      </div>

      {isRevealed ? (
        <div className="mt-3 pt-3 border-t border-white/10 space-y-2 animate-fadeIn">
          <div className="text-sm font-black text-pink-200 leading-tight">
            {mission.title}
          </div>
          <p className="text-xs text-purple-200 leading-relaxed font-medium bg-black/20 p-2.5 rounded-xl border border-white/5">
            {mission.description}
          </p>

          <div className="flex items-center justify-between pt-1">
            <div className="text-xs">
              <span className="text-purple-300 block text-[10px] font-bold">PHẦN THƯỞNG</span>
              <span className="text-base font-black text-emerald-400">+${mission.reward}M</span>
            </div>

            {mission.isCompleted ? (
              <span className="flex items-center gap-1 text-xs font-extrabold text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-lg border border-emerald-400/30">
                <CheckCircle2 className="w-4 h-4" /> ĐÃ HOÀN THÀNH
              </span>
            ) : (
              <button
                onClick={onClaim}
                className="px-3 py-1.5 rounded-xl bg-[#E1007A] hover:bg-[#B80063] text-white text-xs font-black shadow-md transition"
              >
                Kiểm Tra & Nhận
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-xs text-purple-300/80 italic mt-1">
          Nhiệm vụ bí mật giúp bạn nhận thưởng đến $500M khi hoàn thành.
        </div>
      )}
    </div>
  );
};
