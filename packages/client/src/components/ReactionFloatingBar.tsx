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
      <div className="table-reactions" role="group" aria-label="Biểu cảm">
        <span className="chart-reaction-label">Biểu cảm</span>
        {emojis.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSendReaction(emoji)}
            className="chart-reaction"
            title={`Thả biểu cảm ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
    </>
  );
};
