import React from 'react';
import { VesselToken } from '@one-monopoly/shared';
import { useI18n } from '../i18n/I18nContext.js';

export const TOKEN_CONFIG: Record<
  VesselToken,
  {
    label: string;
    labelVi: string;
    shortName: string;
    shortNameVi: string;
    emoji: string;
    color: string;
    desc: string;
    descVi: string;
  }
> = {
  ONE_APUS: {
    label: 'ONE Apus Vessel',
    labelVi: 'Tàu ONE Apus',
    shortName: 'APUS',
    shortNameVi: 'APUS',
    emoji: '🚢',
    color: '#1E3A8A',
    desc: 'Ultra Large Container Vessel (Deep Navy)',
    descVi: 'Siêu tàu container tải trọng lớn (Deep Navy)',
  },
  ONE_MAGENTA: {
    label: 'ONE Magenta Vessel',
    labelVi: 'Tàu ONE Magenta',
    shortName: 'MAGENTA',
    shortNameVi: 'MAGENTA',
    emoji: '🛳️',
    color: '#E1007A',
    desc: 'ONE Flagship Container Vessel (ONE Magenta)',
    descVi: 'Tàu container flagship ONE (Hồng sen ONE)',
  },
  GANTRY_CRANE: {
    label: 'Port Gantry Crane',
    labelVi: 'Cầu Giàn Cảng Biển',
    shortName: 'CRANE',
    shortNameVi: 'CẨU GIÀN',
    emoji: '🏗️',
    color: '#D97706',
    desc: 'Quayside container gantry crane (Amber Gold)',
    descVi: 'Cầu giàn bốc dỡ container cảng biển (Cam vàng)',
  },
  CONTAINER_TRUCK: {
    label: 'ONE Container Truck',
    labelVi: 'Xe Container ONE',
    shortName: 'TRUCK',
    shortNameVi: 'XE TẢI',
    emoji: '🚛',
    color: '#2563EB',
    desc: 'Intermodal highway tractor (Maritime Blue)',
    descVi: 'Xe đầu kéo container đường bộ (Xanh dương)',
  },
  FREIGHT_TRAIN: {
    label: 'Intermodal Freight Train',
    labelVi: 'Đầu Tàu Lửa Liên Vận',
    shortName: 'TRAIN',
    shortNameVi: 'TÀU HỎA',
    emoji: '🚂',
    color: '#059669',
    desc: 'Rail freight locomotive (Emerald Green)',
    descVi: 'Đầu máy xe lửa kéo container liên vận (Xanh lục)',
  },
  REEFER_TRUCK: {
    label: 'Reefer Cold Chain Truck',
    labelVi: 'Xe Reefer Hàng Lạnh',
    shortName: 'REEFER',
    shortNameVi: 'REEFER',
    emoji: '❄️',
    color: '#06B6D4',
    desc: 'Temperature-controlled reefer hauler (Arctic Cyan)',
    descVi: 'Xe container chuyên dụng hàng lạnh (Arctic Cyan)',
  },
  PILOT_BOAT: {
    label: 'Harbor Pilot Boat',
    labelVi: 'Tàu Hoa Tiêu Dẫn Đường',
    shortName: 'PILOT',
    shortNameVi: 'PILOT',
    emoji: '🚤',
    color: '#DC2626',
    desc: 'Navigation channel escort pilot boat (Maritime Red)',
    descVi: 'Tàu hoa tiêu dẫn đường luồng lạch (Đỏ hàng hải)',
  },
  BUNKER_BARGE: {
    label: 'LNG Bunkering Barge',
    labelVi: 'Xà Lan Nhiên Liệu LNG',
    shortName: 'BUNKER',
    shortNameVi: 'BUNKER',
    emoji: '⚓',
    color: '#7C3AED',
    desc: 'Green LNG maritime refueling barge (Violet)',
    descVi: 'Xà lan tiếp nhiên liệu xanh LNG (Tím thạch anh)',
  },
};

interface Props {
  token: VesselToken;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const TokenBadge: React.FC<Props> = ({ token, size = 'md', showLabel = false }) => {
  const { lang } = useI18n();
  const cfg = TOKEN_CONFIG[token] || TOKEN_CONFIG.ONE_APUS;
  const label = lang === 'vi' ? cfg.labelVi : cfg.label;
  const desc = lang === 'vi' ? cfg.descVi : cfg.desc;

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
        title={`${label} - ${desc}`}
      >
        <span>{cfg.emoji}</span>
      </div>
      {showLabel && (
        <span className="font-semibold text-gray-800 text-sm tracking-wide">
          {label}
        </span>
      )}
    </div>
  );
};
