# ONE Monopoly - Quy Chuẩn & Luật Chơi Chi Tiết (Game Specification)

## 1. Thiết lập Ván Chơi (Setup & Resources)
- **Số lượng người chơi:** 2 đến 4 người chơi (hỗ trợ mở rộng lên đến 6 người).
- **Vốn khởi điểm:** `$1,500M` (Một nghìn năm trăm triệu USD) cho mỗi người chơi.
- **Tiền qua ô xuất phát:** Đi qua hoặc dừng đúng ô số 0 (`SGSIN - Singapore Global Hub`) được nhận `$200M`.
- **Quân cờ đại diện (`VesselToken`):**
  1. `ONE_APUS`: Siêu tàu container biểu tượng sức chứa lớn.
  2. `ONE_MAGENTA`: Tàu container thương hiệu ONE màu hồng Magenta.
  3. `GANTRY_CRANE`: Cẩu giàn bốc dỡ container tại cảng nước sâu.
  4. `REEFER_TRUCK`: Xe đầu kéo container lạnh logistics.
  5. `PILOT_BOAT`: Tàu hoa tiêu dẫn đường hàng hải.
  6. `BUNKER_BARGE`: Xà lan tiếp nhiên liệu xanh LNG.

---

## 2. Bàn Cờ 40 Ô (`BOARD_TILES`)

Bàn cờ hình vuông kích thước 11x11 ô, đánh số từ `0` đến `39` theo chiều kim đồng hồ:

### 2.1. Phân loại 40 ô
- **1 ô Xuất phát (`GO` - Ô 0):** `Singapore Global Hub` (`SGSIN`). Nhận `$200M`.
- **22 ô Cảng biển quốc tế (`PORT`):** Phân bố trong 8 nhóm tuyến dịch vụ (`LoopGroup`).
- **4 ô Tuyến dịch vụ hàng hải (`SERVICE_LINE`):** Ô 5 (`LINE-IA`), Ô 15 (`LINE-AE`), Ô 25 (`LINE-TP`), Ô 35 (`LINE-LA`). Giá `$200M`, thế chấp `$100M`.
- **2 ô Cơ sở hạ tầng công nghệ (`INFRA`):**
  - Ô 12: `ONE eCommerce & EDI` (`EDI-SYS`)
  - Ô 28: `Trạm Nhiên Liệu Xanh (LNG)` (`BUNKER`)
  - Giá `$150M`, thế chấp `$75M`.
- **2 ô Thuế & Phụ phí (`TAX`):**
  - Ô 4: `Phụ phí nhiên liệu BAF` (`BAF`) - Nộp `$200M`.
  - Ô 38: `Bảo hiểm & Phí An ninh Cảng biển` (`INS-TAX`) - Nộp `$100M`.
- **3 ô Ô Đặc biệt:**
  - Ô 10: `Khu Neo Chờ Thông Quan` (`CUSTOMS_HOLD` - Vừa là ô thăm viếng vừa là nơi bị giữ tàu).
  - Ô 20: `Vùng Neo Đậu Miễn Phí` (`FREE_ANCHOR` - Nghỉ ngơi an toàn).
  - Ô 30: `Lệnh Giữ Tàu Kiểm Hóa` (`GO_TO_HOLD` - Bắt buộc vào thẳng ô 10).
- **6 ô Thẻ bài:**
  - Ô 2, 17, 33: Ô Thẻ Biến Động Thị Trường (`MARKET_CARD`).
  - Ô 7, 22, 36: Ô Thẻ Sự Cố & Vận Hành (`OPS_CARD`).

---

### 2.2. Bảng 8 Nhóm Tuyến Dịch Vụ Cảng Biển (`LoopGroup`)

| Nhóm tuyến | Màu sắc | Các cảng thành viên (Index - Mã - Tên) | Giá mua | Chi phí nâng cấp Container |
| :--- | :--- | :--- | :--- | :--- |
| **INTRA_ASIA** | Nâu đất | Ô 1: `VNSGN` (Sài Gòn), Ô 3: `VNVUT` (Vũng Tàu - Cái Mép) | $60M, $60M | $50M / Container |
| **MIDDLE_EAST** | Xanh biển nhạt | Ô 6: `THLCH` (Laem Chabang), Ô 8: `MYPKG` (Port Klang), Ô 9: `AEJEA` (Jebel Ali - Dubai) | $100M, $100M, $120M | $50M / Container |
| **MEDITERRANEAN** | Tím hồng | Ô 11: `GRPIR` (Piraeus), Ô 13: `ITGOA` (Genoa), Ô 14: `ESVLC` (Valencia) | $140M, $140M, $160M | $100M / Container |
| **NORTH_EUROPE** | Cam sáng | Ô 16: `BEANR` (Antwerp), Ô 18: `DEHAM` (Hamburg), Ô 19: `NLRTM` (Rotterdam) | $180M, $180M, $200M | $100M / Container |
| **TRANS_PACIFIC_WEST** | Đỏ son | Ô 21: `KRPUS` (Busan), Ô 23: `TWKHH` (Kaohsiung), Ô 24: `CNYTN` (Yantian - Thâm Quyến) | $220M, $220M, $240M | $150M / Container |
| **TRANS_PACIFIC_EAST** | Vàng nghệ | Ô 26: `USOAK` (Oakland), Ô 27: `USLGB` (Long Beach), Ô 29: `USLAX` (Los Angeles) | $260M, $260M, $280M | $150M / Container |
| **LATIN_AMERICA** | Xanh lá | Ô 31: `USSAV` (Savannah), Ô 32: `PAMIT` (Manzanillo Panama), Ô 34: `BRSSZ` (Santos Brazil) | $300M, $300M, $320M | $200M / Container |
| **GLOBAL_HUB** | Xanh hải quân | Ô 37: `HKHKG` (Hồng Kông), Ô 39: `JPTYO` (Tokyo Hub) | $350M, $400M | $200M / Container |

---

## 3. Công Thức Tính Tiền Thuê & Lưu Bãi (Demurrage)

1. **Cảng biển quốc tế (`PORT`):**
   - Chưa sở hữu trọn bộ: Phí thuê cơ bản (`rentTier[0]`).
   - Sở hữu trọn bộ tuyến (`Monopoly`), chưa xây container: **Nhân đôi phí cơ bản** ($2 \times \text{rentTier}[0]$).
   - Đã nâng cấp $1..4$ chồng Container hoặc cấp $5$ Mega Terminal: Áp dụng theo `rentTier[level]` (tăng lũy tiến rất mạnh ở cấp 4 và 5).
2. **Tuyến dịch vụ (`SERVICE_LINE`):**
   - Sở hữu $N$ tuyến ($N \in \{1, 2, 3, 4\}$):
     $$\text{Phí thuê} = 25 \times 2^{N-1} \quad \text{($25M, $50M, $100M, $200M)}$$
3. **Cơ sở hạ tầng (`INFRA`):**
   - Sở hữu 1 ô hạ tầng: Tiền thuê = $4 \times (\text{Tổng 2 xúc xắc vừa tung})$.
   - Sở hữu cả 2 ô hạ tầng: Tiền thuê = $10 \times (\text{Tổng 2 xúc xắc vừa tung})$.
4. **Ô bị thế chấp (`isMortgaged = true`):** Không thu phí thuê của đối thủ.

---

## 4. Luật Xây Dựng & Thế Chấp

- **Mở khóa nâng cấp:** Người chơi phải sở hữu toàn bộ các cảng trong cùng 1 `LoopGroup` và không có cảng nào trong nhóm đang bị thế chấp.
- **Quy tắc xây đều (Even Building Rule):**
  - Không được xây cấp $k+1$ ở một cảng nếu trong cùng nhóm còn có cảng ở cấp $k-1$. Mức chênh lệch container giữa các cảng trong cùng nhóm không được vượt quá 1.
  - Cấp 5 là **Mega Terminal** (thay thế 4 container bằng 1 siêu bến bãi container).
- **Hạ cấp / Bán container:** Khi cần tiền trả nợ, người chơi có thể bán container với giá bằng **50% chi phí xây dựng** (`buildCost * 0.5`), cũng phải tuân thủ quy tắc hạ đều.
- **Thế chấp tài sản (`MORTGAGE`):**
  - Chỉ được thế chấp khi cảng đó đã bán hết toàn bộ container trong nhóm.
  - Nhận ngay: `mortgageValue = 50% purchasePrice`.
- **Chuộc tài sản (`UNMORTGAGE`):**
  - Trả phí: $\lceil \text{mortgageValue} \times 1.1 \rceil$ (gốc + 10% lãi suất ngân hàng).

---

## 5. Luật Kẹt Cảng & Kiểm Hóa (`CUSTOMS_HOLD`)

Người chơi bị đưa vào `CUSTOMS_HOLD` (ô 10) khi:
1. Đi vào ô số 30 (`GO_TO_HOLD`).
2. Rút phải thẻ Sự cố / Thị trường yêu cầu bắt giữ tàu.
3. Tung xúc xắc được **số đôi 3 lần liên tiếp** trong cùng một lượt.

Khi đang ở `CUSTOMS_HOLD`, người chơi có 3 cách để thoát:
1. **Tung xúc xắc được đôi** ở đầu lượt $\rightarrow$ Thoát ngay và đi tiếp số ô bằng tổng xúc xắc.
2. **Dùng Thẻ Miễn Phí Thông Quan** (`customsClearancePasses`).
3. **Nộp tiền phạt $50M** trước khi tung xúc xắc.
- **Giới hạn 3 lượt:** Nếu sau 3 lượt vẫn không tung được đôi, người chơi bắt buộc phải nộp $50M$ phí lưu kho bãi và tiến hành di chuyển theo xúc xắc của lượt thứ 3.

---

## 6. Xử Lý Nợ & Phá Sản (`AWAITING_DEBT_RESOLUTION`)

- Khi phát sinh khoản nợ (tiền thuê cảng cho đối thủ, tiền thuế BAF, tiền phạt kẹt cảng) lớn hơn số dư tiền mặt hiện có:
  - Game engine chuyển sang trạng thái chờ giải quyết nợ `TurnPhase.AWAITING_DEBT_RESOLUTION`.
  - Khóa các chức năng di chuyển / kết thúc lượt.
  - Người chơi chỉ có thể:
    1. Bán container/mega terminal để thu hồi tiền mặt.
    2. Thế chấp các bất động sản không có container.
    3. Sau khi số dư tiền mặt $\ge$ số tiền nợ, bấm **Thanh toán nợ (`SETTLE_DEBT`)** để tiếp tục ván đấu.
    4. Bấm **Tuyên bố phá sản (`DECLARE_BANKRUPTCY`)**:
       - Nếu nợ người chơi khác: Toàn bộ tiền mặt còn lại và các tài sản bất động sản (đã đưa container về 0) được chuyển giao cho chủ nợ. Các tài sản đang thế chấp vẫn giữ trạng thái thế chấp.
       - Nếu nợ ngân hàng/thuế: Giải phóng toàn bộ tài sản về trạng thái tự do (chưa có chủ) để người khác mua.
- Khi chỉ còn 1 người chơi duy nhất chưa phá sản $\rightarrow$ Kích hoạt `GAME_OVER` và vinh danh người chiến thắng.
