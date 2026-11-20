import React from 'react';
import { BOARD_TILES, GameAction, GameState, getTradeRestriction } from '@one-monopoly/shared';
import { Dices, Check, Gavel, DollarSign, Ticket, AlertTriangle, Handshake, Ship, Flag } from 'lucide-react';
import { StormDecision } from './StormDecision.js';
import { PropertyAuctionPanel } from './PropertyAuctionPanel.js';
import './chart-actions.css';

interface Props {
  gameState: GameState;
  myPlayerId: string | null;
  onAction: (action: GameAction, onFailure?: () => void) => void;
  onOpenTrades: () => void;
  isRolling: boolean;
  isPawnMoving?: boolean;
}

export const ActionControls: React.FC<Props> = ({
  gameState,
  myPlayerId,
  onAction,
  onOpenTrades,
  isRolling,
  isPawnMoving = false,
}) => {
  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const isMyTurn = activePlayer.id === myPlayerId;
  const currentTile = BOARD_TILES[activePlayer.position];

  // Another captain's bid clock can already be running while the landing ship is moving.
  if (gameState.phase === 'AWAITING_AUCTION' && gameState.auction) {
    const auction = gameState.auction;
    return <PropertyAuctionPanel key={`${auction.id}-${auction.revision}`} auction={auction}
      players={gameState.players} myPlayerId={myPlayerId} onAction={onAction} />;
  }

  if (isRolling) {
    return (
      <div role="status" className="chart-action-panel chart-action-status">
        <Dices size={18} aria-hidden="true" />
        <span>Đang lắc xúc xắc...</span>
      </div>
    );
  }

  if (isPawnMoving) {
    return (
      <div role="status" className="chart-action-panel chart-action-status">
        <Ship size={18} aria-hidden="true" />
        <span>Tàu đang di chuyển tới bến cảng...</span>
      </div>
    );
  }

  if (gameState.phase === 'AWAITING_STORM_DECISION') {
    return <StormDecision gameState={gameState} isMyTurn={isMyTurn} onAction={onAction} />;
  }

  if (gameState.phase === 'AWAITING_SLOT_CHARTER_RESPONSE' && gameState.pendingSlotCharter) {
    const charter = gameState.pendingSlotCharter;
    const isOwner = myPlayerId === charter.ownerId;
    const isRequester = myPlayerId === charter.requesterId;
    const requester = gameState.players.find((p) => p.id === charter.requesterId);
    const owner = gameState.players.find((p) => p.id === charter.ownerId);
    const tile = BOARD_TILES[charter.tileId];

    if (isOwner) {
      return (
        <section className="chart-action-panel">
          <h3 className="chart-action-title">
            <Handshake size={18} aria-hidden="true" />
            <span>ĐỀ NGHỊ CHIA SẺ CHỖ: "AS ONE, WE CAN"</span>
          </h3>
          <p className="chart-action-copy">
            <strong>{requester?.name}</strong> sở hữu Tuyến Dịch Vụ và đề nghị kích hoạt Slot Chartering tại <strong>{tile.name}</strong>:
            <br />
            • Cước sau khi giảm còn <strong>${charter.discountedRent}M</strong> (50% cước).
            <br />
            • Khi một người chơi khác ngoài hai bên ghé cảng lần tới, bạn và {requester?.name} sẽ chia đôi tiền cước.
          </p>
          <div className="chart-action-row">
            <button
              onClick={() => onAction({ type: 'RESPOND_SLOT_CHARTER', accept: true })}
              className="chart-button chart-button-primary"
            >
              <Check size={18} aria-hidden="true" /> ĐỒNG Ý LIÊN MINH (50/50)
            </button>
            <button
              onClick={() => onAction({ type: 'RESPOND_SLOT_CHARTER', accept: false })}
              className="chart-button"
            >
              TỪ CHỐI (THU 100%)
            </button>
          </div>
        </section>
      );
    }

    if (isRequester) {
      return (
        <section role="status" className="chart-action-panel">
          <h3 className="chart-action-title">
            <Handshake size={18} aria-hidden="true" />
            <span>ĐÃ GỬI ĐỀ NGHỊ "AS ONE, WE CAN"</span>
          </h3>
          <p className="chart-action-copy">
            Đang chờ chủ cảng <strong>{owner?.name}</strong> phản hồi đề nghị chia sẻ chỗ. Nếu hết giờ, bạn trả đủ ${charter.originalRent}M.
          </p>
        </section>
      );
    }

    return (
      <div role="status" className="chart-action-panel chart-action-status">
        <Handshake size={18} aria-hidden="true" />
        <span>Đang thương lượng thỏa thuận Slot Chartering giữa {requester?.name} và {owner?.name}...</span>
      </div>
    );
  }

  if (!isMyTurn) {
    const offers = gameState.tradeOffers ?? [];
    const hasOffers = offers.some(offer => offer.sellerId === myPlayerId || offer.buyerId === myPlayerId);
    const canShop = myPlayerId && BOARD_TILES.some(tile => !getTradeRestriction(gameState, myPlayerId, tile.id));
    return (
      <div className="chart-action-panel">
        <p role="status" className="chart-waiting-turn"><Flag size={18} aria-hidden="true" />
          <span>Đang chờ <strong>{activePlayer.name}</strong> thực hiện lượt...</span></p>
        {(hasOffers || canShop) &&
          <button className="chart-button chart-button-navy" type="button" onClick={onOpenTrades}>
            <Handshake aria-hidden="true" />{hasOffers ? 'Xem đề nghị giao dịch' : 'Tìm tài sản để mua'}
          </button>}
      </div>
    );
  }

  if (gameState.phase === 'AWAITING_BUY_DECISION') {
    const price = currentTile.price || 0;
    const canAfford = activePlayer.balance >= price;

    return (
      <section className="chart-action-panel">
        <div className="chart-action-offer">
          <div>
            <p className="chart-action-copy">CƠ HỘI ĐẦU TƯ</p>
            <h3 className="chart-action-title">
              {currentTile.name} ({currentTile.code})
            </h3>
          </div>
          <div className="chart-action-price">${price}M</div>
        </div>

        <p className="chart-action-copy">Nếu bạn không mua, tài sản sẽ được đưa ra đấu giá.</p>
        <div className="chart-action-row">
          <button
            type="button"
            onClick={() => onAction({ type: 'BUY_PROPERTY' })}
            disabled={!canAfford}
            className="chart-button chart-button-primary"
          >
            <Check size={18} aria-hidden="true" /> Mua ngay
          </button>
          <button
            type="button"
            onClick={() => onAction({ type: 'SKIP_BUY' })}
            className="chart-button"
          >
            <Gavel size={18} aria-hidden="true" /> Mở đấu giá
          </button>
        </div>
      </section>
    );
  }

  if (gameState.phase === 'AWAITING_DEBT_RESOLUTION' && gameState.pendingDebt) {
    const debt = gameState.pendingDebt;
    const canSettle = activePlayer.balance >= debt.amount;

    return (
      <section className="chart-action-panel">
        <h3 className="chart-action-title">
          <AlertTriangle size={18} aria-hidden="true" /> BẠN ĐANG MẮC NỢ ${debt.amount}M
        </h3>
        <p className="chart-action-copy">
          Lý do: {debt.reason}. Bạn có thể thế chấp tài sản hoặc bán bớt container để gom tiền.
        </p>

        <div className="chart-action-row">
          <button
            onClick={() => onAction({ type: 'SETTLE_DEBT' })}
            disabled={!canSettle}
            className="chart-button chart-button-primary"
          >
            <DollarSign size={18} aria-hidden="true" /> THANH TOÁN NỢ (${debt.amount}M)
          </button>
          <button
            onClick={() => onAction({ type: 'DECLARE_BANKRUPTCY' })}
            className="chart-button chart-button-danger"
          >
            PHÁ SẢN
          </button>
        </div>
      </section>
    );
  }

  if (activePlayer.inHold && gameState.phase === 'WAIT_FOR_ROLL') {
    return (
      <section className="chart-action-panel">
        <h3 className="chart-action-title">
          BẠN ĐANG BỊ KẸT TẠI KHU NEO ĐẬU KIỂM HÓA ({activePlayer.holdTurns}/3 LƯỢT)
        </h3>

        <div className="chart-action-options">
          <button
            onClick={() => onAction({ type: 'ROLL_DICE' })}
            disabled={isRolling}
            className="chart-button chart-button-primary"
          >
            <Dices size={18} aria-hidden="true" /> TUNG ĐÔI ĐỂ THOÁT
          </button>

          <button
            onClick={() => onAction({ type: 'PAY_HOLD_FINE' })}
            disabled={activePlayer.balance < 50}
            className="chart-button"
          >
            <DollarSign size={18} aria-hidden="true" /> NỘP $50M PHÍ
          </button>

          <button
            onClick={() => onAction({ type: 'USE_CLEARANCE_PASS' })}
            disabled={activePlayer.customsClearancePasses <= 0}
            className="chart-button"
          >
            <Ticket size={18} aria-hidden="true" /> DÙNG THẺ THÔNG QUAN
          </button>
        </div>
      </section>
    );
  }

  if (gameState.phase === 'WAIT_FOR_ROLL') {
    return (
      <button
        onClick={() => onAction({ type: 'ROLL_DICE' })}
        disabled={isRolling}
        className="chart-button chart-button-primary chart-button-wide"
      >
        <Dices size={18} aria-hidden="true" />
        {isRolling ? 'ĐANG LẮC XÚC XẮC...' : 'LẮC XÚC XẮC!'}
      </button>
    );
  }

  return (
    <button
      onClick={() => onAction({ type: 'END_TURN' })}
      className="chart-button chart-button-navy chart-button-wide"
    >
      <Flag size={18} aria-hidden="true" /> KẾT THÚC LƯỢT
    </button>
  );
};
