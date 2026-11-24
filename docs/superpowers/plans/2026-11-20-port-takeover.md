# Port Takeover Mechanic (Thâu Tóm / Mua Lại Cảng) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thêm cơ chế cho phép người chơi mua lại cảng của đối thủ sau khi đã trả cước lưu bãi với hệ số nhân cấu hình `PORT_TAKEOVER_MULTIPLIER = 1.3`, bảo vệ cảng Cấp 5 (Siêu tàu 24K TEU), và hỗ trợ cả người chơi lẫn Bot.

**Architecture:** Mở rộng Shared Engine với hằng số `PORT_TAKEOVER_MULTIPLIER`, phase `AWAITING_TAKEOVER_DECISION`, action `TAKEOVER_PROPERTY`/`SKIP_TAKEOVER`, và event `PROPERTY_TAKEOVER`; cập nhật `roomManager.ts` phía server để xử lý dispatch và Bot AI; cập nhật `ActionControls.tsx` và `App.tsx` phía client để hiển thị giao diện quyết định thâu tóm.

**Tech Stack:** TypeScript, Fastify + Socket.io Server, React 19 Client, Node.js test runner.

**Spec:** [`docs/superpowers/specs/2026-11-20-port-takeover-design.md`](file:///Users/thien.buix/Documents/Games/Monopoly/docs/superpowers/specs/2026-11-20-port-takeover-design.md)

## Global Constraints
- Tuân thủ quy định: Tuyệt đối KHÔNG tự ý chạy `git commit` hay `git push`.
- Hệ số giá mua lại định nghĩa dưới dạng hằng số `PORT_TAKEOVER_MULTIPLIER = 1.3`.
- Cảng Cấp 5 (24K TEU Landmark) được bảo vệ 100%, không cho phép mua lại.
- Chỉ áp dụng cho ô Cảng (PORT), không áp dụng cho Tuyến Dịch Vụ và Hạ Tầng.
- Toàn bộ test suites (`test:shared` và client) phải vượt qua 100%.

## Review Focus
1. Người chơi trả tiền cước xong nhưng không đủ tiền mua lại -> Không chuyển sang `AWAITING_TAKEOVER_DECISION`, kết thúc bước bình thường.
2. Cảng Cấp 5 (24K TEU Siêu tàu) -> Bị cấm mua lại dù người chơi có bao nhiêu tiền.
3. Người chơi chấp nhận mua lại -> Trừ tiền người mua, cộng toàn bộ tiền vào tài khoản chủ cũ, cập nhật `ownerId` và phát sinh event `PROPERTY_TAKEOVER`.
4. Người chơi từ chối mua lại (`SKIP_TAKEOVER`) -> Giữ nguyên quyền sở hữu và chuyển phase tiếp theo bình thường.
5. Bot AI rơi vào ô cảng đối thủ -> Tự động tính toán hợp lý (nếu đủ tiền và có số dư an toàn thì mua lại) mà không bị treo ván đấu.

---

### Task 1: Định nghĩa Types, Hằng Số & Logic Takeover trong Shared Engine

**Files:**
- Modify: `packages/shared/src/boardData.ts`
- Modify: `packages/shared/src/types.ts`
- Modify: `packages/shared/src/gameEngine.ts`
- Test: `packages/shared/tests/gameEngine.test.ts`

**Interfaces:**
- `boardData.ts`:
  `export const PORT_TAKEOVER_MULTIPLIER = 1.3;`
- `types.ts`:
  `GamePhase`: thêm `'AWAITING_TAKEOVER_DECISION'`
  `PendingTakeover`: `{ tileId: number; ownerId: string; buyerId: string; price: number; }`
  `GameState`: thêm `pendingTakeover?: PendingTakeover | null;`
  `GameAction`: thêm `{ type: 'TAKEOVER_PROPERTY'; tileId: number } | { type: 'SKIP_TAKEOVER' }`
  `GameEvent`: thêm `{ type: 'PROPERTY_TAKEOVER'; tileId: number; previousOwnerId: string; newOwnerId: string; price: number }`
- `gameEngine.ts`:
  `OneMonopolyEngine.calculateTakeoverPrice(state: GameState, tileId: number): number`

- [ ] **Step 1: Viết test cho Port Takeover trong `packages/shared/tests/gameEngine.test.ts`**
  Thêm các ca test:
  - Tính đúng giá mua lại theo hệ số 1.3: Giá đất + (buildCost * level) * 1.3.
  - Đáp vào cảng đối thủ khi đủ tiền -> Chuyển sang phase `AWAITING_TAKEOVER_DECISION`.
  - Không cho phép mua lại cảng Cấp 5 (Landmark protection).
  - Dispatch `TAKEOVER_PROPERTY` -> Tiền chuyển từ buyer sang owner, ownerId cập nhật, event bắn ra.
  - Dispatch `SKIP_TAKEOVER` -> Giữ nguyên chủ sở hữu, hoàn tất lượt.

- [ ] **Step 2: Chạy test để xác nhận test thất bại**
  Run: `npm run test:shared`
  Expected: FAIL do types và logic chưa có.

- [ ] **Step 3: Thêm hằng số và types trong `boardData.ts` và `types.ts`**
  Thêm `PORT_TAKEOVER_MULTIPLIER = 1.3`, các kiểu dữ liệu `PendingTakeover`, action, event và phase.

- [ ] **Step 4: Triển khai logic Takeover trong `gameEngine.ts`**
  - Viết `calculateTakeoverPrice`.
  - Trong `collectRent`: Sau khi trừ tiền cước thành công, kiểm tra nếu là cảng cấp < 5 và visitor có đủ tiền mua lại thì set `state.phase = 'AWAITING_TAKEOVER_DECISION'` và `state.pendingTakeover`.
  - Viết `handleTakeoverProperty` và `handleSkipTakeover` trong switch case `OneMonopolyEngine.dispatch`.

- [ ] **Step 5: Chạy test để xác nhận PASS 100%**
  Run: `npm run test:shared`
  Expected: PASS tất cả các bài kiểm tra.

---

### Task 2: Cập nhật Server Dispatch & Bot AI trong `roomManager.ts`

**Files:**
- Modify: `packages/server/src/roomManager.ts`

**Interfaces:**
- Cho phép dispatch `TAKEOVER_PROPERTY` và `SKIP_TAKEOVER` cho active player khi ở phase `AWAITING_TAKEOVER_DECISION`.
- Bot AI: khi gặp phase `AWAITING_TAKEOVER_DECISION`:
  - Quyết định: Nếu số dư sau khi mua lại vẫn còn >= $300M (an toàn tiền mặt) hoặc đây là cảng thuộc nhóm giúp bot độc quyền/nhiệm vụ -> Mua lại; ngược lại -> Bỏ qua.

- [ ] **Step 1: Cập nhật validation và dispatch trong `roomManager.ts`**
  Thêm `'TAKEOVER_PROPERTY'` và `'SKIP_TAKEOVER'` vào danh sách các action của active player.
  Sau khi dispatch, reset pendingTakeover và quản lý timer.

- [ ] **Step 2: Cập nhật logic Bot trong `runBotTurn`**
  Thêm nhánh xử lý `AWAITING_TAKEOVER_DECISION`:
  Bot tự động chọn `TAKEOVER_PROPERTY` hoặc `SKIP_TAKEOVER` với độ trễ phản xạ mượt mà (300-600ms).

- [ ] **Step 3: Kiểm tra build server**
  Run: `npm run build:server`
  Expected: PASS không lỗi.

---

### Task 3: Cập nhật Giao Diện Quyết Định Thâu Tóm trên Client (`ActionControls.tsx` & `App.tsx`)

**Files:**
- Modify: `packages/client/src/components/ActionControls.tsx`
- Modify: `packages/client/src/App.tsx`

**Interfaces:**
- `ActionControls.tsx`:
  Render bảng điều khiển thâu tóm cảng khi `gameState.phase === 'AWAITING_TAKEOVER_DECISION'`.
  Hiển thị thông tin cảng, chủ cũ, giá mua lại (`$XXXM`), nút "Mua lại cảng" và "Bỏ qua".
- `App.tsx`:
  Bổ sung event log khi nhận sự kiện `PROPERTY_TAKEOVER`.

- [ ] **Step 1: Cập nhật `ActionControls.tsx`**
  Thêm nhánh hiển thị cho phase `AWAITING_TAKEOVER_DECISION`:
  - Nếu là lượt của người chơi (`isMyTurn`): Hiển thị bảng màu ONE Magenta với 2 nút hành động (Mua lại / Bỏ qua).
  - Nếu là lượt của đối thủ: Hiển thị thông báo đang chờ đối thủ quyết định mua lại.

- [ ] **Step 2: Cập nhật event log trong `App.tsx`**
  Bắt sự kiện `PROPERTY_TAKEOVER`:
  `logMsg = ⚓ [Tên người mua] đã thâu tóm Cảng [Tên cảng] từ [Chủ cũ] ($[Giá]M)!`

- [ ] **Step 3: Kiểm tra biên dịch client**
  Run: `npm run build:client`
  Expected: PASS.

---

### Task 4: Kiểm Thử Tích Hợp & Toàn Diện

- [ ] **Step 1: Chạy toàn bộ shared unit tests**
  Run: `npm run test:shared`
  Expected: PASS 100%.

- [ ] **Step 2: Chạy toàn bộ client tests**
  Run: `npm test --workspace=@one-monopoly/client`
  Expected: PASS 100%.

- [ ] **Step 3: Chạy full build toàn bộ dự án**
  Run: `npm run build`
  Expected: PASS toàn bộ các package (shared, server, client).

- [ ] **Step 4: Kiểm tra trạng thái Git**
  Run: `git status`
  Expected: Xác nhận không có commit tự ý nào được tạo.
