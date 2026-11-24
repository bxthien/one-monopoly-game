import React, { useId } from 'react';
import { GameCard } from '@one-monopoly/shared';
import { motion, useReducedMotion } from 'framer-motion';
import { TrendingUp, Wrench, X } from 'lucide-react';
import { BoardDialog } from './BoardDialog.js';
import { useI18n } from '../i18n/I18nContext.js';

interface Props {
  card: GameCard | null;
  onClose: () => void;
}

export const CardModal: React.FC<Props> = ({ card, onClose }) => {
  const titleId = useId();
  const reduceMotion = useReducedMotion();
  const { t, lang } = useI18n();
  if (!card) return null;

  const isMarket = card.type === 'MARKET';
  const Icon = isMarket ? TrendingUp : Wrench;
  const title = (lang === 'vi' && card.titleVi) ? card.titleVi : card.title;
  const description = (lang === 'vi' && card.descriptionVi) ? card.descriptionVi : card.description;

  return (
    <BoardDialog key={card.id} labelledBy={titleId} onClose={onClose}>
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="chart-dialog-sheet chart-event-sheet"
      >
        <button type="button" aria-label={t('common.close')} className="chart-dialog-close" onClick={onClose}>
          <X size={18} aria-hidden="true" />
        </button>

        <span className="chart-event-icon" aria-hidden="true"><Icon size={26} /></span>
        <p className="chart-dialog-kicker">
          {isMarket ? t('card.marketKicker') : t('card.opsKicker')}
        </p>
        <h3 className="chart-dialog-title" id={titleId}>{title}</h3>
        <p className="chart-dialog-copy">{description}</p>

        <button type="button" onClick={onClose} className="chart-button chart-button-primary chart-button-wide">
          {card.effect.type === 'MOVE_STEPS' || card.effect.type === 'MOVE_TO' || card.effect.type === 'GO_TO_HOLD'
            ? t('card.continueVoyage')
            : t('card.understood')}
        </button>
      </motion.div>
    </BoardDialog>
  );
};
