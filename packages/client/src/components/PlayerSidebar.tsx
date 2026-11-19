import React from 'react';
import { GameState } from '@one-monopoly/shared';
import { Anchor, Timer } from 'lucide-react';
import { TOKEN_CONFIG } from './TokenBadge.js';

interface Props {
  gameState: GameState;
  myPlayerId: string | null;
  turnTimer: { seconds: number; playerId: string } | null;
}

export const PlayerSidebar: React.FC<Props> = ({ gameState, myPlayerId, turnTimer }) => {
  const active = gameState.players[gameState.activePlayerIndex];
  const isMyTurn = myPlayerId === active.id;
  return (
    <section className="table-scoreboard" aria-label="Đội tàu">
      <div className="chart-turn">
        <div className="chart-turn-line">
          <span><Anchor size={14} /> Đang đến lượt</span>
          {turnTimer?.playerId === active.id && (
            <time aria-label={`Còn ${turnTimer.seconds} giây`}><Timer size={14} />{turnTimer.seconds}s</time>
          )}
        </div>
        <h2>{isMyTurn ? 'Lượt của bạn' : active.name}</h2>
      </div>
      <div className="chart-fleet">
        <div className="chart-fleet-title"><h2>Đội tàu</h2><span>Số dư</span></div>
        <ul className="table-players">
          {gameState.players.map(player => {
            const token = TOKEN_CONFIG[player.token];
            return (
              <li key={player.id} className="table-player" aria-current={player.id === active.id ? 'step' : undefined}>
                <span className="chart-token" style={{ borderColor: token.color }} title={token.label}>{token.emoji}</span>
                <span className="chart-player-name">{player.name}{player.id === myPlayerId && <small>Bạn</small>}</span>
                <strong className="chart-balance">{player.isBankrupt ? 'Phá sản' : `$${player.balance.toLocaleString('en-US')}M`}</strong>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
};
