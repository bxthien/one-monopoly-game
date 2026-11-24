# Design Document: Port Takeover Mechanic (Thâu Tóm / Mua Lại Cảng)

## 1. Intent & The Why
Khi người chơi đáp vào một ô Cảng (PORT) của đối thủ và đã thanh toán tiền cước lưu bãi (Demurrage), cho phép người chơi có cơ hội **Mua lại quyền sở hữu cảng** (Hostile Takeover) nếu họ có đủ tiền. Cơ chế này tạo sự kịch tính, giúp lật ngược thế cờ khi đối thủ đang độc quyền nhóm cảng hoặc giúp người chơi hoàn thành Hợp Đồng Chiến Lược (Secret Mission) nếu các ô mục tiêu đã bị mua trước đó.

## 2. Goals & Non-Goals
- **Goals:**
  - Định nghĩa hằng số hệ số mua lại: `export const PORT_TAKEOVER_MULTIPLIER = 1.3;` (dễ dàng cấu hình lại thành 2.0x hoặc giá trị khác).
  - Công thức tính giá mua lại:
    `TakeoverPrice = Math.round((tile.price + (tile.buildCost || 50) * containerLevel) * PORT_TAKEOVER_MULTIPLIER)`
  - Quy trình thanh toán:
    1. Người chơi trả phí cước lưu bãi (Demurrage) bình thường.
    2. Nếu cảng đủ điều kiện mua lại và người chơi có số dư `balance >= TakeoverPrice`, chuyển sang trạng thái chờ quyết định: `AWAITING_TAKEOVER_DECISION`.
    3. Người chơi có thể chọn:
       - **Mua lại:** Trừ tiền người mua, cộng toàn bộ số tiền đó cho chủ cũ, đổi quyền sở hữu `prop.ownerId = visitorId`.
       - **Bỏ qua:** Giữ nguyên quyền sở hữu và kết thúc lượt/bước di chuyển.
  - Hỗ trợ cả người chơi thật lẫn BOT (Bot AI tự quyết định có nên mua lại hay không dựa trên số dư và giá trị chiến lược).
- **Rules & Protection:**
  - **Landmark Protection:** Cảng đã nâng cấp lên **Siêu tàu Cấp 5 (24K TEU)** là bất khả xâm phạm (`containerLevel === 5` -> KHÔNG THỂ bị mua lại).
  - Cảng đang bị cầm cố (`isMortgaged`) không áp dụng mua lại theo cơ chế này.
  - Chỉ áp dụng cho ô **Cảng biển (PORT)**. Không áp dụng cho Tuyến Dịch Vụ và Hạ Tầng.
- **Non-Goals:**
  - Không thay đổi các quy tắc tính cước lưu bãi ban đầu (vẫn phải trả cước trước khi mua lại).

## 3. Data Structures & Engine Changes
- **Shared Constants (`packages/shared/src/boardData.ts`):**
  - `export const PORT_TAKEOVER_MULTIPLIER = 1.3;`
- **Game Phase & Actions (`packages/shared/src/types.ts`):**
  - Phase mới: `'AWAITING_TAKEOVER_DECISION'`
  - State trường phụ: `pendingTakeover?: { tileId: number; ownerId: string; buyerId: string; price: number; }`
  - Action mới:
    `| { type: 'TAKEOVER_PROPERTY'; tileId: number }`
    `| { type: 'SKIP_TAKEOVER' }`
  - Events mới:
    `| { type: 'PROPERTY_TAKEOVER'; tileId: number; previousOwnerId: string; newOwnerId: string; price: number }`

## 4. UI / UX Design
- **Action Controls (`ActionControls.tsx`):**
  - Khi ở phase `AWAITING_TAKEOVER_DECISION` và đến lượt người chơi:
    - Hiển thị bảng thông báo nổi bật màu ONE Magenta:
      - Tiêu đề: *Thâu Tóm Cảng Biển*
      - Thông tin: Tên cảng, mã cảng, giá mua lại (`$XXXM` - gồm 1.3x giá trị cảng).
      - Nút 1: **"Mua Lại Cảng ($XXXM)"** (Nút màu hồng ONE).
      - Nút 2: **"Bỏ Qua"** (Nút màu xám).
  - Hiển thị âm thanh/event log khi thâu tóm thành công: *"⚓ [Tên người chơi] đã thâu tóm Cảng [Tên cảng] từ [Chủ cũ] với giá $XXXM!"*
