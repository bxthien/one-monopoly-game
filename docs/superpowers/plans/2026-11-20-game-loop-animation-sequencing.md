# Kế Hoạch Triển Khai: Chuẩn Hóa Chuỗi Hoạt Họa & Hiệu Ứng Bàn Cờ

> **Quy tắc tuyệt đối:** Không thực hiện `git commit` hoặc `git push` nếu chưa có yêu cầu trực tiếp từ người dùng.

## Mục tiêu
Triển khai trọn vẹn 5 hạng mục cải tiến nhịp độ và thị giác:
1. Tuần tự hoạt họa: Xúc xắc -> Di chuyển -> Trừ/Cộng tiền & Popup.
2. Huy hiệu bay (+/- $M) cho tất cả các giao dịch tài chính (thị trường, thuế, khởi hành, thâu tóm, mua cảng).
3. Đọc xong thẻ bài Thị Trường/Vận Hành trước khi thực hiện chặng di chuyển kế tiếp.
4. Hiệu ứng thị giác và nhãn x2 cước khi sở hữu trọn bộ cảng cùng màu.
5. Banner / Popup nổi bật trên bàn cờ khi nhận $200M tại ô SGSIN.

---

### Bước 1: Mở rộng hệ thống biên nhận tiền `CashDeltaReceipt` trong `useBoardPlayback.ts`
- Cập nhật hàm `parseRentReceiptFromEvent` (hoặc mở rộng thành `parseCashReceiptFromEvent`) để nhận diện:
  - `DEMURRAGE_PAID` (đã có)
  - `SLOT_CHARTER_RENT_SPLIT` (đã có)
  - `PASSED_GO`: Tạo biên nhận tại ô 0 với `+$200M 💰`.
  - `TAX_PAID`: Tạo biên nhận tại `tileId` với `-$amountM 💸`.
  - `PROPERTY_TAKEOVER`: Tạo biên nhận tại `tileId` với `-$priceM 💸` (người mua) và `+$priceM 💰` (chủ cũ).
  - `TILE_PURCHASED`: Tạo biên nhận tại `tileId` với `-$priceM 🏗️`.
  - `BALANCE_CHANGED` (thẻ bài, bão, ESG): Tạo biên nhận tại vị trí người chơi với delta tương ứng.

### Bước 2: Chuẩn hóa nhịp lắc xúc xắc và timing di chuyển
- Trong `boardTravel.ts`: Điều chỉnh `DICE_ROLL_MS = 1200` để xúc xắc có đủ thời gian quay 3 vòng và đáp dừng dứt khoát.
- Trong `DiceView.tsx`: Tinh chỉnh transition khi dừng quay để mặt xúc xắc hướng thẳng rõ ràng, không bị trôi hay giật.
- Trong `useSocket.ts`: Đồng bộ `rollTimerRef` theo đúng thời lượng dừng xúc xắc.

### Bước 3: Cơ chế tạm dừng di chuyển để đọc thẻ bài (Card Reading Gate)
- Trong `useBoardPlayback.ts` / `boardTravel.ts`:
  - Khi có sự kiện `CARD_DRAWN` có effect di chuyển (`MOVE_STEPS`, `MOVE_TO`, `GO_TO_HOLD`):
  - Chia danh sách `frames` thành 2 giai đoạn:
    - Giai đoạn 1: Di chuyển tới ô Rút Thẻ.
    - Đợi tín hiệu người dùng đã đóng/xác nhận thẻ (`activeCard === null`).
    - Giai đoạn 2: Tiếp tục di chuyển tới ô đích tiếp theo.
- Trong `App.tsx` & `CardModal.tsx`:
  - Đảm bảo `CardModal` mở ngay khi tàu cập ô rút thẻ.
  - Sau khi người chơi đọc xong và bấm đóng, chặng di chuyển thứ 2 mới bắt đầu chạy.

### Bước 4: Hiệu ứng thị giác Trọn Bộ Cùng Màu (Monopoly x2 Cước)
- Trong `TileView.tsx`:
  - Kiểm tra điều kiện `isGroupComplete`: Người chơi sở hữu tất cả các cảng trong cùng `tile.group`.
  - Nếu `isGroupComplete = true`:
    - Thêm class hoặc style hào quang phát sáng nhẹ: `tile-monopoly-glow`.
    - Thêm huy hiệu `✨ x2 CƯỚC` (hoặc `✨ BỘ TUYẾN`) kế bên giá cước.
- Trong `PropertyModal.tsx`:
  - Hiển thị nhãn `[ĐANG KÍCH HOẠT ✨]` tại dòng `Trọn bộ tuyến, chưa xây: $${base * 2}M`.

### Bước 5: Banner Thông Báo $200M Tại Ô SGSIN (PassedGoBanner)
- Tạo component `PassedGoBanner.tsx` hiển thị thông báo đẹp mắt, sang trọng giữa bàn cờ khi có sự kiện `PASSED_GO`.
- Tự động ẩn sau 2.5s hoặc bấm để đóng.

### Bước 6: Đồng bộ số dư hiển thị trong `PlayerSidebar.tsx`
- Bổ sung tất cả các loại delta tiền (Pass GO, Thuế, Thẻ bài, Thâu tóm, Mua cảng) vào `pendingDeltas`.
- Giữ nguyên số dư cũ cho tới khi tàu dừng và huy hiệu bay xuất hiện mới cập nhật số dư mới.

### Bước 7: Kiểm Thử & Xác Minh
- Chạy unit tests: `npm run test:shared` và `npm test --workspace=@one-monopoly/client`.
- Chạy build: `npm run build`.
- Kiểm tra `git status` đảm bảo không có lệnh commit hay push tự ý.
