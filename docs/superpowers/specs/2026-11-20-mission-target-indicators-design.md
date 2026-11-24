# Design Document: Visual Mission Target Indicators & Interactive Checklist

## 1. Intent & The Why
Người chơi cần nhận biết nhanh chóng và trực quan các vị trí ô cờ mục tiêu của Nhiệm vụ Chiến lược (Secret Mission) trên bàn cờ 32 ô, thay vì chỉ đọc văn bản mô tả. Đồng thời, người chơi có thể theo dõi tiến độ từng ô (đã sở hữu hay chưa) và tương tác định vị vị trí ô ngay lập tức.

## 2. Goals & Non-Goals
- **Goals:**
  - **Mini-Badge Mục Tiêu trên Bàn Cờ:** Hiển thị huy hiệu mục tiêu ở cạnh ô cờ (phía mép trong hướng về tâm bàn cờ/hải đồ để không che khuất mã cảng và giá cước):
    - Trạng thái chưa sở hữu: Biểu tượng `🎯` với ánh sáng nhẹ màu hồng ONE.
    - Trạng thái đã sở hữu: Biểu tượng `✓` với ánh sáng màu xanh ngọc (emerald).
  - **Checklist Tiến Độ Tương Tác trên Bảng Nhiệm Vụ:**
    - Liệt kê chi tiết từng mục tiêu thành danh sách checklist kèm thanh tiến độ (ví dụ: `2/3`).
    - Hiển thị rõ trạng thái từng mục: [x] Đã sở hữu / [ ] Chưa sở hữu (hoặc chủ sở hữu hiện tại nếu đã bị đối thủ mua).
    - **Click/Hover vào mục tiêu:** Bàn cờ sẽ phát hiệu ứng highlight/spotlight nhấp nháy vào đúng ô mục tiêu đó để người chơi định vị vị trí tức thì.
- **Non-Goals:**
  - Không thay đổi luật chơi hay cơ chế server/engine của 5 nhiệm vụ chiến lược.
  - Không tiết lộ nhiệm vụ bí mật của đối thủ (chỉ hiển thị mục tiêu của chính người chơi trên màn hình của họ).
- **Anti-Goals:**
  - Tránh gây rối mắt: Mini-badge được thiết kế tinh gọn, đặt gọn gàng ở mép cạnh ô cờ, không đè lên container, cờ sở hữu, hay quân cờ thuyền di chuyển.

## 3. Approaches Considered
1. **Chỉ hiển thị icon trên bàn cờ:** Dễ làm nhưng thiếu thông tin chi tiết tiến độ khi nhìn vào bảng điều khiển.
2. **Chỉ làm checklist trong bảng điều khiển:** Biết tiến độ nhưng khi nhìn vào bàn cờ tổng quan vẫn phải tự tìm ô.
3. **Kết hợp toàn diện (Được chọn):** Vừa có mini-badge bên cạnh ô mục tiêu trên bàn cờ, vừa có checklist tiến độ và tính năng click để highlight ô cờ.

## 4. Technical Specifications
- **Phân rã mục tiêu (Mission Targets Resolver):**
  - Hàm helper `getMissionTargetTiles(missionId, state, myPlayerId)` trả về danh sách các mục tiêu:
    - `{ tileId: number, label: string, isCompleted: boolean, ownerName?: string }`
    - Ánh xạ chính xác cho 5 Hợp đồng:
      - `MISSION-1`: Cái Mép (3), Los Angeles (23), Tuyến PS3 (28).
      - `MISSION-2`: Tokyo (31), Busan (17), và 1 Siêu tàu cấp 5 (cần nâng cấp cảng).
      - `MISSION-3`: ONE QUOTE (10), ONE Eco Calculator (22), và 1 Tàu Nhiên Liệu Xanh.
      - `MISSION-4`: 4 Tuyến Dịch Vụ: VSS (4), MD2 (13), FE2 (20), PS3 (28) (cần 3/4).
      - `MISSION-5`: Cát Lái (1), Cái Mép (3), Tuyến VSS (4).
- **Client State:**
  - State `highlightedTileId: number | null` được chia sẻ giữa `Board.tsx` và `SecretMissionCardView.tsx` qua `App.tsx` (hoặc callback focus).
- **TileView Enhancement:**
  - Nhận prop `missionTarget?: { isCompleted: boolean }`.
  - Hiển thị mini-badge ở mép cạnh ô cờ (hướng về phía trong bàn cờ).
  - Class `tile-spotlight` khi ô đang được hover/click từ bảng nhiệm vụ.
