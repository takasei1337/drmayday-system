# HƯỚNG DẪN KIỂM THỬ API BACKEND BỆNH NHÂN BẰNG BRUNO (CHUẨN GOOGLESHEET)

Tài liệu này hướng dẫn cách mở và kiểm thử toàn bộ API phân hệ **Bệnh nhân** trong **Bruno** bằng thư mục collection `.bru` chuẩn (`bruno/`) hoặc file JSON (`DrMayDay_Patient_Backend_Bruno.json`). Toàn bộ API và test script tự động (`tests { ... }`) đã được đồng bộ **100% đúng từng field (không thừa, không thiếu)** theo đặc tả `GoogleSheets_APIs.xlsx` trên hệ thống **Dual-DB mới** (`drmayday-system`).

---

## 1. Kiến trúc Dual-DB & Chuẩn bị Môi trường

Hệ thống backend (`drmayday-system/backend`) vận hành song song **2 CSDL + 1 Storage**:
1. **Main DB (PostgreSQL `160.191.46.107:6432/mayday` — `DATABASE_URL`)**: Lưu dữ liệu lõi bệnh viện (`vaitro`, `nguoi`, `taikhoan`, `benhnhan`, `hosobenhan`, `benhanmaydaycap`, `benhanmaydayman`, `phienkham`, `ketquacanlamsang`, `donthuoc`, `chitietdonthuoc`, `chukytheodoiuas7`, `nhatkyuashangngay`, `dottonthuongda`, `vitritonthuong`, `tepdinhkem`, `anhchuptonthuong`).
2. **Sub DB (Supabase PostgreSQL via Prisma — `SUB_DATABASE_URL`)**: Lưu dữ liệu mở rộng & schema động (`templates`, `template_sections`, `template_questions`, `patient_extra_profiles`, `password_reset_tokens`, `token_blacklist`, `medical_record_meta`, `medical_record_answers`, `answer_images`, `uas7_notes`, `lesion_episode_meta`, `lesion_location_meta`, `lesion_photo_meta`, `anh_ton_thuong_mo_rong`, `lab_requests`, `lab_request_items`).
3. **Supabase Storage (bucket `mayday-attachments`)**: Lưu tệp ảnh upload thực tế qua `multer` (`POST /api/v1/image-attachments/upload` & `POST /api/v1/image-attachments/upload-multiple`).

### Các bước chạy Backend Local
1. **Kiểm tra file `.env`** tại `drmayday-system/.env` (mặc định `PORT=5000`).
2. **Cài đặt thư viện & sinh Prisma Client:**
   ```powershell
   cd drmayday-system/backend
   npm install
   npx prisma generate
   ```
3. **Kiểm tra kết nối Dual-DB:**
   ```powershell
   node test_connections.js
   ```
4. **Khởi chạy server Backend:**
   ```powershell
   npm run dev
   ```
   Server mặc định lắng nghe tại `http://localhost:5000` (prefix API: `http://localhost:5000/api/v1`).

---

## 2. Cách Mở Collection Trong Bruno

### Cách 1 (Khuyên dùng — Native `.bru`): Mở trực tiếp thư mục `bruno/`
1. Mở ứng dụng **Bruno** ➔ **`Open Collection`** ➔ chọn thư mục `patient-api-bruno/bruno`.
2. Nếu chưa có file `environments/Local.bru` (được `.gitignore` bảo vệ), hãy copy từ `environments/Local.bru.example` sang `environments/Local.bru` rồi chọn Environment **`Local`** ở góc trên bên phải của Bruno.

Thư mục `bruno/` gồm **13 thư mục riêng lẻ (56 request `.bru`)**, mỗi request đều có tab **Tests** (`tests { ... }`) kiểm tra `expect(Object.keys(...).sort()).to.eql([...])` đúng từng key theo GoogleSheet:
* `00-Health` (1): `GET /health`
* `01-Auth` (7): `POST /auth/signup`, `POST /auth/login` (Patient/Doctor/Admin), `POST /auth/forgot-password`, `PUT /auth/change-password`, `POST /auth/logout`
* `02-Profile` (2): `GET /profile`, `PUT /profile` (đủ 17 trường chuẩn sheet)
* `06-Templates` (2): `GET /templates/all`, `GET /templates/:id` (cây 4 tầng `code_template`, `name`, `sections` -> `questions` -> `options`)
* `07-Medical-Records` (14): `classify-questions`, `classify`, `POST /medical_records`, `GET /medical_records/all`, `GET /patients/:id/history`, `GET /medical_records/:id`, `summary`, `PUT /answers`, `POST /answer`, `GET /answers`, `accept`, `PUT /medical_records/:id`, `PATCH /status`, `DELETE /medical_records/:id`
* `08-Lab-Results` (2): `POST /lab-requests`, `GET /lab-results/:record_id`
* `09-Prescriptions` (1): `POST /prescriptions`
* `10-UAS7-Scores` (4): `eligibility`, `POST /uas7-scores`, `GET /uas7-scores/patient/:patient_id`, `GET /uas7-scores/week/:patientId`
* `13-Lesion-Episodes` (6): `POST /lesion-episodes`, `my`, `record/:medical_record_id`, `GET /:id`, `PATCH /:id`, `DELETE /:id`
* `14-Lesion-Locations` (4): `POST /lesion-locations`, `episode/:episode_id`, `PATCH /:id`, `DELETE /:id`
* `15-Image-Attachments` (5): `upload`, `upload-multiple`, `user/:user_id`, `view/:id` (luồng binary `image/*`), `DELETE /:id`
* `16-Lesion-Photos` (4): `POST /lesion-photos`, `location/:location_id`, `PATCH /:id/milestone`, `DELETE /:id`
* `17-Answer-Images` (4): `POST /answer-images`, `POST /answer-images/bulk`, `GET /answer-images/:answer_id`, `DELETE /:id`

### Cách 2: Import 1 file JSON duy nhất (`DrMayDay_Patient_Backend_Bruno.json`)
1. Mở **Bruno** ➔ **`Import Collection`** ➔ **`Postman Collection`**.
2. Chọn file `patient-api-bruno/DrMayDay_Patient_Backend_Bruno.json` và lưu collection.

---

## 3. Biến Môi trường & Thứ tự Chạy Test Khuyến nghị

Các biến dùng chung trong `Local`: `baseUrl` (`http://localhost:5000/api/v1`), `rootUrl` (`http://localhost:5000`), `patientToken`, `doctorToken`, `adminToken`, `patientId`, `recordId`, `answerId`, `episodeId`, `locationId`, `attachmentId`, `photoId`, `answerImageId`, `templateId` (`TMPL_URTICARIA_CHRONIC_INIT`).

### Lưu ý thứ tự khi chạy tay từng request:
1. **Khởi động & Auth (`00-Health` ➔ `01-Auth`)**:
   * Chạy `01-Signup-Patient` (tự sinh SĐT ngẫu nhiên & lưu `patientId`), `02-Login-Patient` (tự lưu `patientToken`), `03-Login-Doctor` (`doctorToken`), `04-Login-Admin` (`adminToken`).
   * *Chạy `07-Logout` cuối cùng sau khi test xong mọi module* vì token sau logout sẽ bị chặn (`401`, mã `9998`).
2. **Profile & Templates (`02-Profile` ➔ `06-Templates`)**: Chạy lần lượt các request `GET`/`PUT`.
3. **Bệnh án, Cận lâm sàng & Đơn thuốc (`07` ➔ `09`)**:
   * Chạy `07/01` ➔ `07/11` (`accept`) để tự gán `recordId` và `answerId`.
   * *Chạy `08-Lab-Results` và `09-Prescriptions` trước khi chạy `07/12` (`completed`), `07/13` (`cancelled`) và `07/14` (`DELETE /medical_records/{{recordId}}`)*.
4. **UAS7 & Tổn thương da + Ảnh (`10` ➔ `17`)**:
   * Khi test mục `10`, `13`, `14`, `15`, `16`, `17`: đảm bảo `recordId` đang tồn tại và chưa bị xóa ở `07/14`.
   * Ở `15-Image-Attachments`: cần chọn file ảnh (`.png`/`.jpg`) ở dòng `file` (`01-Upload-Image-Attachment`) hoặc `images` (`02-Upload-Multiple-Images`).
   * **Giữ `attachmentId` trước khi chạy `16-Lesion-Photos` và `17-Answer-Images`**, tức là chỉ chạy `13/06 Delete Episode`, `14/04 Delete Location`, `15/05 Delete Attachment` ở bước dọn dẹp cuối cùng.

---

## 4. Quy ước Response & Mã lỗi Chuẩn GoogleSheet

* **Response thành công chuẩn:**
  * Mặc định: `{ "code": 1000, "message": "...", "data": ... }` (khớp chính xác từng trường ở `data` theo từng sheet).
  * Riêng `POST /medical_records/:id/answer`: `{ "code": 1000, "message": "...", "count": <number> }`.
  * Riêng `POST /image-attachments/upload-multiple` & `POST /answer-images/bulk`: `{ "code": 1000, "message": "...", "total": <number>, "data": [...] }`.
  * Riêng `GET /image-attachments/view/:id`: trả trực tiếp luồng binary ảnh (`Content-Type: image/*`).
* **Bảng mã phản hồi đã gộp chuẩn GoogleSheet (`3. response code`):**
  * `1000`: `OK` — Xử lý thành công
  * `9992`: `Post is not existed` — Đối tượng không tồn tại *(gộp từ `3007, 4001, 4008, 4101, 4103, 4104, 6005, 7001, 7002, 7003, 8103, 9102`)*
  * `9993`: `Code verify is incorrect` — Mã xác thực không đúng *(gộp từ `3004, 3005`)*
  * `9994`: `No Data or end of list data` — Không có dữ liệu / Hết dữ liệu *(gộp từ `4002, 5001`)*
  * `9995`: `User is not validated` — Người dùng chưa xác thực *(gộp từ `3008, 3009`)*
  * `9996`: `User existed` — Người dùng / Dữ liệu đã tồn tại *(gộp từ `3006, 4102`)*
  * `9997`: `Method is invalid` — Phương thức không đúng
  * `9998`: `Token is invalid` — Sai token / hết hạn / đã logout *(gộp từ `3001, 3002, 3003`)*
  * `9999`: `Exception error.` — Lỗi exception *(gộp từ `9001, 9002, 9901, 9903`)*
  * `1001`: `Can not connect to DB` — Lỗi mất kết nối DB / thực thi SQL *(gộp từ `9902`)*
  * `1002`: `Parameter is not enough` — Thiếu tham số *(gộp từ `2001, 4006, 4007, 5005, 6001, 7004, 7005, 8001, 8002, 8101, 8102, 9101`)*
  * `1003`: `Parameter type is invalid.` — Kiểu tham số không đúng *(gộp từ `2002, 2007, 6002`)*
  * `1004`: `Parameter value is invalid.` — Giá trị tham số không hợp lệ *(gộp từ `2003, 2004, 2005, 2006, 4004, 4009, 5003, 5004, 7006, 7007, 9003`)*
  * `1005`: `Unknown error`
  * `1006`: `File size is too big.` — Cỡ file vượt mức cho phép *(gộp từ `6003`)*
  * `1007`: `Upload File Failed!.` — Upload thất bại *(gộp từ `6007`)*
  * `1008`: `Maximum number of images.` — Số lượng ảnh vượt quá quy định *(gộp từ `6004`)*
  * `1009`: `Not access.` — Không có quyền truy cập tài nguyên *(gộp từ `3101, 3102, 3103, 3104, 3105, 3106`)*
  * `1010`: `Action has been done previously` — Hành động đã thực hiện trước đó *(gộp từ `4003, 4005, 4105, 5002, 6006, 8003`)*
