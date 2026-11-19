import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ReactionEvent } from '../hooks/useSocket.js';

interface Props {
  reactions: ReactionEvent[];
  onSendReaction: (emoji: string) => void;
}

export const ReactionFloatingBar: React.FC<Props> = ({ reactions, onSendReaction }) => {
  const emojis = ['🚢', '📦', '💸', '👏', '🔥'];

  return (
    <>
      {/* Floating Emojis Screen Container */}
      <div className="fixed bottom-24 right-8 pointer-events-none z-40 flex flex-col items-center">
        <AnimatePresence>
          {reactions.map((rx) => (
            <motion.div
              key={rx.id}
              initial={{ opacity: 1, y: 0, scale: 0.8 }}
              animate={{ opacity: 0, y: -160, scale: 1.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: 'easeOut' }}
              className="text-4xl filter drop-shadow-md select-none my-1"
            >
              {rx.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Floating Action Trigger Bar */}
      <div className="table-reactions self-center bg-white/90 backdrop-blur-md px-2 py-1 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center gap-1">
        {emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            className="w-10 h-10 rounded-xl hover:bg-pink-50 hover:scale-115 active:scale-90 transition flex items-center justify-center text-xl cursor-pointer"
            title={`Thả biểu cảm ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
};
