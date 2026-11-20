import React, { useId } from 'react';
import {
  BOARD_TILES,
  BoardTile,
  GameAction,
  GameState,
  GREEN_FLEET_COST,
  GREEN_FLEET_ESG_BONUS,
  getTradeRestriction,
  LOOP_GROUPS_CONFIG,
  OneMonopolyEngine,
} from '@one-monopoly/shared';
import { TokenBadge } from './TokenBadge.js';
import { BoardDialog } from './BoardDialog.js';
import { X, Building2, TrendingDown, DollarSign, ShieldAlert, Leaf, Handshake } from 'lucide-react';

function getRentSchedule(tile: BoardTile): [string, string][] {
  if (tile.type === 'PORT' && tile.rentTiers) {
    const [base, one, two, three, four, terminal] = tile.rentTiers;
    return [
      ['Phí cước cơ bản', `$${base}M`],
      ['Trọn bộ tuyến, chưa xây', `$${base * 2}M`],
      ['1 lô Container Magenta', `$${one}M`],
      ['2 lô Container Magenta', `$${two}M`],
      ['3 lô Container Magenta', `$${three}M`],
      ['4 lô Container Magenta', `$${four}M`],
      ['Siêu tàu ONE Innovation (24K TEU)', `$${terminal}M`],
    ];
  }
  if (tile.type === 'SERVICE_LINE') {
    return [
      ['Sở hữu 1 tuyến', '$25M'],
      ['Sở hữu 2 tuyến', '$50M'],
      ['Sở hữu 3 tuyến', '$100M'],
      ['Trọn bộ 4 tuyến toàn cầu', '$200M'],
    ];
  }
  if (tile.type === 'INFRA') {
    return [
      ['Sở hữu 1 nền tảng', '4 × tổng xúc xắc'],
      ['Sở hữu cả 2 nền tảng', '10 × tổng xúc xắc'],
    ];
  }
  return [];
}

interface Props {
  tileId: number | null;
  gameState: GameState;
  myPlayerId: string | null;
  onClose: () => void;
  onAction: (action: GameAction) => void;
  onOfferForTile: (tileId: number) => void;
}

export const PropertyModal: React.FC<Props> = ({
  tileId,
  gameState,
  myPlayerId,
  onClose,
  onAction,
  onOfferForTile,
}) => {
  const titleId = useId();

  if (tileId === null) return null;

  const tile = BOARD_TILES[tileId];
  if (!tile) return null;

  const rentSchedule = getRentSchedule(tile);
  const prop = gameState.properties[tileId];
  const owner = prop?.ownerId
    ? gameState.players.find((p) => p.id === prop.ownerId)
    : null;
  const charterPartner = prop?.slotCharter?.active
    ? gameState.players.find((player) => player.id === prop.slotCharter?.partnerId)
    : null;
  const isMine = prop?.ownerId === myPlayerId;
  const groupConfig = tile.group ? LOOP_GROUPS_CONFIG[tile.group] : null;

  const buildCost = tile.buildCost || groupConfig?.buildCost || 50;
  const refund = Math.floor(buildCost * 0.5);
  const mortgageValue = tile.mortgageValue || Math.floor((tile.price || 0) * 0.5);
  const unmortgageCost = Math.ceil(mortgageValue * 1.1);

  // Check if can build (owns all in group and even building)
  let canBuild = false;
  let canSell = false;
  let canUpgradeGreen = false;

  if (isMine && tile.type === 'PORT' && groupConfig && !prop.isMortgaged) {
    const ownsAllAndNotMortgaged = groupConfig.tileIds.every((id) => {
      const p = gameState.properties[id];
      return p && p.ownerId === myPlayerId && !p.isMortgaged;
    });
    const minLevel = Math.min(
      ...groupConfig.tileIds.map((id) => gameState.properties[id]!.containerLevel)
    );
    canBuild = ownsAllAndNotMortgaged && prop.containerLevel < 5 && prop.containerLevel <= minLevel;

    const maxLevel = Math.max(
      ...groupConfig.tileIds.map((id) => gameState.properties[id]!.containerLevel)
    );
    canSell = prop.containerLevel > 0 && prop.containerLevel >= maxLevel;

    canUpgradeGreen = prop.containerLevel === 5 && !prop.hasGreenFleet;
  }

  // Check can mortgage (no containers in group)
  let canMortgage = false;
  if (isMine && !prop.isMortgaged) {
    if (tile.type === 'PORT' && groupConfig) {
      const hasContainers = groupConfig.tileIds.some(
        (id) => (gameState.properties[id]?.containerLevel || 0) > 0
      );
      canMortgage = !hasContainers;
    } else {
      canMortgage = true;
    }
  }

  return (
    <BoardDialog key={tileId} labelledBy={titleId} onClose={onClose}>
      <div className="chart-dialog-sheet chart-manifest">
        <button type="button" aria-label="Đóng chi tiết ô" onClick={onClose} className="chart-dialog-close">
          <X aria-hidden="true" />
        </button>

        <header className="chart-manifest-heading">
          <div className="chart-dialog-kicker">
            <span>{tile.code}</span>
            {groupConfig && (
              <span className="chart-manifest-route">
                <i aria-hidden="true" style={{ backgroundColor: groupConfig.color }} />
                {groupConfig.name}
              </span>
            )}
          </div>
          <h3 id={titleId} className="chart-dialog-title">{tile.name}</h3>
        </header>

        {prop && (
          <dl className="chart-manifest-facts">
            <div>
              <dt>Chủ sở hữu</dt>
              <dd>{owner ? <><TokenBadge token={owner.token} size="sm" />{owner.name}</> : 'Chưa có ai sở hữu'}</dd>
            </div>
            {tile.price !== undefined && (
              <div><dt>Giá mua</dt><dd>${tile.price}M</dd></div>
            )}
            {owner && (tile.type !== 'INFRA' || gameState.hasRolled) && (
              <div>
                <dt>{tile.type === 'INFRA' ? 'Cước theo lần gieo' : 'Cước niêm yết'}</dt>
                <dd>${OneMonopolyEngine.calculateRent(gameState, tileId, gameState.dice)}M</dd>
              </div>
            )}
            {prop.isMortgaged && <div><dt>Trạng thái</dt><dd>Đã thế chấp</dd></div>}
          </dl>
        )}

        {prop?.hasGreenFleet && (
          <div className="chart-manifest-note">
            <Leaf aria-hidden="true" />
            <div>
              <strong>Huy Hiệu Xanh (Green Fuel Ready)</strong>
              <p>Miễn Thuế Carbon và +${GREEN_FLEET_ESG_BONUS}M điểm ESG</p>
            </div>
          </div>
        )}
        {prop?.slotCharter?.active && (
          <div className="chart-manifest-note">
            <Handshake aria-hidden="true" />
            <div>
              <strong>Chia sẻ cước 50/50</strong>
              {charterPartner && <p>{owner?.name} và {charterPartner.name} chia đôi cước khi người chơi khác ghé cảng lần tới.</p>}
            </div>
          </div>
        )}

        {rentSchedule.length > 0 && (
          <table className="chart-rent-schedule">
            <caption>{tile.type === 'SERVICE_LINE' ? 'Cước tuyến huyết mạch' : 'Biểu cước'}</caption>
            <tbody>
              {rentSchedule.map(([label, value]) => (
                <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>
              ))}
            </tbody>
          </table>
        )}

        {myPlayerId && owner && !gameState.tradeOffers?.some(offer => offer.buyerId === myPlayerId)
          && !getTradeRestriction(gameState, myPlayerId, tileId) && (
            <button type="button" className="chart-button chart-button-primary" onClick={() => onOfferForTile(tileId)}>
              <Handshake aria-hidden="true" /> Đề nghị mua
            </button>
          )}
        {/* Owner Management Buttons */}
        {isMine && prop && gameState.phase !== 'AWAITING_AUCTION' && (
          <div className="chart-manifest-actions">
            {tile.type === 'PORT' && (
              <>
                <div className="chart-action-row">
                  <button
                    onClick={() => onAction({ type: 'BUILD_CONTAINER', tileId })}
                    disabled={!canBuild}
                    className="chart-button chart-button-primary"
                  >
                    <Building2 aria-hidden="true" />{' '}
                    {prop.containerLevel === 4
                      ? 'Lên ONE Innovation'
                      : `Đặt Lô (+${buildCost}M)`}
                  </button>

                  <button
                    onClick={() => onAction({ type: 'SELL_CONTAINER', tileId })}
                    disabled={!canSell}
                    className="chart-button"
                  >
                    <TrendingDown aria-hidden="true" /> Bán (Hoàn ${refund}M)
                  </button>
                </div>

                {/* Green Fleet Upgrade Button */}
                {prop.containerLevel === 5 && !prop.hasGreenFleet && (
                  <button
                    onClick={() => onAction({ type: 'UPGRADE_GREEN_FLEET', tileId })}
                    className="chart-button chart-button-primary"
                  >
                    <Leaf aria-hidden="true" /> Gắn Huy Hiệu Xanh (+${GREEN_FLEET_COST}M)
                  </button>
                )}
              </>
            )}

            {!prop.isMortgaged ? (
              <button
                onClick={() => onAction({ type: 'MORTGAGE_TILE', tileId })}
                disabled={!canMortgage}
                className="chart-button"
              >
                <ShieldAlert aria-hidden="true" /> Thế chấp (Nhận +${mortgageValue}M)
              </button>
            ) : (
              <button
                onClick={() => onAction({ type: 'UNMORTGAGE_TILE', tileId })}
                className="chart-button chart-button-primary"
              >
                <DollarSign aria-hidden="true" /> Chuộc lại (Nộp ${unmortgageCost}M)
              </button>
            )}
          </div>
        )}
      </div>
    </BoardDialog>
  );
};
