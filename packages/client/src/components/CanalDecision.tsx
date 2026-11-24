import React, { useId, useState } from 'react';
import { Compass, FastForward, Navigation, Anchor, ChevronRight } from 'lucide-react';
import {
  BOARD_TILES,
  CANAL_TRANSIT_FEE,
  SERVICE_LINES,
  type GameAction,
  type GameState,
} from '@one-monopoly/shared';
import { useI18n } from '../i18n/I18nContext.js';

interface Props {
  gameState: GameState;
  isMyTurn: boolean;
  onAction: (action: GameAction) => void;
  onHighlightTile?: (tileId: number | null) => void;
}

export const CanalDecision: React.FC<Props> = ({
  gameState,
  isMyTurn,
  onAction,
  onHighlightTile,
}) => {
  const { lang, t } = useI18n();
  const titleId = useId();
  const captain = gameState.players[gameState.activePlayerIndex];
  const canAfford = captain.balance >= CANAL_TRANSIT_FEE;

  // Build list of valid destination options: 4 Service Lines + any port owned by captain
  const destinations: { id: number; name: string; tag: string }[] = [];

  for (const slId of SERVICE_LINES) {
    const tile = BOARD_TILES[slId];
    if (tile) {
      destinations.push({
        id: slId,
        name: (lang === 'vi' && tile.nameVi) ? tile.nameVi : tile.name,
        tag: t('canal.serviceLineTag'),
      });
    }
  }

  for (const [idStr, prop] of Object.entries(gameState.properties)) {
    const id = Number(idStr);
    if (prop.ownerId === captain.id && !SERVICE_LINES.includes(id)) {
      const tile = BOARD_TILES[id];
      if (tile) {
        destinations.push({
          id,
          name: (lang === 'vi' && tile.nameVi) ? tile.nameVi : tile.name,
          tag: t('canal.ownedPortTag'),
        });
      }
    }
  }

  const [selectedTargetId, setSelectedTargetId] = useState<number>(destinations[0]?.id ?? 4);

  const handleSelectDestination = (id: number) => {
    setSelectedTargetId(id);
    onHighlightTile?.(id);
  };

  return (
    <section className="chart-action-panel chart-canal-decision" aria-labelledby={titleId}>
      <h3 id={titleId} className="chart-action-title">
        <Compass size={20} aria-hidden="true" /> {t('canal.title')}
      </h3>
      <p className="chart-action-copy text-xs text-slate-600 mb-2">{t('canal.prompt')}</p>

      {isMyTurn ? (
        <div className="flex flex-col gap-2.5">
          {/* Option 1: Fast Transit */}
          <div className="border border-sky-300 bg-sky-50/70 rounded-lg p-2.5 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Navigation size={18} className="text-sky-600 shrink-0" aria-hidden="true" />
              <div>
                <strong className="block text-xs font-bold text-sky-950">
                  {t('canal.transitTitle')}
                </strong>
                <small className="text-[11px] text-sky-800">
                  {t('canal.transitDesc', { fee: CANAL_TRANSIT_FEE })}
                </small>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="canal-dest-select" className="text-[11px] font-semibold text-slate-700">
                {t('canal.selectDestination')}
              </label>
              <select
                id="canal-dest-select"
                value={selectedTargetId}
                onChange={(e) => handleSelectDestination(Number(e.target.value))}
                className="w-full text-xs font-medium py-1 px-2 border border-sky-300 rounded bg-white text-slate-800 focus:outline-sky-500"
              >
                {destinations.map((d) => (
                  <option key={d.id} value={d.id}>
                    #{d.id} {d.name} ({d.tag})
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              disabled={!canAfford}
              onClick={() => {
                onHighlightTile?.(null);
                onAction({
                  type: 'RESOLVE_CANAL_TRANSIT',
                  choice: 'TRANSIT',
                  targetTileId: selectedTargetId,
                });
              }}
              className="chart-button chart-button-primary w-full justify-between"
            >
              <span>{t('canal.transitButton', { fee: CANAL_TRANSIT_FEE })}</span>
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </div>

          {/* Option 2: Full Ahead Roll Again */}
          <button
            type="button"
            disabled={!canAfford}
            onClick={() => {
              onHighlightTile?.(null);
              onAction({ type: 'RESOLVE_CANAL_TRANSIT', choice: 'ROLL_AGAIN' });
            }}
            className="chart-button chart-storm-choice"
          >
            <FastForward size={18} className="text-amber-600 shrink-0" aria-hidden="true" />
            <span className="text-left">
              <strong>{t('canal.rollAgainButton', { fee: CANAL_TRANSIT_FEE })}</strong>
              <small>{t('canal.rollAgainDesc', { fee: CANAL_TRANSIT_FEE })}</small>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>

          {/* Option 3: Skip */}
          <button
            type="button"
            onClick={() => {
              onHighlightTile?.(null);
              onAction({ type: 'RESOLVE_CANAL_TRANSIT', choice: 'SKIP' });
            }}
            className="chart-button chart-storm-choice"
          >
            <Anchor size={18} className="text-slate-500 shrink-0" aria-hidden="true" />
            <span className="text-left">
              <strong>{t('canal.skipButton')}</strong>
              <small>{t('canal.skipDesc')}</small>
            </span>
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <p className="chart-action-copy" role="status">
          <strong>{captain.name}</strong> {t('canal.waitingOther')}
        </p>
      )}
    </section>
  );
};
