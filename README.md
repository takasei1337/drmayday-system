# DRMAYDAY - HỆ THỐNG QUẢN LÝ KHÁM BỆNH & THEO DÕI MỀ ĐAY

> Ứng dụng Quản lý Khám bệnh & Theo dõi Mề đay (Backend Node.js/Express + Frontend React/Vite).

---

## 💻 YÊU CẦU HỆ THỐNG (PREREQUISITES)

* **Node.js:** Phiên bản `>= 20.x`
* **Git:** Phiên bản `>= 2.x`
* **Trình quản lý gói:** `npm` (đi kèm Node.js)

---

## 🚀 HƯỚNG DẪN CÀI ĐẶT & KHỞI CHẠY (QUICK START)

### Bước 1: Chuẩn bị file cấu hình môi trường (.env)
1. Đặt file `.env` trực tiếp tại **thư mục gốc của dự án** (`./.env`).  
   *(Nếu chưa có, hãy copy từ file mẫu `.env.example` hoặc nhận file cấu hình từ quản trị viên).*
2. File `.env` này được sử dụng chung cho cả Backend và Frontend.

### Bước 2: Cài đặt thư viện dependencies

Mở terminal tại thư mục gốc `drmayday-system/`:

```bash
# 1. Cài đặt thư viện Backend
cd backend
npm install

# 2. Cài đặt thư viện Frontend
cd ../frontend
npm install
```

### Bước 3: Khởi chạy ứng dụng

#### Cách 1: Khởi chạy nhanh bằng file kịch bản (Dành cho Windows)
Click đúp chuột vào file:
👉 **`start-dev.bat`** (nằm ở thư mục gốc).  
Hệ thống sẽ tự động mở 2 cửa sổ chạy song song cả Backend và Frontend.

#### Cách 2: Khởi chạy thủ công qua dòng lệnh

* **Khởi chạy máy chủ Backend (Port 5000):**
  ```bash
  cd backend
  npm run dev
  ```
  API sẵn sàng tại: `http://localhost:5000/api/v1`  
  Kiểm tra trạng thái máy chủ: `http://localhost:5000/health`

* **Khởi chạy ứng dụng Frontend (Port 3000):**
  ```bash
  cd frontend
  npm run dev
  ```
  Giao diện Web sẵn sàng tại: `http://localhost:3000`

---

## 🧪 KIỂM TRA HỆ THỐNG & API

### 1. Kiểm tra kết nối Cơ sở dữ liệu
Chạy script kiểm tra kết nối song song cả 2 cơ sở dữ liệu (CSDL PostgreSQL chính & Supabase Sub-DB):
```bash
cd backend
node test_connections.js
```

### 2. Kiểm thử API bằng Bruno
1. Mở ứng dụng **Bruno** (hoặc Extension Bruno trong VSCode).
2. Chọn **Open Collection** $\rightarrow$ Trỏ tới thư mục `bruno/`.
3. Chọn môi trường **`Local`** ở góc trên bên phải.
4. Chạy request trong thư mục `00-Auth/01-Login-Admin` để tự động lưu JWT Token kiểm thử.
