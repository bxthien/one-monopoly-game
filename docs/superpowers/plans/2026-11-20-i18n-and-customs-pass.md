# Kế Hoạch Triển Khai: Tiếng Anh Mặc Định & Tiếng Việt + Hiển Thị Thẻ Thông Quan

> **Quy tắc tuyệt đối:** Không thực hiện `git commit` hoặc `git push` nếu chưa có yêu cầu trực tiếp từ người dùng.

## Các Bước Triển Khai

### Giai Đoạn 1: Hiển Thị Thẻ Thông Quan Hải Quan (Customs Clearance Pass)
- [ ] Bổ sung huy hiệu thẻ thông quan tại `packages/client/src/components/PlayerSidebar.tsx`:
  - Khi `player.customsClearancePasses > 0`, hiển thị tag `🎫 x{count}` nổi bật cạnh tên/số dư với tooltip giải thích.
- [ ] Bổ sung mục hiển thị thẻ thông quan tại `packages/client/src/components/SecretMissionCardView.tsx`:
  - Hiển thị danh mục tài sản chiến lược đặc biệt (Special Assets) gồm số thẻ thông quan và trạng thái Green Fleet.

### Giai Đoạn 2: Xây Dựng Hệ Thống Song Ngữ i18n
- [ ] Cập nhật types trong `packages/shared/src/types.ts`:
  - `BoardTile`: Thêm `nameVi?: string`
  - `GameCard`: Thêm `titleVi?: string`, `descriptionVi?: string`
  - `SecretMission`: Thêm `titleVi?: string`, `descriptionVi?: string`, `hintVi?: string`
- [ ] Cập nhật dữ liệu trong `packages/shared/src/boardData.ts`:
  - Chuyển `name`, `title`, `description` sang Tiếng Anh chuẩn (English default).
  - Thêm bản dịch Tiếng Việt tương ứng cho tất cả 32 ô cờ, 20 thẻ bài, 4 nhiệm vụ chiến lược.
- [ ] Tạo module `packages/client/src/i18n/`:
  - `translations.ts`: Toàn bộ từ điển giao diện song ngữ (Lobby, ActionControls, PropertyModal, CardModal, Storm, GameOver, Navigation, Notifications).
  - `I18nContext.tsx`: Context Provider, Hook `useI18n()` với ngôn ngữ mặc định là `'en'`.
  - Component `LanguageToggle.tsx` trên thanh Masthead.

### Giai Đoạn 3: Áp Dụng Song Ngữ Lên Toàn Bộ Giao Diện Client
- [ ] `packages/client/src/App.tsx`: Bọc app với `I18nProvider`, thêm `LanguageToggle` trên masthead, song ngữ hóa event logs và header.
- [ ] `packages/client/src/components/Lobby.tsx`: Song ngữ hóa toàn bộ giao diện phòng chờ.
- [ ] `packages/client/src/components/ActionControls.tsx`: Song ngữ hóa tất cả các nút bấm và trạng thái hành động.
- [ ] `packages/client/src/components/PropertyModal.tsx`: Song ngữ hóa chi tiết cảng biển, biểu cước, nút mua/xây/bán/thế chấp.
- [ ] `packages/client/src/components/CardModal.tsx`: Song ngữ hóa popup thẻ bài (hiển thị tiếng Anh hoặc tiếng Việt theo ngôn ngữ đang chọn).
- [ ] `packages/client/src/components/StormDecision.tsx`: Song ngữ hóa quyết định bão.
- [ ] `packages/client/src/components/TileView.tsx`: Tên và nhãn ô cờ song ngữ.
- [ ] `packages/client/src/components/PlayerSidebar.tsx`: Song ngữ hóa bảng điểm đội tàu.
- [ ] `packages/client/src/components/SecretMissionCardView.tsx`: Song ngữ hóa nhiệm vụ bí mật.
- [ ] `packages/client/src/components/GameOverModal.tsx`: Song ngữ hóa màn hình kết thúc ván đấu.

### Giai Đoạn 4: Kiểm Thử & Xác Minh
- [ ] Chạy unit tests: `npm run test:shared` và `npm test --workspace=@one-monopoly/client`.
- [ ] Chạy `npm run build` toàn diện.
- [ ] Kiểm tra `git status`.
