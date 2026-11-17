# ONE Monopoly (Cờ Tỷ Phú Ocean Network Express) - Kiến Trúc Hệ Thống

## 1. Giới thiệu tổng quan
**ONE Monopoly** là game Cờ Tỷ Phú thời gian thực (Multiplayer Realtime) trên nền web, mang chủ đề ngành vận tải biển container quốc tế của hãng tàu **Ocean Network Express (ONE)**.
- **Màu sắc chủ đạo:** Light Mode sáng hiện đại kết hợp màu thương hiệu **ONE Magenta (`#E1007A`)**.
- **Mô hình kiến trúc:** Client - Server Authoritative với Pure State Machine Engine dùng chung 100% mã nguồn TypeScript giữa Client và Server.
- **Đóng gói:** Single Docker Container chứa cả Backend Fastify + Socket.io và Frontend React (Vite) static build.

---

## 2. Kiến trúc Monorepo

```
/
├── docs/
│   ├── ARCHITECTURE.md          # Đặc tả kiến trúc kỹ thuật & giao thức socket
│   └── GAME_SPECIFICATION.md    # Luật chơi chi tiết, bảng dữ liệu 40 ô & thẻ bài
├── packages/
│   ├── shared/                  # Package dùng chung cho Server & Client
│   │   ├── src/
│   │   │   ├── types.ts         # Types, Interfaces, Enums cho State, Event, Action
│   │   │   ├── boardData.ts     # Dữ liệu 40 ô cảng, 20 thẻ bài, 8 LoopGroup
│   │   │   ├── gameEngine.ts    # Pure State Machine: dispatch(state, action)
│   │   │   └── index.ts
│   │   ├── tests/               # Unit test kiểm tra logic toàn diện
│   │   ├── package.json
│   │   └── tsconfig.json
│   ├── server/                  # Backend Node.js + Fastify + Socket.io
│   │   ├── src/
│   │   │   ├── roomManager.ts   # Quản lý vòng đời phòng, danh sách người chơi
│   │   │   ├── turnTimer.ts     # Bộ đếm ngược 45s mỗi lượt, xử lý AFK
│   │   │   ├── socketServer.ts  # Handlers nhận/phát socket realtime
│   │   │   └── server.ts        # Entrypoint Fastify, static file serving
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── client/                  # Frontend React + Vite + Tailwind CSS + Framer Motion
│       ├── src/
│       │   ├── components/      # Bàn cờ 11x11, thẻ bài, xúc xắc, quân cờ
│       │   ├── hooks/           # useGameEngine, useSocket, useEventQueue
│       │   ├── styles/          # Tailwind config, theme ONE Magenta
│       │   └── App.tsx
│       ├── package.json
│       └── tsconfig.json
├── Dockerfile                   # Multi-stage build phục vụ cả ứng dụng trên 1 port
├── package.json                 # Workspaces root config
└── tsconfig.base.json           # Base TypeScript config
```

---

## 3. Pure State Machine Pattern (Single Source of Truth)

Toàn bộ logic trò chơi được cài đặt theo mô hình **Deterministic Pure Function**:

$$\text{dispatch}(\text{State}, \text{Action}) \longrightarrow \{ \text{nextState}: \text{State}, \text{events}: \text{GameEvent}[] \}$$

### Ưu điểm vượt trội:
1. **Không Side-Effect:** State mới được tính toán hoàn toàn bất biến (immutable), không phụ thuộc socket hay I/O.
2. **Dễ Unit Test:** Hỗ trợ tham số `forcedDice: [number, number]` trong action `ROLL_DICE`, cho phép test tự động 100% kịch bản (kẹt cảng, phá sản, rút thẻ, chuộc đất).
3. **Event-Driven Animation (Hàng đợi sự kiện):** 
   - Server gửi về mảng `GameEvent[]` mô tả chính xác những gì vừa xảy ra theo trình tự thời gian.
   - Frontend duyệt qua mảng này tuần tự (`queue`): 
     `DICE_ROLLED` (lắc xúc xắc 1.5s) $\rightarrow$ `SHIP_STEPPED` (tàu lướt từng ô) $\rightarrow$ `TILE_PURCHASED` / `DEMURRAGE_PAID` (popup thông báo).
   - Nhờ đó, animation client chạy mượt mà 60fps mà không bao giờ bị lệch trạng thái hiển thị so với dữ liệu server.

---

## 4. Giao thức Socket.io (Client $\leftrightarrow$ Server Protocol)

### 4.1. Client to Server Events
- `room:create`: `{ playerName: string, token: VesselToken }` $\rightarrow$ Trả về `roomId`, `sessionToken`.
- `room:join`: `{ roomId: string, playerName: string, token: VesselToken, sessionToken?: string }`.
- `room:ready`: `{ roomId: string, isReady: boolean }`.
- `room:start`: `{ roomId: string }` (Chỉ Host mới có quyền gọi).
- `game:action`: `{ roomId: string, action: GameAction }`.
- `game:reaction`: `{ roomId: string, emoji: string }` (Còi tàu, container, cười, vỗ tay).

### 4.2. Server to Client Events
- `room:state`: Trả về danh sách người chơi trong phòng, trạng thái sẵn sàng, host ID.
- `game:init`: Trả về toàn bộ `GameState` ban đầu khi ván đấu bắt đầu.
- `game:update`: `{ state: GameState, events: GameEvent[] }` - Phát ngay sau mỗi lượt dispatch hợp lệ.
- `game:timer`: `{ remainingSeconds: number, playerId: string }` - Cập nhật đồng hồ đếm ngược.
- `game:reaction`: Broadcast biểu cảm từ người chơi khác lên màn hình.
- `error:message`: Trả về lỗi khi action không hợp lệ hoặc phòng đầy.

---

## 5. Cơ chế Reconnect (Khôi phục kết nối chống rớt mạng)
1. Khi gia nhập hoặc tạo phòng, Client nhận được một chuỗi ngẫu nhiên bí mật `sessionToken` và lưu vào `localStorage`.
2. Khi mất kết nối (ngắt wifi, tải lại trang):
   - Socket tự động kích hoạt `reconnect`.
   - Client gửi sự kiện `room:join` kèm `sessionToken`.
   - Server kiểm tra `sessionToken`: Nếu hợp lệ, gắn socket id mới vào người chơi tương ứng và gửi toàn bộ `GameState` hiện tại về Client để khôi phục trạng thái ngay lập tức.
3. Người chơi khác trong phòng nhận được thông báo trạng thái `isOnline: true / false`.

---

## 6. Chiến lược Đóng gói & Triển khai Docker
Sử dụng Multi-stage `Dockerfile`:
- **Stage 1 (Builder):** Cài đặt dependencies, biên dịch TypeScript (`packages/shared`, `packages/server`), và build static asset React (`packages/client/dist`).
- **Stage 2 (Runner):** Sử dụng Node.js 22 Alpine siêu nhẹ. Fastify server lắng nghe trên port duy nhất (mặc định `3000`), vừa xử lý WebSocket vừa serve thư mục static frontend `dist`.
- Container khởi động trong vòng dưới 2 giây và chỉ tiêu thụ ~80MB RAM.
