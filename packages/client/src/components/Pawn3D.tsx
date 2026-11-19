import React from 'react';
import { Player, VesselToken } from '@one-monopoly/shared';
import { motion } from 'framer-motion';
import { TOKEN_CONFIG } from './TokenBadge.js';

interface Props {
  player: Player;
  isMoving?: boolean;
  is3D?: boolean;
  isMe?: boolean;
  stackIndex?: number;
}

// ==================== 1. TÀU ONE APUS (Ultra Large Container Vessel) ==================== //
const ShipApusModel: React.FC<{ isMoving?: boolean }> = ({ isMoving }) => {
  return (
    <div className="relative w-12 h-10 flex items-center justify-center">
      {/* Vệt sóng nước lan tỏa (Water Ripples & Wake) */}
      <motion.div
        animate={{
          scale: isMoving ? [1, 1.4, 1] : [1, 1.15, 1],
          opacity: isMoving ? [0.8, 0.2, 0.8] : [0.5, 0.15, 0.5],
        }}
        transition={{ repeat: Infinity, duration: isMoving ? 0.6 : 1.4, ease: 'easeInOut' }}
        className="absolute -bottom-1.5 w-14 h-6 rounded-full bg-cyan-400/30 blur-[2px] pointer-events-none"
      />
      <motion.div
        animate={{
          scaleX: isMoving ? [1, 1.5, 1] : [1, 1.2, 1],
          opacity: isMoving ? [0.9, 0.3, 0.9] : [0.6, 0.2, 0.6],
        }}
        transition={{ repeat: Infinity, duration: isMoving ? 0.4 : 1.2 }}
        className="absolute -bottom-1 w-11 h-4 rounded-full border border-cyan-300/60 pointer-events-none"
      />

      {/* Thân Tàu 3D Bập Bềnh Trên Nước (Bobbing Hull) */}
      <motion.div
        animate={
          isMoving
            ? {
                y: [-2, 2, -2],
                rotateZ: [-2, 2, -2],
                rotateX: [-3, 3, -3],
              }
            : {
                y: [-0.8, 1, -0.8],
                rotateZ: [-1, 1, -1],
              }
        }
        transition={{ repeat: Infinity, duration: isMoving ? 0.4 : 2, ease: 'easeInOut' }}
        className="relative w-11 h-8 flex flex-col items-center justify-center filter drop-shadow-md"
      >
        <svg viewBox="0 0 110 80" className="w-full h-full overflow-visible">
          <defs>
            {/* Gradient thân tàu ONE Magenta */}
            <linearGradient id="apusHull" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF1493" />
              <stop offset="40%" stopColor="#E1007A" />
              <stop offset="100%" stopColor="#9D0053" />
            </linearGradient>
            <linearGradient id="apusKeel" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#BE123C" />
              <stop offset="100%" stopColor="#881337" />
            </linearGradient>
          </defs>

          {/* Sóng bọt trắng ở mũi tàu (Bow spray) khi di chuyển */}
          {isMoving && (
            <>
              <motion.circle
                cx="12"
                cy="62"
                r="4"
                fill="#E0F2FE"
                animate={{ opacity: [0.9, 0], scale: [0.5, 1.8], x: [-2, -8] }}
                transition={{ repeat: Infinity, duration: 0.35 }}
              />
              <motion.circle
                cx="98"
                cy="62"
                r="4"
                fill="#E0F2FE"
                animate={{ opacity: [0.9, 0], scale: [0.5, 1.8], x: [2, 8] }}
                transition={{ repeat: Infinity, duration: 0.35 }}
              />
            </>
          )}

          {/* Đáy tàu mớn nước đỏ */}
          <path d="M 22 58 L 88 58 L 78 66 L 32 66 Z" fill="url(#apusKeel)" />

          {/* Mạn thân tàu ONE Magenta chữ V */}
          <path
            d="M 12 36 L 98 36 L 88 58 L 22 58 Z"
            fill="url(#apusHull)"
            stroke="#FFF"
            strokeWidth="1.2"
          />

          {/* Logo ONE trên mạn tàu */}
          <text
            x="55"
            y="52"
            fill="#FFFFFF"
            fontSize="11"
            fontWeight="900"
            textAnchor="middle"
            letterSpacing="-0.5"
          >
            ONE
          </text>

          {/* Boong chứa Container 3 tầng đa sắc */}
          {/* Tầng 1: Container Hồng & Xanh Navy */}
          <rect x="22" y="27" width="14" height="9" rx="1.5" fill="#E1007A" stroke="#FFF" strokeWidth="0.8" />
          <rect x="38" y="27" width="14" height="9" rx="1.5" fill="#0F172A" stroke="#FFF" strokeWidth="0.8" />
          <rect x="54" y="27" width="14" height="9" rx="1.5" fill="#0284C7" stroke="#FFF" strokeWidth="0.8" />
          <rect x="70" y="27" width="14" height="9" rx="1.5" fill="#F59E0B" stroke="#FFF" strokeWidth="0.8" />

          {/* Tầng 2: Container Cam & Xanh Ngọc */}
          <rect x="30" y="19" width="14" height="8" rx="1" fill="#10B981" stroke="#FFF" strokeWidth="0.6" />
          <rect x="46" y="19" width="14" height="8" rx="1" fill="#E1007A" stroke="#FFF" strokeWidth="0.6" />
          <rect x="62" y="19" width="14" height="8" rx="1" fill="#0EA5E9" stroke="#FFF" strokeWidth="0.6" />

          {/* Buồng lái chỉ huy (Bridge) màu trắng phía đuôi tàu */}
          <rect x="76" y="14" width="14" height="13" rx="1.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
          <rect x="78" y="17" width="10" height="3" fill="#0284C7" rx="0.5" />
          {/* Ống khói ONE */}
          <rect x="82" y="7" width="4" height="7" fill="#E1007A" rx="0.8" />
        </svg>
      </motion.div>
    </div>
  );
};

// ==================== 2. TÀU ONE MAGENTA (Flagship Streamlined Vessel) ==================== //
const ShipMagentaModel: React.FC<{ isMoving?: boolean }> = ({ isMoving }) => {
  return (
    <div className="relative w-12 h-10 flex items-center justify-center">
      {/* Vệt sóng nước lan tỏa */}
      <motion.div
        animate={{
          scale: isMoving ? [1, 1.45, 1] : [1, 1.15, 1],
          opacity: isMoving ? [0.85, 0.25, 0.85] : [0.55, 0.2, 0.55],
        }}
        transition={{ repeat: Infinity, duration: isMoving ? 0.5 : 1.3, ease: 'easeInOut' }}
        className="absolute -bottom-1.5 w-14 h-6 rounded-full bg-pink-400/35 blur-[2.5px] pointer-events-none"
      />

      {/* Thân tàu ONE Magenta bập bềnh */}
      <motion.div
        animate={
          isMoving
            ? {
                y: [-2, 2.5, -2],
                rotateZ: [-2.5, 2.5, -2.5],
              }
            : {
                y: [-1, 1, -1],
                rotateZ: [-1.2, 1.2, -1.2],
              }
        }
        transition={{ repeat: Infinity, duration: isMoving ? 0.38 : 1.8, ease: 'easeInOut' }}
        className="relative w-11 h-8 flex flex-col items-center justify-center filter drop-shadow-md"
      >
        <svg viewBox="0 0 110 80" className="w-full h-full overflow-visible">
          <defs>
            <linearGradient id="magHull" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FF2E93" />
              <stop offset="50%" stopColor="#E1007A" />
              <stop offset="100%" stopColor="#B80063" />
            </linearGradient>
          </defs>

          {/* Đáy tàu */}
          <path d="M 20 58 L 90 58 L 80 66 L 30 66 Z" fill="#9F1239" />

          {/* Mạn tàu khí động học bóng bẩy */}
          <path
            d="M 10 36 L 100 36 L 90 58 L 20 58 Z"
            fill="url(#magHull)"
            stroke="#FFF"
            strokeWidth="1.2"
          />

          {/* Chữ ONE lớn ánh kim */}
          <text
            x="55"
            y="52"
            fill="#FFFFFF"
            fontSize="12"
            fontWeight="900"
            textAnchor="middle"
            letterSpacing="-0.5"
          >
            ONE
          </text>

          {/* Toàn bộ Container trên boong tone màu ONE Magenta cao cấp */}
          <rect x="22" y="27" width="13" height="9" rx="1.5" fill="#E1007A" stroke="#FFF" strokeWidth="0.8" />
          <rect x="37" y="27" width="13" height="9" rx="1.5" fill="#FF4DAB" stroke="#FFF" strokeWidth="0.8" />
          <rect x="52" y="27" width="13" height="9" rx="1.5" fill="#B80063" stroke="#FFF" strokeWidth="0.8" />
          <rect x="67" y="27" width="13" height="9" rx="1.5" fill="#E1007A" stroke="#FFF" strokeWidth="0.8" />

          {/* Tầng 2 */}
          <rect x="30" y="19" width="13" height="8" rx="1" fill="#FF69B4" stroke="#FFF" strokeWidth="0.6" />
          <rect x="45" y="19" width="13" height="8" rx="1" fill="#E1007A" stroke="#FFF" strokeWidth="0.6" />
          <rect x="60" y="19" width="13" height="8" rx="1" fill="#FF1493" stroke="#FFF" strokeWidth="0.6" />

          {/* Tháp buồng lái */}
          <rect x="78" y="13" width="14" height="14" rx="2" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1" />
          <rect x="80" y="16" width="10" height="3" fill="#E1007A" rx="0.5" />
          <rect x="84" y="6" width="4" height="7" fill="#E1007A" rx="0.8" />
        </svg>
      </motion.div>
    </div>
  );
};

// ==================== 3. CẦU GIÀN CẢNG BIỂN (Quayside Gantry Crane) ==================== //
const GantryCraneModel: React.FC<{ isMoving?: boolean }> = ({ isMoving }) => {
  return (
    <div className="relative w-12 h-11 flex items-center justify-center">
      {/* Bóng đổ mặt đất */}
      <div className="absolute -bottom-1 w-11 h-3.5 bg-black/35 rounded-full blur-[1.5px]" />

      <motion.div
        animate={
          isMoving
            ? {
                x: [-1.5, 1.5, -1.5],
                y: [-1, 0, -1],
              }
            : {
                y: [0, -0.5, 0],
              }
        }
        transition={{ repeat: Infinity, duration: isMoving ? 0.3 : 1.5 }}
        className="relative w-11 h-11 flex flex-col items-center justify-center filter drop-shadow-md"
      >
        <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
          {/* Chân đế ray di chuyển 2 bên */}
          <rect x="18" y="76" width="16" height="5" rx="1.5" fill="#334155" />
          <rect x="66" y="76" width="16" height="5" rx="1.5" fill="#334155" />
          {/* Bánh ray xoay */}
          <circle cx="22" cy="82" r="3" fill="#0F172A" />
          <circle cx="30" cy="82" r="3" fill="#0F172A" />
          <circle cx="70" cy="82" r="3" fill="#0F172A" />
          <circle cx="78" cy="82" r="3" fill="#0F172A" />

          {/* Cột tháp chữ A màu vàng cam công nghiệp */}
          <line x1="26" y1="76" x2="38" y2="28" stroke="#F59E0B" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="74" y1="76" x2="62" y2="28" stroke="#F59E0B" strokeWidth="4.5" strokeLinecap="round" />
          <line x1="28" y1="52" x2="72" y2="52" stroke="#D97706" strokeWidth="2.5" />
          <line x1="30" y1="64" x2="70" y2="64" stroke="#D97706" strokeWidth="2" />

          {/* Dầm cần cẩu vươn ngang (Boom) */}
          <rect x="10" y="22" width="80" height="7" rx="1.5" fill="#D97706" stroke="#B45309" strokeWidth="1" />
          {/* Cabin điều khiển cẩu màu trắng */}
          <rect x="34" y="29" width="11" height="8" rx="1.5" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="0.8" />
          <rect x="36" y="32" width="7" height="3" fill="#0284C7" />

          {/* Móc cẩu Spreader nâng hạ lên xuống đặc trưng */}
          <motion.g
            animate={{
              y: isMoving ? [0, 14, 0] : [0, 9, 0],
            }}
            transition={{ repeat: Infinity, duration: isMoving ? 0.7 : 2.2, ease: 'easeInOut' }}
          >
            {/* Dây cáp treo */}
            <line x1="50" y1="29" x2="50" y2="44" stroke="#64748B" strokeWidth="1.2" strokeDasharray="1.5,1.5" />
            {/* Móc Spreader kẹp container màu ONE Magenta */}
            <rect x="42" y="44" width="16" height="5" rx="1" fill="#E1007A" stroke="#FFF" strokeWidth="0.8" />
            {/* Khối container nhỏ đang được cẩu */}
            <rect x="43" y="49" width="14" height="8" rx="1" fill="#0284C7" stroke="#FFF" strokeWidth="0.6" />
          </motion.g>
        </svg>
      </motion.div>
    </div>
  );
};

// ==================== 4. XE CONTAINER ONE (Truck + 40ft Container) ==================== //
const ContainerTruckModel: React.FC<{ isMoving?: boolean }> = ({ isMoving }) => {
  return (
    <div className="relative w-12 h-10 flex items-center justify-center">
      {/* Vệt đường nhựa / bóng đổ */}
      <div className="absolute -bottom-1 w-12 h-3 bg-slate-900/40 rounded-full blur-[1px]" />
      {/* Vạch kẻ đường đứt đoạn */}
      <div className="absolute -bottom-1.5 w-10 h-0.5 border-b border-dashed border-amber-300/80" />

      {/* Hiệu ứng bụi bánh xe khi di chuyển */}
      {isMoving && (
        <motion.div
          animate={{ opacity: [0.8, 0], scale: [0.6, 1.6], x: [-2, -8] }}
          transition={{ repeat: Infinity, duration: 0.3 }}
          className="absolute bottom-0 left-0 w-3 h-3 rounded-full bg-gray-400/50 blur-[1px] pointer-events-none"
        />
      )}

      <motion.div
        animate={
          isMoving
            ? {
                y: [-1, 0.8, -1],
                rotateZ: [-1, 1, -1],
              }
            : {
                y: [0, -0.4, 0],
              }
        }
        transition={{ repeat: Infinity, duration: isMoving ? 0.25 : 1.6 }}
        className="relative w-11 h-8 flex flex-col items-center justify-center filter drop-shadow-md"
      >
        <svg viewBox="0 0 110 75" className="w-full h-full overflow-visible">
          {/* Khung gầm rơ-moóc */}
          <rect x="12" y="52" width="86" height="4" rx="1" fill="#334155" />

          {/* THÙNG CONTAINER 40FT MÀU ONE MAGENTA */}
          <rect x="12" y="18" width="56" height="34" rx="2" fill="#E1007A" stroke="#FFFFFF" strokeWidth="1.2" />
          {/* Gờ dập nổi sóng container */}
          <line x1="22" y1="20" x2="22" y2="50" stroke="#BE0067" strokeWidth="1.5" />
          <line x1="32" y1="20" x2="32" y2="50" stroke="#BE0067" strokeWidth="1.5" />
          <line x1="42" y1="20" x2="42" y2="50" stroke="#BE0067" strokeWidth="1.5" />
          <line x1="52" y1="20" x2="52" y2="50" stroke="#BE0067" strokeWidth="1.5" />
          {/* Logo ONE */}
          <text x="36" y="38" fill="#FFFFFF" fontSize="11" fontWeight="900" textAnchor="middle">
            ONE
          </text>

          {/* CABIN ĐẦU KÉO XANH NAVY CHUYÊN DỤNG */}
          <path d="M 68 32 L 86 32 L 95 44 L 95 54 L 68 54 Z" fill="#1E3A8A" stroke="#FFFFFF" strokeWidth="1" />
          {/* Kính chắn gió cabin */}
          <path d="M 74 35 L 84 35 L 90 43 L 74 43 Z" fill="#38BDF8" />
          {/* Đèn pha vàng */}
          <circle cx="93" cy="48" r="2" fill="#FBBF24" />

          {/* 6 BÁNH XE XOAY CHUYỂN ĐỘNG TRÒN ĐẶC TRƯNG */}
          <g>
            {/* Bánh rơ-moóc 1 */}
            <circle cx="22" cy="56" r="6" fill="#0F172A" stroke="#94A3B8" strokeWidth="1.2" />
            <motion.line
              x1="22" y1="52" x2="22" y2="60"
              stroke="#FFF" strokeWidth="1"
              animate={isMoving ? { rotate: [0, 360] } : undefined}
              transition={{ repeat: Infinity, duration: 0.3, ease: 'linear' }}
              style={{ originX: '22px', originY: '56px' }}
            />

            {/* Bánh rơ-moóc 2 */}
            <circle cx="36" cy="56" r="6" fill="#0F172A" stroke="#94A3B8" strokeWidth="1.2" />
            <motion.line
              x1="36" y1="52" x2="36" y2="60"
              stroke="#FFF" strokeWidth="1"
              animate={isMoving ? { rotate: [0, 360] } : undefined}
              transition={{ repeat: Infinity, duration: 0.3, ease: 'linear' }}
              style={{ originX: '36px', originY: '56px' }}
            />

            {/* Bánh đầu kéo */}
            <circle cx="84" cy="56" r="6" fill="#0F172A" stroke="#94A3B8" strokeWidth="1.2" />
            <motion.line
              x1="84" y1="52" x2="84" y2="60"
              stroke="#FFF" strokeWidth="1"
              animate={isMoving ? { rotate: [0, 360] } : undefined}
              transition={{ repeat: Infinity, duration: 0.3, ease: 'linear' }}
              style={{ originX: '84px', originY: '56px' }}
            />
          </g>
        </svg>
      </motion.div>
    </div>
  );
};

// ==================== 5. ĐẦU TÀU LỬA LIÊN VẬN (Freight Train Locomotive) ==================== //
const FreightTrainModel: React.FC<{ isMoving?: boolean }> = ({ isMoving }) => {
  return (
    <div className="relative w-12 h-10 flex items-center justify-center">
      {/* Đường ray & bóng đổ */}
      <div className="absolute -bottom-1 w-12 h-2.5 bg-slate-900/35 rounded-full blur-[1px]" />
      {/* 2 đường ray song song */}
      <div className="absolute -bottom-1 w-11 h-1 border-y border-slate-400/80" />

      {/* Cụm khói hơi nước bốc lên từ ống khói khi di chuyển */}
      <motion.div
        animate={
          isMoving
            ? {
                y: [0, -14, -22],
                x: [0, -4, -8],
                scale: [0.6, 1.2, 1.8],
                opacity: [0.9, 0.5, 0],
              }
            : {
                y: [0, -7, -12],
                scale: [0.6, 1, 1.3],
                opacity: [0.6, 0.3, 0],
              }
        }
        transition={{ repeat: Infinity, duration: isMoving ? 0.5 : 1.2, ease: 'easeOut' }}
        className="absolute -top-1 right-3 w-3 h-3 rounded-full bg-gray-200/90 blur-[1px] pointer-events-none"
      />

      <motion.div
        animate={
          isMoving
            ? {
                y: [-1, 1, -1],
                x: [-0.5, 0.5, -0.5],
              }
            : {
                y: [0, -0.4, 0],
              }
        }
        transition={{ repeat: Infinity, duration: isMoving ? 0.28 : 1.5 }}
        className="relative w-11 h-8 flex flex-col items-center justify-center filter drop-shadow-md"
      >
        <svg viewBox="0 0 110 75" className="w-full h-full overflow-visible">
          {/* Thân đầu máy xe lửa màu xanh lục bảo & xám thép */}
          <rect x="14" y="24" width="76" height="30" rx="3" fill="#059669" stroke="#FFF" strokeWidth="1" />
          {/* Sọc trang trí vàng */}
          <line x1="14" y1="36" x2="90" y2="36" stroke="#FBBF24" strokeWidth="2" />

          {/* Cabin lái phía sau */}
          <rect x="18" y="14" width="24" height="20" rx="2" fill="#047857" stroke="#FFF" strokeWidth="1" />
          {/* Cửa sổ cabin */}
          <rect x="22" y="18" width="8" height="6" fill="#67E8F9" rx="1" />
          <rect x="32" y="18" width="7" height="6" fill="#67E8F9" rx="1" />

          {/* Ống khói đầu tàu */}
          <rect x="76" y="16" width="6" height="9" fill="#1F2937" rx="1" />
          <rect x="74" y="14" width="10" height="3" fill="#374151" rx="0.5" />

          {/* Đèn pha phía trước */}
          <circle cx="90" cy="42" r="3.5" fill="#FBBF24" stroke="#FFF" strokeWidth="0.8" />

          {/* Cụm Bánh Xe Sắt & Tay Đòn Piston Chuyển Động */}
          <g>
            <circle cx="28" cy="56" r="6.5" fill="#1E293B" stroke="#CBD5E1" strokeWidth="1.2" />
            <circle cx="48" cy="56" r="6.5" fill="#1E293B" stroke="#CBD5E1" strokeWidth="1.2" />
            <circle cx="68" cy="56" r="6.5" fill="#1E293B" stroke="#CBD5E1" strokeWidth="1.2" />

            {/* Thanh truyền động piston nối giữa các bánh xe */}
            <motion.line
              x1="28" y1="56" x2="68" y2="56"
              stroke="#E2E8F0" strokeWidth="2" strokeLinecap="round"
              animate={isMoving ? { y: [-2, 2, -2] } : undefined}
              transition={{ repeat: Infinity, duration: 0.28, ease: 'easeInOut' }}
            />
          </g>
        </svg>
      </motion.div>
    </div>
  );
};

// ==================== 6. XE REEFER LOGISTICS (Refrigerated Truck) ==================== //
const ReeferTruckModel: React.FC<{ isMoving?: boolean }> = ({ isMoving }) => {
  return (
    <div className="relative w-12 h-10 flex items-center justify-center">
      {/* Vệt đường & bóng đổ */}
      <div className="absolute -bottom-1 w-12 h-3 bg-slate-900/40 rounded-full blur-[1px]" />
      <div className="absolute -bottom-1.5 w-10 h-0.5 border-b border-dashed border-cyan-300/80" />

      {/* Làn sương lạnh / hơi tuyết phả ra từ cụm dàn lạnh (Frost Mist) */}
      <motion.div
        animate={
          isMoving
            ? {
                x: [-2, -10],
                y: [-1, -4],
                scale: [0.6, 1.4],
                opacity: [0.8, 0],
              }
            : {
                y: [-0.5, -2],
                scale: [0.8, 1.2],
                opacity: [0.5, 0],
              }
        }
        transition={{ repeat: Infinity, duration: isMoving ? 0.45 : 1.4, ease: 'easeOut' }}
        className="absolute top-2 left-2 text-[9px] pointer-events-none select-none"
      >
        ❄️
      </motion.div>

      <motion.div
        animate={
          isMoving
            ? {
                y: [-1, 0.8, -1],
                rotateZ: [-1, 1, -1],
              }
            : {
                y: [0, -0.4, 0],
              }
        }
        transition={{ repeat: Infinity, duration: isMoving ? 0.25 : 1.6 }}
        className="relative w-11 h-8 flex flex-col items-center justify-center filter drop-shadow-md"
      >
        <svg viewBox="0 0 110 75" className="w-full h-full overflow-visible">
          {/* Khung gầm */}
          <rect x="12" y="52" width="86" height="4" rx="1" fill="#334155" />

          {/* THÙNG BẢO ÔN TRẮNG TINH KHÔI */}
          <rect x="12" y="18" width="58" height="34" rx="2" fill="#F8FAFC" stroke="#94A3B8" strokeWidth="1.2" />
          {/* Cụm máy làm lạnh chuyên dụng (Reefer Unit) màu xanh dương */}
          <rect x="64" y="22" width="6" height="12" rx="1" fill="#0284C7" />
          {/* Logo bông tuyết & chữ REEFER */}
          <circle cx="26" cy="35" r="5" fill="#E0F2FE" />
          <text x="26" y="38" fill="#0284C7" fontSize="8" fontWeight="900" textAnchor="middle">
            ❄
          </text>
          <text x="44" y="38" fill="#0284C7" fontSize="8" fontWeight="900" textAnchor="middle">
            COLD
          </text>

          {/* CABIN XE TẢI XANH NGỌC MÁT MẮT */}
          <path d="M 70 32 L 86 32 L 95 44 L 95 54 L 70 54 Z" fill="#0D9488" stroke="#FFFFFF" strokeWidth="1" />
          {/* Kính chắn gió */}
          <path d="M 76 35 L 85 35 L 90 43 L 76 43 Z" fill="#E0F2FE" />
          {/* Đèn pha */}
          <circle cx="93" cy="48" r="2" fill="#FDE047" />

          {/* BÁNH XE XOAY KHI DI CHUYỂN */}
          <g>
            <circle cx="24" cy="56" r="6" fill="#0F172A" stroke="#94A3B8" strokeWidth="1.2" />
            <motion.line
              x1="24" y1="52" x2="24" y2="60"
              stroke="#FFF" strokeWidth="1"
              animate={isMoving ? { rotate: [0, 360] } : undefined}
              transition={{ repeat: Infinity, duration: 0.3, ease: 'linear' }}
              style={{ originX: '24px', originY: '56px' }}
            />

            <circle cx="38" cy="56" r="6" fill="#0F172A" stroke="#94A3B8" strokeWidth="1.2" />
            <motion.line
              x1="38" y1="52" x2="38" y2="60"
              stroke="#FFF" strokeWidth="1"
              animate={isMoving ? { rotate: [0, 360] } : undefined}
              transition={{ repeat: Infinity, duration: 0.3, ease: 'linear' }}
              style={{ originX: '38px', originY: '56px' }}
            />

            <circle cx="84" cy="56" r="6" fill="#0F172A" stroke="#94A3B8" strokeWidth="1.2" />
            <motion.line
              x1="84" y1="52" x2="84" y2="60"
              stroke="#FFF" strokeWidth="1"
              animate={isMoving ? { rotate: [0, 360] } : undefined}
              transition={{ repeat: Infinity, duration: 0.3, ease: 'linear' }}
              style={{ originX: '84px', originY: '56px' }}
            />
          </g>
        </svg>
      </motion.div>
    </div>
  );
};

// ==================== MAIN COMPONENT: PAWN 3D ==================== //
export const Pawn3D: React.FC<Props> = ({
  player,
  isMoving = false,
  is3D = false,
  isMe = false,
  stackIndex = 0,
}) => {
  const cfg = TOKEN_CONFIG[player.token] || TOKEN_CONFIG.ONE_APUS;

  // Render mô hình 3D tương ứng theo loại nhân vật
  const renderModel = () => {
    switch (player.token) {
      case 'ONE_APUS':
      case 'PILOT_BOAT':
        return <ShipApusModel isMoving={isMoving} />;
      case 'ONE_MAGENTA':
      case 'BUNKER_BARGE':
        return <ShipMagentaModel isMoving={isMoving} />;
      case 'GANTRY_CRANE':
        return <GantryCraneModel isMoving={isMoving} />;
      case 'CONTAINER_TRUCK':
        return <ContainerTruckModel isMoving={isMoving} />;
      case 'FREIGHT_TRAIN':
        return <FreightTrainModel isMoving={isMoving} />;
      case 'REEFER_TRUCK':
        return <ReeferTruckModel isMoving={isMoving} />;
      default:
        return <ShipApusModel isMoving={isMoving} />;
    }
  };

  return (
    <div
      className="relative flex items-center justify-center select-none pointer-events-none"
      style={{
        transformStyle: is3D ? 'preserve-3d' : undefined,
        transform: is3D
          ? `var(--board-billboard) translateZ(${22 + stackIndex * 4}px) translateY(-6px) scale(var(--model-scale))`
          : undefined,
      }}
      title={`${player.name} (${cfg.label})`}
    >
      {/* MÔ HÌNH 3D CHI TIẾT CỦA NHÂN VẬT - KHÔNG CÒN THẺ TÊN CỒNG KỀNH */}
      <div className="relative flex items-center justify-center">
        {renderModel()}
      </div>
    </div>
  );
};
