import React from 'react';
import { GameCard } from '@one-monopoly/shared';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Wrench, X } from 'lucide-react';

interface Props {
  card: GameCard | null;
  onClose: () => void;
}

export const CardModal: React.FC<Props> = ({ card, onClose }) => {
  if (!card) return null;

  const isMarket = card.type === 'MARKET';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotateY: 90 }}
          animate={{ scale: 1, opacity: 1, rotateY: 0 }}
          exit={{ scale: 0.8, opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 relative text-center"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition"
          >
            <X className="w-5 h-5" />
          </button>

          <div
            className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white mb-4 shadow-lg ${
              isMarket
                ? 'bg-gradient-to-tr from-[#E1007A] to-pink-400 shadow-pink-200'
                : 'bg-gradient-to-tr from-amber-500 to-orange-400 shadow-amber-200'
            }`}
          >
            {isMarket ? <TrendingUp className="w-8 h-8" /> : <Wrench className="w-8 h-8" />}
          </div>

          <div className="text-xs font-black uppercase tracking-wider text-gray-400 mb-1">
            {isMarket ? 'THẺ BIẾN ĐỘNG THỊ TRƯỜNG' : 'THẺ SỰ CỐ & VẬN HÀNH'}
          </div>

          <h3 className="text-lg font-black text-gray-900 mb-3">{card.title}</h3>

          <p className="text-sm text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100 leading-relaxed font-medium mb-6">
            {card.description}
          </p>

          <button
            onClick={onClose}
            className="w-full py-3.5 rounded-2xl bg-gray-900 hover:bg-black text-white font-black text-sm transition shadow-md"
          >
            ĐÃ HIỂU
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
