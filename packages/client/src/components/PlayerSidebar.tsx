import React, { useState } from 'react';
import { GameState } from '@one-monopoly/shared';
import { Anchor, BriefcaseBusiness, ChevronRight, Gavel, Timer } from 'lucide-react';
import { FleetPortfolio } from './FleetPortfolio.js';
import type { RentReceipt } from './useBoardPlayback.js';
import { TOKEN_CONFIG } from './TokenBadge.js';

interface Props {
  gameState: GameState;
  myPlayerId: string | null;
  turnTimer: { seconds: number; playerId: string } | null;
  rentReceipts: Record<number, RentReceipt>;
  pendingRent: Record<number, RentReceipt>;
  onOfferForTile: (tileId: number) => void;
}

function playerRent(receipts: Record<number, RentReceipt>, playerId: string): number {
  let total = 0;
  for (const receipt of Object.values(receipts)) {
    for (const line of receipt.lines) {
      if (line.playerId === playerId) total += line.type === 'deduct' ? -line.amount : line.amount;
    }
  }
  return total;
}

export const PlayerSidebar: React.FC<Props> = ({ gameState, myPlayerId, turnTimer, onOfferForTile, rentReceipts, pendingRent }) => {
  const active = gameState.players[gameState.activePlayerIndex];
  const [portfolioId, setPortfolioId] = useState<string | null>(null);
  const captain = gameState.players.find(player => player.id === portfolioId);
  const properties = Object.values(gameState.properties);
  const bidder = gameState.auction && gameState.players.find(player => player.id === gameState.auction?.bidderId);
  const acting = bidder ?? active;
  const isMyTurn = myPlayerId === acting.id;
  return (
    <section className="table-scoreboard" aria-label="Đội tàu">
      <div className="chart-turn">
        <div className="chart-turn-line">
          <span>{bidder ? <Gavel size={14} /> : <Anchor size={14} />}{bidder ? 'Lượt trả giá' : 'Đang đến lượt'}</span>
          {turnTimer?.playerId === acting.id && (
            <time aria-label={`Còn ${turnTimer.seconds} giây`}><Timer size={14} />{turnTimer.seconds}s</time>
          )}
        </div>
        <h2>{isMyTurn ? 'Lượt của bạn' : acting.name}</h2>
      </div>
      <div className="chart-fleet">
        <div className="chart-fleet-title"><h2>Đội tàu</h2><span>Số dư · Tài sản</span></div>
        <ul className="table-players">
          {gameState.players.map(player => {
            const token = TOKEN_CONFIG[player.token];
            const count = properties.filter(property => property.ownerId === player.id).length;
            const delta = playerRent(rentReceipts, player.id);
            const balance = player.balance - playerRent(pendingRent, player.id);
            const rentClass = delta > 0 ? ' table-player-credit' : delta < 0 ? ' table-player-deduct' : '';
            return (
              <li key={player.id} className={`table-player${rentClass}`} aria-current={player.id === acting.id ? 'step' : undefined}>
                <button type="button" className="fleet-portfolio-open" onClick={() => setPortfolioId(player.id)}
                  aria-haspopup="dialog" aria-label={`Xem tài sản của ${player.name}, ${count} tài sản, ${player.isBankrupt ? 'phá sản' : `số dư $${balance}M`}`}>
                  <span className="chart-token" style={{ borderColor: token.color }} title={token.label} aria-hidden="true">{token.emoji}</span>
                  <span className="chart-player-name">{player.name}{player.id === myPlayerId && <small>Bạn</small>}</span>
                  <span className="fleet-balance">
                    <strong className="chart-balance">{player.isBankrupt ? 'Phá sản' : `$${balance.toLocaleString('en-US')}M`}</strong>
                    {delta !== 0 && <span key={delta} className={`chart-delta-tag ${delta > 0 ? 'chart-delta-positive' : 'chart-delta-negative'}`}>
                      {delta > 0 ? '+' : '−'}${Math.abs(delta)}M
                    </span>}
                  </span>
                  <span className="fleet-asset-count" title={`${count} tài sản`}><BriefcaseBusiness aria-hidden="true" />{count}</span>
                  <ChevronRight className="fleet-open-arrow" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {captain && <FleetPortfolio gameState={gameState} captain={captain} myPlayerId={myPlayerId}
        onClose={() => setPortfolioId(null)} onOfferForTile={onOfferForTile} />}
    </section>
  );
};
