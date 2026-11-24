# Visual Mission Target Indicators & Interactive Checklist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hiển thị huy hiệu mục tiêu nhiệm vụ (mini-badge) ở mép ô cờ trên bàn cờ và cung cấp bảng checklist nhiệm vụ có thanh tiến độ và khả năng click để highlight ô cờ tương ứng.

**Architecture:** Tạo helper phân tích mục tiêu nhiệm vụ `missionTargets.ts` để bóc tách trạng thái từng điều kiện của 5 loại Hợp đồng Chiến lược; tích hợp mini-badge và hiệu ứng spotlight trên `TileView.tsx`/`Board.tsx`; nâng cấp `SecretMissionCardView.tsx` thành checklist tương tác có kết nối highlight ô cờ thông qua `App.tsx`.

**Tech Stack:** React 19, TypeScript, Tailwind CSS, Lucide Icons, Node.js test runner.

**Spec:** [`docs/superpowers/specs/2026-11-20-mission-target-indicators-design.md`](file:///Users/thien.buix/Documents/Games/Monopoly/docs/superpowers/specs/2026-11-20-mission-target-indicators-design.md)

## Global Constraints
- Tuân thủ quy định: Không tự ý chạy `git commit` hay `git push` trừ khi người dùng yêu cầu trực tiếp.
- Chỉ hiển thị mục tiêu nhiệm vụ của người chơi hiện tại (`myPlayerId`), tuyệt đối không làm lộ nhiệm vụ của người chơi khác.
- Mini-badge phải nằm ở mép cạnh ô cờ hướng về phía tâm hải đồ để không che khuất mã cảng, giá cước, container hoặc cờ sở hữu.
- Toàn bộ bài kiểm tra client và shared test phải vượt qua 100%.

## Review Focus
1. Nhiệm vụ không có ô cờ cố định (ví dụ: yêu cầu nâng cấp 1 Siêu tàu cấp 5 hoặc 1 Tàu Nhiên Liệu Xanh ở bất kỳ cảng nào) -> Hiển thị dạng mục tiêu chung trong checklist mà không gây lỗi tìm ô cờ.
2. Ô mục tiêu đã bị đối thủ mua -> Vẫn hiển thị badge mục tiêu nhưng phản ánh trạng thái đối thủ sở hữu trong checklist để người chơi biết đường thương lượng.
3. Chuyển đổi giữa chế độ 2D và 3D -> Mini-badge và spotlight vẫn hiển thị đúng góc quay và không bị lệch hoặc biến dạng.
4. Hover ra ngoài checklist -> Tắt highlight ngay lập tức, tránh giữ spotlight vĩnh viễn trên bàn cờ.
5. Người chơi là Spectator (chưa tham gia phòng hoặc chỉ quan sát) -> Không hiển thị badge mục tiêu và không gây crash.

---

### Task 1: Mission Target Resolver Helper (`missionTargets.ts`)

**Files:**
- Create: `packages/client/src/utils/missionTargets.ts`
- Test: `packages/client/tests/missionTargets.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface MissionTargetItem {
    id: string;
    tileId?: number;
    code?: string;
    name: string;
    description?: string;
    isCompleted: boolean;
    ownerName?: string;
    isOwnedByMe: boolean;
  }

  export interface MissionProgressInfo {
    missionId: string;
    title: string;
    completedCount: number;
    totalCount: number;
    isFullyCompleted: boolean;
    items: MissionTargetItem[];
    targetTileIds: Set<number>;
    completedTileIds: Set<number>;
  }

  export function resolveMissionProgress(
    mission: SecretMissionCard | undefined,
    gameState: GameState | null,
    myPlayerId: string | null
  ): MissionProgressInfo | null;
  ```

- [ ] **Step 1: Viết test cho `resolveMissionProgress`**
  Tạo `packages/client/tests/missionTargets.test.ts` kiểm tra:
  - MISSION-1: Trả về 3 mục tiêu (Cái Mép #3, LA #23, PS3 #28), tính đúng số lượng hoàn thành khi sở hữu 1 trong 3 ô.
  - MISSION-2: Trả về Tokyo #31, Busan #17, và Siêu tàu cấp 5.
  - MISSION-3: Trả về ONE QUOTE #10, ONE Eco #22, và Green Fleet.
  - MISSION-4: Trả về 4 Tuyến Dịch Vụ và kiểm tra tiến độ yêu cầu (tối thiểu 3).
  - MISSION-5: Trả về Cát Lái #1, Cái Mép #3, Tuyến VSS #4.
  - Trường hợp `null` hoặc spectator: Trả về an toàn không lỗi.

- [ ] **Step 2: Chạy test để xác nhận test thất bại**
  Run: `node --test --import tsx packages/client/tests/missionTargets.test.ts`
  Expected: FAIL (module not found).

- [ ] **Step 3: Triển khai `resolveMissionProgress` trong `packages/client/src/utils/missionTargets.ts`**
  Triển khai đầy đủ logic ánh xạ 5 loại nhiệm vụ, kiểm tra trạng thái sở hữu từ `gameState.properties` đối với `myPlayerId`.

- [ ] **Step 4: Chạy lại test để xác nhận hoàn toàn PASS**
  Run: `node --test --import tsx packages/client/tests/missionTargets.test.ts`
  Expected: PASS tất cả các ca kiểm thử.

---

### Task 2: Cập nhật `TileView.tsx` & CSS cho Mini-Badge Mục Tiêu và Spotlight

**Files:**
- Modify: `packages/client/src/components/TileView.tsx`
- Modify: `packages/client/src/components/chart-board.css`

**Interfaces:**
- Consumes:
  - `missionTarget?: { isTarget: boolean; isCompleted: boolean }`
  - `isHighlighted?: boolean`

- [ ] **Step 1: Viết CSS hiệu ứng Mini-Badge & Spotlight trong `chart-board.css`**
  - Thêm animation `.tile-mission-badge`: Đặt ở mép cạnh ô cờ đối diện hướng viền ngoài (hướng về phía bàn cờ), kích thước nhỏ gọn 14-16px, bo tròn, có icon Target hoặc Check, đổ bóng nhẹ.
  - Thêm animation `.tile-spotlight`: Viền sáng nhấp nháy màu hồng ONE (`box-shadow: 0 0 12px 3px rgba(225, 0, 122, 0.85)`).

- [ ] **Step 2: Cập nhật props và render trong `TileView.tsx`**
  - Thêm props `missionTarget` và `isHighlighted` vào `TileViewProps`.
  - Render thẻ badge theo `orientation` (đặt ở cạnh trong của ô):
    - `bottom`: nằm ở mép trên của ô.
    - `top`: nằm ở mép dưới của ô.
    - `left`: nằm ở mép phải của ô.
    - `right`: nằm ở mép trái của ô.
  - Nếu `missionTarget.isCompleted` -> Badge xanh `✓`. Nếu chưa -> Badge hồng `🎯`.
  - Nếu `isHighlighted` -> gắn class `tile-spotlight`.

- [ ] **Step 3: Kiểm tra biên dịch**
  Run: `npm run build:client`
  Expected: PASS không có lỗi TypeScript.

---

### Task 3: Nâng cấp `SecretMissionCardView.tsx` thành Checklist Tương Tác

**Files:**
- Modify: `packages/client/src/components/SecretMissionCardView.tsx`

**Interfaces:**
- Consumes:
  - `resolveMissionProgress` từ `missionTargets.ts`
  - Prop mới: `gameState: GameState`
  - Prop mới: `onHighlightTile?: (tileId: number | null) => void`
  - Prop mới: `highlightedTileId?: number | null`

- [ ] **Step 1: Cập nhật component `SecretMissionCardView`**
  - Tính toán `progress = resolveMissionProgress(player.secretMission, gameState, player.id)`.
  - Hiển thị thanh tiến độ: ví dụ `Tiến độ: 2/3 mục tiêu` cùng thanh progress bar nhỏ màu gradient hồng/emerald.
  - Hiển thị danh sách checklist:
    - Mỗi mục có checkbox `[✓]` (màu xanh) hoặc `[ ]` (màu xám).
    - Hiển thị mã ô (nếu có, e.g. `VNVUT`), tên địa điểm, và tình trạng (ví dụ: "Đã sở hữu" hoặc tên chủ sở hữu nếu bị đối thủ mua).
    - Sự kiện `onMouseEnter` / `onClick` gọi `onHighlightTile(item.tileId)`.
    - Sự kiện `onMouseLeave` gọi `onHighlightTile(null)`.
  - Khi click vào mục tiêu có `tileId`: Giữ highlight trong 2 giây để người chơi dễ quan sát bàn cờ.

- [ ] **Step 2: Kiểm tra biên dịch**
  Run: `npm run build:client`
  Expected: PASS.

---

### Task 4: Kết nối State trong `Board.tsx` & `App.tsx` và Xác minh Toàn diện

**Files:**
- Modify: `packages/client/src/components/Board.tsx`
- Modify: `packages/client/src/App.tsx`

**Interfaces:**
- State `highlightedTileId: number | null` được quản lý tại `App.tsx` hoặc chuyển qua `Board.tsx`.
- `Board.tsx` truyền `missionTarget` và `isHighlighted` tới từng `TileView`.

- [ ] **Step 1: Cập nhật `Board.tsx`**
  - Nhận prop `missionProgress?: MissionProgressInfo | null`.
  - Nhận prop `highlightedTileId?: number | null`.
  - Khi render từng `TileView`, truyền:
    - `missionTarget`: `{ isTarget: missionProgress.targetTileIds.has(tile.id), isCompleted: missionProgress.completedTileIds.has(tile.id) }`.
    - `isHighlighted`: `highlightedTileId === tile.id`.

- [ ] **Step 2: Cập nhật `App.tsx`**
  - Khai báo state `const [highlightedTileId, setHighlightedTileId] = useState<number | null>(null);`.
  - Tính `missionProgress = resolveMissionProgress(myPlayer?.secretMission, gameState, myPlayerId);`.
  - Truyền `missionProgress` và `highlightedTileId` xuống `Board`.
  - Truyền `gameState`, `highlightedTileId`, và `onHighlightTile={setHighlightedTileId}` xuống `SecretMissionCardView`.

- [ ] **Step 3: Chạy toàn bộ test suites**
  Run: `npm run test:shared && npm test --workspace=@one-monopoly/client`
  Expected: PASS 100%.

- [ ] **Step 4: Chạy build production**
  Run: `npm run build:client`
  Expected: PASS không có lỗi hoặc cảnh báo.

- [ ] **Step 5: Kiểm tra trạng thái Git**
  Run: `git status`
  Expected: Xác nhận không có commit tự ý nào được tạo.
