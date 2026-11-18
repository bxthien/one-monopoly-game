import React from 'react';
import { VesselToken } from '@one-monopoly/shared';

export const TOKEN_CONFIG: Record<
  VesselToken,
  { label: string; shortName: string; emoji: string; color: string; desc: string }
> = {
  ONE_APUS: {
    label: 'Tàu ONE Apus',
    shortName: 'APUS',
    emoji: '🚢',
    color: '#E1007A',
    desc: 'Siêu tàu container tải trọng lớn',
  },
  ONE_MAGENTA: {
    label: 'Tàu ONE Magenta',
    shortName: 'MAGENTA',
    emoji: '🛳️',
    color: '#FF1493',
    desc: 'Tàu container flagship ONE',
  },
  GANTRY_CRANE: {
    label: 'Cầu Giàn Cảng Biển',
    shortName: 'CẨU GIÀN',
    emoji: '🏗️',
    color: '#F59E0B',
    desc: 'Cầu giàn bốc dỡ container cảng biển',
  },
  CONTAINER_TRUCK: {
    label: 'Xe Container ONE',
    shortName: 'XE TẢI',
    emoji: '🚛',
    color: '#2563EB',
    desc: 'Xe đầu kéo container đường bộ',
  },
  FREIGHT_TRAIN: {
    label: 'Đầu Tàu Lửa Liên Vận',
    shortName: 'TÀU HỎA',
    emoji: '🚂',
    color: '#059669',
    desc: 'Đầu máy xe lửa kéo container liên vận',
  },
  REEFER_TRUCK: {
    label: 'Xe Reefer Hàng Lạnh',
    shortName: 'REEFER',
    emoji: '❄️',
    color: '#0284C7',
    desc: 'Xe container chuyên dụng hàng lạnh',
  },
  PILOT_BOAT: {
    label: 'Tàu Hoa Tiêu Dẫn Đường',
    shortName: 'PILOT',
    emoji: '🚤',
    color: '#1E88E5',
    desc: 'Tàu hoa tiêu dẫn đường luồng lạch',
  },
  BUNKER_BARGE: {
    label: 'Xà Lan Nhiên Liệu LNG',
    shortName: 'BUNKER',
    emoji: '⚓',
    color: '#7C3AED',
    desc: 'Xà lan tiếp nhiên liệu xanh LNG',
  },
};

interface Props {
  token: VesselToken;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const TokenBadge: React.FC<Props> = ({ token, size = 'md', showLabel = false }) => {
  const cfg = TOKEN_CONFIG[token] || TOKEN_CONFIG.ONE_APUS;

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-9 h-9 text-base',
    lg: 'w-12 h-12 text-2xl',
  };

  return (
    <div className="flex items-center gap-2">
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center shadow-md font-bold text-white border-2 border-white`}
        style={{ backgroundColor: cfg.color }}
        title={`${cfg.label} - ${cfg.desc}`}
      >
        <span>{cfg.emoji}</span>
      </div>
      {showLabel && (
        <span className="font-semibold text-gray-800 text-sm tracking-wide">
          {cfg.label}
        </span>
      )}
    </div>
  );
};
