# Remixtusub.03 of Dynamo QT

Tạo hệ thống web app DYNAMO QT — Quản lý Nhà thầu phụ, Nhiệt luyện và Luân chuyển QT cho phân xưởng PIN, INSERT, MOLD, tối ưu trong một lần xây dựng hoàn chỉnh nền tảng:

1. Bảng màu & Design System đồng bộ hệ thống DYNAMO MES (Die-Steel & Eco-Foundry):
- Nền dark mode công nghiệp:
  * Background: #0f172a (thép nòng súng)
  * Card / Surface: #1e293b (nhôm bắn cát)
  * Border & Input: #334155
  * Text chính: #f1f5f9 (bạc mạ crôm)
  * Text phụ trợ: #94a3b8
- Màu trạng thái & nhận diện:
  * Primary: #059669 / #10b981 (xanh emerald)
  * Đỏ Dynamo: #dc2626 (trễ hạn / cảnh báo)
  * Vàng hổ phách: #f59e0b (chờ bàn giao / chờ tiếp nhận)
  * Xanh lam gia công: #0ea5e9 / #38bdf8 (đang nhiệt luyện / xi mạ)
  * Xanh lục bảo: #10b981 (đã hoàn thành nhập kho)

2. App Shell & Layout:
- Sidebar cố định có thể thu gọn với logo DYNAMO QT, các mục menu điều hướng trực quan.
- Header tích hợp: Bộ lọc nhanh phân xưởng (Tất cả / PIN / INSERT / MOLD), ô tìm kiếm nhanh mã đơn / mã hàng, trạng thái kết nối và đồng hồ thời gian thực.

3. Hệ thống Định tuyến (Routing) & Các màn hình cốt lõi:
- `/dashboard`: Trung tâm chỉ huy luân chuyển QT với các thẻ KPI (Khối lượng Kg và Pcs tại YAMAICHI & PROVISION, tỷ lệ trả hàng đúng hạn, cảnh báo quá hạn >3 ngày, chi phí tạm tính tháng) và biểu đồ phân bổ sản lượng.
- `/orders`: Giao diện Split-view (Master-Detail): Cột trái danh sách mã đơn (So_DatHang), cột phải chi tiết bảng linh kiện (mã hàng, mác thép DAC/SKD61, độ cứng HRC, kích thước, khối lượng, đơn giá, thành tiền và link PDF).
- `/tracking`: Bảng Kanban 4 cột theo dõi luân chuyển (Chờ xuất xưởng -> Đang tại Vendor -> Kiểm tra QC -> Đã nhập kho). Thẻ trễ hạn có viền đỏ nhấp nháy.
- `/audit-costs`: Bảng đối soát đơn giá theo Vendor x Mác thép x Đơn vị tính (Kg/pcs) và phát hiện đơn giá lệch chuẩn.
- `/materials`: Danh mục tra cứu tiêu chuẩn mác thép gia công khuôn (DAC, SKD61, DAC-MAGIC...) và dải độ cứng HRC.
- `/sync`: Màn hình hỗ trợ nạp CSV và mô phỏng đồng bộ dữ liệu.

4. Dữ liệu mẫu (Mock data) tích hợp sẵn:
Bộ dữ liệu chuẩn hóa phản ánh đầy đủ cấu trúc thực tế (ID_Key, phong_sx, doi_tuong_hang, ma_hang, so_luong, vat_lieu, do_cung, Kich_Thuoc_SP, kg_Lot, don_vi_tinh, don_gia, thanh_tien, ngay_gui_QT, cty_QT, TrangThai, So_DatHang) để ứng dụng vận hành mượt mà ngay lập tức.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/8a0c7370-4883-4c4d-aa84-04a148ab878e).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
