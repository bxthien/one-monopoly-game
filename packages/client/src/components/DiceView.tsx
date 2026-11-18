import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  dice: [number, number];
  isRolling?: boolean;
  hasRolled?: boolean;
}

export const DiceView: React.FC<Props> = ({ dice, isRolling = false, hasRolled = false }) => {
  const [d1, d2] = dice;
  const isDouble = d1 === d2;

  // Dice dot coordinates for 1 to 6
  const renderDots = (value: number) => {
    const dotMap: Record<number, number[][]> = {
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[25, 25], [50, 50], [75, 75]],
      4: [[25, 25], [25, 75], [75, 25], [75, 75]],
      5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
      6: [[25, 25], [25, 50], [25, 75], [75, 25], [75, 50], [75, 75]],
    };

    const dots = dotMap[value] || dotMap[1];

    return (
      <svg viewBox="0 0 100 100" className="w-full h-full p-1.5">
        {dots.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="10" fill={value === 1 ? '#E1007A' : '#1F2937'} />
        ))}
      </svg>
    );
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-3">
        {/* Die 1 */}
        <motion.div
          animate={isRolling ? { rotate: [0, 90, 180, 270, 360], scale: [1, 1.15, 1] } : {}}
          transition={isRolling ? { duration: 0.4, repeat: Infinity } : { duration: 0.2 }}
          className="w-12 h-12 bg-white rounded-xl shadow-md border-2 border-gray-200 flex items-center justify-center"
        >
          {renderDots(d1)}
        </motion.div>

        {/* Die 2 */}
        <motion.div
          animate={isRolling ? { rotate: [0, -90, -180, -270, -360], scale: [1, 1.15, 1] } : {}}
          transition={isRolling ? { duration: 0.4, repeat: Infinity } : { duration: 0.2 }}
          className="w-12 h-12 bg-white rounded-xl shadow-md border-2 border-gray-200 flex items-center justify-center"
        >
          {renderDots(d2)}
        </motion.div>
      </div>

      {isDouble && !isRolling && hasRolled && (
        <span className="text-[11px] font-black tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-pulse">
          LẮC ĐƯỢC ĐÔI!
        </span>
      )}
    </div>
  );
};
