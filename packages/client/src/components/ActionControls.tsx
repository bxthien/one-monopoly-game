import React from 'react';
import { BOARD_TILES, GameAction, GameState } from '@one-monopoly/shared';
import { Dices, Check, X, DollarSign, ShieldCheck, Ticket, AlertTriangle, Handshake, Leaf } from 'lucide-react';

interface Props {
  gameState: GameState;
  myPlayerId: string | null;
  onAction: (action: GameAction) => void;
  isRolling: boolean;
  isPawnMoving?: boolean;
}

export const ActionControls: React.FC<Props> = ({
  gameState,
  myPlayerId,
  onAction,
  isRolling,
  isPawnMoving = false,
}) => {
  const activePlayer = gameState.players[gameState.activePlayerIndex];
  const isMyTurn = activePlayer.id === myPlayerId;
  const currentTile = BOARD_TILES[activePlayer.position];

  // 1. Khi xúc xắc đang quay hoặc tàu đang lướt trên đường đi:
  // CHƯA hiển thị nhiệm vụ/mua đất/thông báo cho tới khi tàu cập bến an toàn
  if (isRolling) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-4 px-4 bg-gray-50/90 rounded-2xl border border-gray-200 text-gray-700 font-bold text-sm select-none shadow-xs">
        <Dices className="w-5 h-5 text-[#E1007A] animate-spin" />
        <span>Đang lắc xúc xắc...</span>
      </div>
    );
  }

  if (isPawnMoving) {
    return (
      <div className="flex items-center justify-center gap-2.5 py-4 px-4 bg-pink-50/80 rounded-2xl border border-pink-200 text-[#E1007A] font-bold text-sm select-none shadow-xs">
        <span className="w-2.5 h-2.5 rounded-full bg-[#E1007A] animate-ping" />
        <span>Tàu đang di chuyển tới bến cảng...</span>
      </div>
    );
  }

  // ==================== 1. Awaiting Slot Charter Response ==================== //
  if (gameState.phase === 'AWAITING_SLOT_CHARTER_RESPONSE' && gameState.pendingSlotCharter) {
    const charter = gameState.pendingSlotCharter;
    const isOwner = myPlayerId === charter.ownerId;
    const isRequester = myPlayerId === charter.requesterId;
    const requester = gameState.players.find((p) => p.id === charter.requesterId);
    const owner = gameState.players.find((p) => p.id === charter.ownerId);
    const tile = BOARD_TILES[charter.tileId];

    if (isOwner) {
      return (
        <div className="flex flex-col gap-3 p-4 bg-blue-50/70 rounded-2xl border-2 border-blue-500 animate-pulse-fast">
          <div className="flex items-center gap-2 text-blue-900 font-black text-sm">
            <Handshake className="w-5 h-5 text-blue-600" />
            <span>ĐỀ NGHỊ CHIA SẺ CHỖ: "AS ONE, WE CAN"</span>
          </div>
          <p className="text-xs text-blue-800 leading-relaxed font-medium">
            <span className="font-bold text-gray-900">{requester?.name}</span> sở hữu Tuyến Dịch Vụ và đề nghị kích hoạt Slot Chartering tại <span className="font-bold">{tile.name}</span>:
            <br />
            • Bạn nhận ngay <strong className="text-emerald-700">${charter.discountedRent}M</strong> (50% cước).
            <br />
            • Lượt khách tiếp theo dừng tại cảng này sẽ được <strong>chia đôi 50/50 doanh thu</strong> cho bạn và {requester?.name}!
          </p>
          <div className="flex items-center gap-3 mt-1">
            <button
              onClick={() => onAction({ type: 'RESPOND_SLOT_CHARTER', accept: true })}
              className="flex-1 py-3 px-4 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-200 transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="w-5 h-5" /> ĐỒNG Ý LIÊN MINH (50/50)
            </button>
            <button
              onClick={() => onAction({ type: 'RESPOND_SLOT_CHARTER', accept: false })}
              className="py-3 px-4 rounded-xl font-bold bg-gray-200 hover:bg-gray-300 text-gray-700 transition"
            >
              TỪ CHỐI (THU 100%)
            </button>
          </div>
        </div>
      );
    }

    if (isRequester) {
      return (
        <div className="flex flex-col gap-2 p-4 bg-blue-50/50 rounded-2xl border border-blue-300 text-center">
          <div className="flex items-center justify-center gap-2 text-blue-700 font-black text-sm">
            <Handshake className="w-5 h-5 animate-bounce" />
            <span>ĐÃ GỬI ĐỀ NGHỊ "AS ONE, WE CAN"</span>
          </div>
          <p className="text-xs text-gray-600">
            Đang chờ chủ cảng <span className="font-bold text-gray-900">{owner?.name}</span> phản hồi đề nghị chia sẻ chỗ (giảm 50% cước)...
          </p>
        </div>
      );
    }

    return (
      <div className="text-center py-3 px-4 bg-gray-50 rounded-2xl border border-gray-200 text-gray-500 font-semibold text-sm">
        Đang thương lượng thỏa thuận Slot Chartering giữa {requester?.name} và {owner?.name}...
      </div>
    );
  }

  if (!isMyTurn) {
    return (
      <div className="text-center py-3 px-4 bg-gray-50 rounded-2xl border border-gray-200 text-gray-500 font-semibold text-sm">
        Đang chờ <span className="text-gray-900 font-bold">{activePlayer.name}</span> thực hiện lượt...
      </div>
    );
  }

  // ==================== 2. Awaiting Buy Decision ==================== //
  if (gameState.phase === 'AWAITING_BUY_DECISION') {
    const price = currentTile.price || 0;
    const canAfford = activePlayer.balance >= price;

    return (
      <div className="flex flex-col gap-3 p-4 bg-pink-50/50 rounded-2xl border-2 border-[#E1007A]">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase">CƠ HỘI ĐẦU TƯ</div>
            <div className="text-base font-black text-gray-900">
              {currentTile.name} ({currentTile.code})
            </div>
          </div>
          <div className="text-lg font-black text-[#E1007A]">${price}M</div>
        </div>

        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={() => onAction({ type: 'BUY_PROPERTY' })}
            disabled={!canAfford}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-white flex items-center justify-center gap-2 shadow-md transition ${
              canAfford
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 cursor-pointer'
                : 'bg-gray-300 cursor-not-allowed text-gray-500'
            }`}
          >
            <Check className="w-5 h-5" /> MUA CẢNG NÀY
          </button>
          <button
            onClick={() => onAction({ type: 'SKIP_BUY' })}
            className="flex-1 py-3 px-4 rounded-xl font-bold bg-gray-200 hover:bg-gray-300 text-gray-700 flex items-center justify-center gap-2 transition"
          >
            <X className="w-5 h-5" /> BỎ QUA
          </button>
        </div>
      </div>
    );
  }

  // ==================== 3. Awaiting Debt Resolution ==================== //
  if (gameState.phase === 'AWAITING_DEBT_RESOLUTION' && gameState.pendingDebt) {
    const debt = gameState.pendingDebt;
    const canSettle = activePlayer.balance >= debt.amount;

    return (
      <div className="flex flex-col gap-3 p-4 bg-red-50 rounded-2xl border-2 border-red-500">
        <div className="flex items-center gap-2 text-red-600 font-black text-sm">
          <AlertTriangle className="w-5 h-5" /> BẠN ĐANG MẮC NỢ ${debt.amount}M
        </div>
        <p className="text-xs text-red-800 font-medium">
          Lý do: {debt.reason}. Bạn có thể thế chấp tài sản hoặc bán bớt container để gom tiền.
        </p>

        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={() => onAction({ type: 'SETTLE_DEBT' })}
            disabled={!canSettle}
            className={`flex-1 py-3 px-4 rounded-xl font-black text-white flex items-center justify-center gap-2 shadow-md transition ${
              canSettle
                ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200 cursor-pointer'
                : 'bg-gray-300 cursor-not-allowed text-gray-500'
            }`}
          >
            <DollarSign className="w-5 h-5" /> THANH TOÁN NỢ (${debt.amount}M)
          </button>
          <button
            onClick={() => onAction({ type: 'DECLARE_BANKRUPTCY' })}
            className="py-3 px-4 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white flex items-center justify-center gap-2 transition"
          >
            PHÁ SẢN
          </button>
        </div>
      </div>
    );
  }

  // ==================== 4. In Customs Hold (Wait for Roll) ==================== //
  if (activePlayer.inHold && gameState.phase === 'WAIT_FOR_ROLL') {
    return (
      <div className="flex flex-col gap-3 p-4 bg-amber-50 rounded-2xl border-2 border-amber-400">
        <div className="text-xs font-bold text-amber-800 uppercase tracking-wide">
          BẠN ĐANG BỊ KẸT TẠI KHU NEO ĐẬU KIỂM HÓA ({activePlayer.holdTurns}/3 LƯỢT)
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <button
            onClick={() => onAction({ type: 'ROLL_DICE' })}
            disabled={isRolling}
            className="py-2.5 px-3 rounded-xl font-black bg-[#E1007A] hover:bg-[#B80063] text-white text-xs flex items-center justify-center gap-1.5 shadow-md shadow-pink-200 transition"
          >
            <Dices className="w-4 h-4" /> TUNG ĐÔI ĐỂ THOÁT
          </button>

          <button
            onClick={() => onAction({ type: 'PAY_HOLD_FINE' })}
            disabled={activePlayer.balance < 50}
            className="py-2.5 px-3 rounded-xl font-bold bg-amber-600 hover:bg-amber-700 text-white text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            <DollarSign className="w-4 h-4" /> NỘP $50M PHÍ
          </button>

          <button
            onClick={() => onAction({ type: 'USE_CLEARANCE_PASS' })}
            disabled={activePlayer.customsClearancePasses <= 0}
            className="py-2.5 px-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
          >
            <Ticket className="w-4 h-4" /> DÙNG THẺ THÔNG QUAN
          </button>
        </div>
      </div>
    );
  }

  // ==================== 5. Normal Wait for Roll ==================== //
  if (gameState.phase === 'WAIT_FOR_ROLL') {
    return (
      <button
        onClick={() => onAction({ type: 'ROLL_DICE' })}
        disabled={isRolling}
        className="w-full py-4 rounded-2xl bg-[#E1007A] hover:bg-[#B80063] text-white font-black text-base flex items-center justify-center gap-3 shadow-xl shadow-pink-200 transition active:scale-98 cursor-pointer"
      >
        <Dices className="w-6 h-6 animate-bounce" />
        {isRolling ? 'ĐANG LẮC XÚC XẮC...' : 'LẮC XÚC XẮC!'}
      </button>
    );
  }

  // ==================== 6. End of Turn ==================== //
  return (
    <button
      onClick={() => onAction({ type: 'END_TURN' })}
      className="w-full py-4 rounded-2xl bg-gray-900 hover:bg-black text-white font-black text-base flex items-center justify-center gap-2 shadow-lg transition active:scale-98 cursor-pointer"
    >
      KẾT THÚC LƯỢT
    </button>
  );
};
