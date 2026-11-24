# Thiết Kế Chi Tiết: Chuẩn Hóa Chuỗi Hoạt Họa Ván Chơi & Trải Nghiệm Bàn Cờ

## 1. Mục Đích & Bối Cảnh
Người chơi phản hồi 5 vấn đề cốt lõi liên quan đến nhịp độ hoạt họa (game loop animation sequencing), hiệu ứng tài chính và hiển thị trên bàn cờ:
1. **Tuần tự hoạt họa (Animation Sequencing):** Xúc xắc chưa quay xong thì tàu đã di chuyển, tiền đã bị cộng/trừ, popup đã bật lên. Mong muốn: Xúc xắc phải quay và dừng hoàn toàn -> Tàu mới lướt từng bước tới bến đích -> Cập bến xong mới trừ/cộng tiền và mở popup/hành động.
2. **Biểu tượng cộng/trừ tiền trên bàn cờ (+/- $M):** Hiện tại chỉ có tiền cước lưu bãi (demurrage) mới có huy hiệu bay. Các sự kiện tài chính khác (Thị trường, Biến động, Thuế, Thâu tóm, Mua cảng, Qua ô khởi hành) chưa có huy hiệu bay.
3. **Đọc thẻ Thị Trường / Vận Hành trước khi di chuyển:** Khi rút trúng thẻ yêu cầu di chuyển tiếp (VD: Tiến 3 bước hoặc đi tới cảng khác), tàu hiện tại lướt qua luôn cả 2 chặng mà người chơi chưa kịp đọc popup. Mong muốn: Tàu đến ô thẻ bài -> Dừng lại -> Mở popup thẻ bài để người chơi đọc -> Bấm đóng/tiếp tục -> Tàu mới di chuyển tiếp sang ô mới.
4. **Sở hữu trọn bộ cùng màu (Monopoly x2 Cước):** Cần kiểm tra lại cơ chế x2 cước khi gom đủ cảng cùng nhóm màu và làm hiệu ứng thị giác rõ ràng (viền sáng, huy hiệu `✨ x2 CƯỚC`) để người chơi biết đã hoàn tất bộ màu.
5. **Thông báo đi qua ô SGSIN ($200M):** Khi đi qua hoặc đáp trúng ô SGSIN (Tile 0), cần xuất hiện popup / banner nổi bật ngay trên bàn cờ cùng số tiền thưởng +$200M.

---

## 2. Thiết Kế Chi Tiết 5 Hạng Mục

### Hạng Mục 1: Chuẩn Hóa Chuỗi Hoạt Họa (Xúc Xắc -> Di Chuyển -> Tiền & Popup)
- **Giai đoạn 1 (Gieo xúc xắc):**
  - Thời lượng quay xúc xắc: 1.000ms quay tự do + 300ms đáp êm vào mặt kết quả (tổng `1.300ms`).
  - Trong suốt thời gian này: Tàu giữ nguyên vị trí, số dư người chơi trên Sidebar giữ nguyên số dư cũ, không mở bất kỳ popup nào.
- **Giai đoạn 2 (Tàu lướt trên hải đồ):**
  - Tàu lướt mượt qua từng ô với vận tốc ổn định (240ms/ô, 210ms khi đổi hướng góc).
  - Trạng thái `isPawnMoving = true` khóa toàn bộ panel hành động và popup cho đến khi tàu cập đúng bến.
- **Giai đoạn 3 (Cập bến, Cập nhật tài chính & Kích hoạt Modal):**
  - Khi tàu đã dừng lại tại ô đích (`isPawnMoving = false`):
    - Mới kích hoạt cập nhật số dư thực tế trên `PlayerSidebar`.
    - Bật huy hiệu bay cộng/trừ tiền trên ô cờ và avatar sidebar.
    - Kích hoạt modal tương ứng: Thẻ bài (CardModal), Mua cảng (ActionControls), hoặc Thâu tóm (Takeover panel).

### Hạng Mục 2: Mở Rộng Huy Hiệu Bay Cộng/Trừ Tiền Cho Mọi Sự Kiện Tài Chính
- Nâng cấp `parseRentReceiptFromEvent` thành hệ thống biên nhận tiền tổng quát (`CashDeltaReceipt`):
  - `PASSED_GO`: Tại ô 0, hiển thị `+$200M 💰`.
  - `TAX_PAID`: Tại ô thuế / ô hiện tại, hiển thị `-$amountM 💸`.
  - `PROPERTY_TAKEOVER`: Tại ô cảng, Người mua `-$priceM 💸`, Chủ cũ `+$priceM 💰`.
  - `TILE_PURCHASED`: Tại ô mua, Người mua `-$priceM 🏗️`.
  - `BALANCE_CHANGED` (từ thẻ bài thị trường/vận hành, bão, ESG): Hiển thị `+${delta}M 💰` hoặc `-${Math.abs(delta)}M 💸` tại ô người chơi đang đứng.
- Đồng bộ `pendingDeltas` trong `PlayerSidebar.tsx` để giữ đúng số dư trước sự kiện cho đến khi huy hiệu bay xuất hiện.

### Hạng Mục 3: Tạm Dừng Đọc Thẻ Bài Trước Khi Di Chuyển Tiếp
- **Hiện tượng:** Server gửi liền chuỗi sự kiện `[DICE_ROLLED, SHIP_STEPPED (tới ô thẻ), CARD_DRAWN, SHIP_STEPPED (tới ô mới)]`. Client ghép toàn bộ thành 1 track di chuyển liên tục.
- **Giải pháp:**
  - Khi phát hiện `CARD_DRAWN` có hiệu ứng di chuyển (`MOVE_STEPS`, `MOVE_TO`, `GO_TO_HOLD`):
    - Chia hoạt họa thành 2 chặng: Chặng 1 đưa tàu tới ô Thẻ bài -> Dừng lại (`isPawnMoving = false`).
    - Bật ngay `CardModal` hiển thị thông tin thẻ bài.
    - Thẻ bài có nút "XÁC NHẬN HÀNH TRÌNH" / "TIẾP TỤC".
    - Khi người chơi bấm đóng/tiếp tục modal -> Mới kích hoạt Chặng 2 để tàu di chuyển từ ô Thẻ bài tới ô đích cuối cùng.

### Hạng Mục 4: Kiểm Tra X2 Bộ Màu & Hiệu Ứng Sở Hữu Trọn Tuyến
- **Kiểm tra logic GameEngine:**
  - Logic `OneMonopolyEngine.calculateRent`:
    ```typescript
    const groupConfig = LOOP_GROUPS_CONFIG[tile.group!];
    const ownsAll = groupConfig.tileIds.every((id) => state.properties[id]?.ownerId === ownerId);
    if (ownsAll && prop.containerLevel === 0) return tile.rentTiers[0] * 2;
    ```
    Toàn bộ 8 nhóm màu trong `LOOP_GROUPS_CONFIG` đã khớp chính xác danh sách `tileIds`.
- **Bổ sung hiệu ứng thị giác trên `TileView.tsx`:**
  - Khi một người chơi sở hữu trọn bộ cảng cùng màu (`isGroupComplete`):
    1. Viền ô cờ có hiệu ứng hào quang phát sáng nhẹ theo màu của nhóm tuyến (Glow effect).
    2. Hiển thị huy hiệu sang trọng: `✨ x2 CƯỚC` hoặc `✨ BỘ TUYẾN x2` ngay trên nhãn giá thuê của ô.
    3. Giá hiển thị chuyển thành `$${currentRent}M` với màu nổi bật.
  - Trong `PropertyModal.tsx`:
    - Hàng `Trọn bộ tuyến, chưa xây: $${base * 2}M` được gắn nhãn `[ĐANG KÍCH HOẠT ✨]` khi người chơi đạt đủ điều kiện.

### Hạng Mục 5: Popup / Banner Nhận $200M Khi Qua Hoặc Đến SGSIN
- Tạo component banner nổi bật trên bàn cờ `PassedGoNotification`:
  - Khi sự kiện `PASSED_GO` kích hoạt (khi tàu lướt qua ô 0 hoặc đáp vào ô 0):
  - Hiển thị banner hàng hải trang trọng ở trung tâm bàn cờ:
    - Biểu tượng: 🚢 ⚓ 💰
    - Tiêu đề: **VƯỢT HẢI TRÌNH · QUA SINGAPORE HUB**
    - Nội dung: **Cấp thêm $200M vốn lưu động hành trình**
  - Đi kèm huy hiệu `+$200M 💰` bay lên từ ô 0.
  - Tự động ẩn êm sau 2.5 giây hoặc bấm để tắt.

---

## 3. Kế Hoạch Triển Khai
1. Cập nhật `boardTravel.ts` và `useBoardPlayback.ts`: Tách 2 chặng di chuyển khi có thẻ bài re-route, mở rộng toàn diện hệ thống `CashDeltaReceipt` (+/- $M).
2. Cập nhật `DiceView.tsx` & `useSocket.ts`: Đồng bộ thời lượng lắc xúc xắc (1.300ms) đảm bảo dừng tuyệt đối trước khi tàu nhấc bước.
3. Cập nhật `PlayerSidebar.tsx`: Chặn cập nhật số dư cho mọi sự kiện tài chính cho tới khi tàu dừng và badge bay lên.
4. Cập nhật `TileView.tsx`: Thêm hào quang viền phát sáng và huy hiệu `✨ x2 CƯỚC` cho nhóm cảng trọn bộ.
5. Tạo `PassedGoBanner` hiển thị thông báo $200M trên bàn cờ.
6. Chạy toàn bộ test suite (`shared` và `client`), đảm bảo pass 100% không hồi quy.
