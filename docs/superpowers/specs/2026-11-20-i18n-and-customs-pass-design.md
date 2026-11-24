# Thiết Kế: Bản Địa Hóa Tiếng Anh (Mặc Định) & Tiếng Việt + Hiển Thị Thẻ Thông Quan

## 1. Yêu Cầu & Mục Đích (Requirements & Goals)
1. **Hiển thị Thẻ Thông Quan Hải Quan (`customsClearancePasses`):**
   - Người chơi khi rút trúng thẻ AEO (MKT-10) hoặc Green Lane (OPS-04) được cấp thẻ thông quan, nhưng trên giao diện hiện tại không có chỗ nào hiển thị để người chơi biết mình đang giữ thẻ.
   - Giải pháp: Hiển thị huy hiệu thẻ thông quan (Customs Clearance Pass 🎫) rõ ràng tại:
     - `PlayerSidebar.tsx`: Danh sách người chơi hiển thị huy hiệu `🎫 x1` / `🎫 Pass: 1` bên cạnh số dư.
     - `SecretMissionCardView.tsx`: Thêm mục "Tài Sản Vận Tải / Special Assets" hiển thị số thẻ thông quan và cờ Tàu Xanh của người chơi.
2. **Chuyển đổi toàn bộ dự án sang Tiếng Anh làm mặc định (English Default) + Hỗ trợ Tiếng Việt (Switchable):**
   - Thiết lập Tiếng Anh (EN) làm ngôn ngữ mặc định trên toàn hệ thống.
   - Bổ sung nút chuyển đổi ngôn ngữ (Language Toggle 🇺🇸 EN / 🇻🇳 VI) trên thanh masthead ở góc trên cùng bên phải.
   - Lưu trữ lựa chọn ngôn ngữ trong `localStorage ('one_monopoly_language')`.
   - Chuẩn hóa song ngữ cho:
     - Toàn bộ giao diện Lobby, Hải đồ, Sidebar, ActionControls, PropertyModal, CardModal, StormDecision, GameOverModal, SecretMissionCardView.
     - Bàn cờ 32 ô: Tên ô cảng (e.g., Cat Lai Port / Cát Lái, Customs Hold / Khu Kiểm Hóa, Free Anchorage / Vùng Neo Đậu).
     - 20 Thẻ bài Thị Trường & Vận Hành (Market Cards & Operations Cards).
     - 4 Nhiệm vụ bí mật (Secret Missions).
     - Nhật ký sự kiện (Event Logs).

---

## 2. Kiến Trúc i18n Đề Xuất

### Client: `I18nContext` & Hook `useI18n()`
Tạo module `packages/client/src/i18n/`:
- `translations.ts`: Định nghĩa từ điển song ngữ dạng key-value type-safe (`en` và `vi`).
- `I18nContext.tsx`: Cung cấp React Context quản lý `lang: 'en' | 'vi'`, hàm `setLang()`, và hàm `t(key, params)`.
- Nút chuyển ngôn ngữ `LanguageToggle`: Đặt trên Masthead (header) cạnh trạng thái kết nối phòng.

### Dữ Liệu Bàn Cờ & Thẻ Bài (`packages/shared/src/boardData.ts`):
- `BoardTile`: Thuộc tính `name` chuyển sang Tiếng Anh mặc định (e.g. "Cat Lai Port (Saigon)", "Singapore Global Hub", "Customs Inspection Hold", "Free Anchorage", "Go to Customs Hold", "Market Fluctuations", "Operations & Incidents").
  - Thêm thuộc tính `nameVi?: string` (e.g. "Cảng Cát Lái (Sài Gòn)", "Khu Neo Chờ Thông Quan", "Biến Động Thị Trường"...).
- `GameCard`: `title` & `description` chuyển sang Tiếng Anh mặc định; thêm `titleVi` & `descriptionVi`.
- `SecretMission`: `title`, `description`, `hint` chuyển sang Tiếng Anh mặc định; thêm `titleVi`, `descriptionVi`, `hintVi`.

---

## 3. Các Tệp Sẽ Chỉnh Sửa
- `packages/shared/src/types.ts`: Cập nhật kiểu `BoardTile`, `GameCard`, `SecretMission` để hỗ trợ trường song ngữ.
- `packages/shared/src/boardData.ts`: Cập nhật dữ liệu 32 ô cờ, 20 thẻ bài, 4 nhiệm vụ chiến lược sang Tiếng Anh mặc định và bổ sung phiên bản Tiếng Việt.
- `packages/client/src/i18n/`: Tạo từ điển và context song ngữ `en` / `vi`.
- `packages/client/src/components/PlayerSidebar.tsx`: Thêm huy hiệu thẻ thông quan `🎫` và áp dụng bản dịch.
- `packages/client/src/components/SecretMissionCardView.tsx`: Thêm mục hiển thị Thẻ Thông Quan sở hữu và áp dụng bản dịch.
- `packages/client/src/App.tsx`: Thêm Language Toggle trên masthead và bọc ứng dụng trong `I18nProvider`.
- `packages/client/src/components/`: Chuyển đổi tất cả các components sang sử dụng hàm `t()`.
