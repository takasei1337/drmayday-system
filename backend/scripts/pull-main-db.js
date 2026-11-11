/**
 * SCRIPT ĐỒNG BỘ & LẤY TOÀN BỘ DỮ LIỆU TỪ CSDL GỐC CỦA LỚP
 * Chạy lệnh: npm run db:pull
 * Dữ liệu sẽ được lưu vào: drmayday-system/database_snapshot/
 */

require('../src/config/env');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Chuẩn hóa serialize BigInt
BigInt.prototype.toJSON = function () {
  return this.toString();
};

const connectionString =
  process.env.MAIN_DATABASE_URL ||
  process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}?sslmode=disable`;

const pool = new Pool({
  connectionString,
  connectionTimeoutMillis: 10000,
});

const outputDir = path.resolve(__dirname, '../../database_snapshot');

async function pullMainDatabase() {
  console.log('================================================================');
  console.log('🔄 BẮT ĐẦU KÉO TOÀN BỘ DỮ LIỆU TỪ CSDL CHÍNH CỦA LỚP...');
  console.log(`🔗 Máy chủ: ${process.env.DB_HOST || '160.191.46.107'}:${process.env.DB_PORT || '6432'}/${process.env.DB_NAME || 'mayday'}`);
  console.log('================================================================\n');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const client = await pool.connect();
  try {
    // 1. Lấy danh sách tất cả các bảng trong schema public
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC;
    `);

    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`📊 Tìm thấy tổng cộng ${tables.length} bảng trong CSDL gốc.\n`);

    const summaryData = [];

    // 2. Kéo dữ liệu từng bảng và lưu ra file JSON
    for (const tableName of tables) {
      try {
        const queryRes = await client.query(`SELECT * FROM public."${tableName}"`);
        const rowCount = queryRes.rows.length;
        summaryData.push({ table: tableName, count: rowCount });

        const filePath = path.join(outputDir, `${tableName}.json`);
        fs.writeFileSync(filePath, JSON.stringify(queryRes.rows, null, 2), 'utf-8');
        console.log(`  ✓ [${tableName}] -> ${rowCount} bản ghi (đã lưu vào ${tableName}.json)`);
      } catch (tableErr) {
        console.warn(`  ⚠️ Lỗi khi đọc bảng ${tableName}: ${tableErr.message}`);
      }
    }

    // 3. Trích xuất các ID cốt lõi phục vụ Thành viên 3 & Thành viên 4 tra cứu
    let patients = [];
    let records = [];
    let sessions = [];
    let accounts = [];
    let drugs = [];

    try {
      const pRes = await client.query(`
        SELECT bn.ma_benh_nhan, bn.ma_his, bn.nghe_nghiep, bn.dan_toc, bn.bhyt_so_the
        FROM public.benhnhan bn 
        ORDER BY bn.ma_benh_nhan ASC LIMIT 20
      `);
      patients = pRes.rows;
    } catch (e) {
      console.warn('Lỗi lấy danh sách bệnh nhân:', e.message);
    }

    try {
      const rRes = await client.query(`
        SELECT ma_ho_so, ma_benh_nhan, loai_benh_an, trang_thai 
        FROM public.hosobenhan 
        ORDER BY ma_ho_so ASC LIMIT 20
      `);
      records = rRes.rows;
    } catch (e) {
      console.warn('Lỗi lấy danh sách hồ sơ:', e.message);
    }

    try {
      const sRes = await client.query(`
        SELECT ma_phien_kham, ma_ho_so, ma_bac_si, loai_benh_an, ngay_kham 
        FROM public.phienkham 
        ORDER BY ma_phien_kham ASC LIMIT 20
      `);
      sessions = sRes.rows;
    } catch (e) {
      console.warn('Lỗi lấy danh sách phiên khám:', e.message);
    }

    try {
      const aRes = await client.query(`
        SELECT tk.ma_tai_khoan, tk.ten_dang_nhap, vt.ten_vai_tro, ng.ho_ten
        FROM public.taikhoan tk
        LEFT JOIN public.vaitro vt ON tk.ma_vai_tro = vt.ma_vai_tro
        LEFT JOIN public.nguoi ng ON tk.ma_nguoi = ng.ma_nguoi
        ORDER BY tk.ma_tai_khoan ASC LIMIT 10
      `);
      accounts = aRes.rows;
    } catch {}

    try {
      const dRes = await client.query(`
        SELECT ma_thuoc, ten_biet_duoc, hoat_chat, ham_luong 
        FROM public.thuoc 
        ORDER BY ma_thuoc ASC LIMIT 10
      `);
      drugs = dRes.rows;
    } catch {}

    // 4. Tạo file ID_QUICK_LOOKUP.md để dev mở lên là copy ID được ngay
    const lookupContent = `# BẢNG TRA CỨU NHANH ID DỮ LIỆU ĐANG CÓ TRÊN DATABASE LỚP
*Thời điểm cập nhật: ${new Date().toLocaleString('vi-VN')}*

Tài liệu này được tự động sinh ra khi chạy lệnh: \`npm run db:pull\`.
Các thành viên mở file này để lấy ID thực tế đưa vào Bruno hoặc code test.

---

## 🔑 1. Dành cho Người 3 & Người 4 (Tránh bị phụ thuộc Người 2)

### Danh sách Hồ sơ Bệnh án (\`ma_ho_so\`) — [Người 4 cần dùng cho Ảnh tổn thương]:
${records.length > 0 ? records.map(r => `- **ma_ho_so: \`${r.ma_ho_so}\`** | ma_benh_nhan: \`${r.ma_benh_nhan}\` | Loại bệnh án: **\`${r.loai_benh_an}\`** | Trạng thái: \`${r.trang_thai || 'N/A'}\``).join('\n') : '*Hiện chưa có bản ghi nào.*'}

### Danh sách Phiên khám (\`ma_phien_kham\`) — [Người 3 cần dùng để Kê đơn thuốc]:
${sessions.length > 0 ? sessions.map(s => `- **ma_phien_kham: \`${s.ma_phien_kham}\`** | ma_ho_so: \`${s.ma_ho_so}\` | ma_bac_si: \`${s.ma_bac_si}\` | Loại: \`${s.loai_benh_an}\` | Ngày khám: \`${s.ngay_kham}\``).join('\n') : '*Hiện chưa có bản ghi nào.*'}

### Danh sách Bệnh nhân (\`ma_benh_nhan\`) — [Người 3 cần dùng cho Chu kỳ UAS7]:
${patients.length > 0 ? patients.map(p => `- **ma_benh_nhan: \`${p.ma_benh_nhan}\`** | Mã HIS: \`${p.ma_his || 'N/A'}\` | Dân tộc: \`${p.dan_toc || 'N/A'}\` | Số thẻ BHYT: \`${p.bhyt_so_the || 'N/A'}\``).join('\n') : '*Hiện chưa có bản ghi nào.*'}

---

## 👤 2. Danh sách Tài khoản sẵn có (\`ten_dang_nhap\`)
${accounts.length > 0 ? accounts.map(a => `- **ID: \`${a.ma_tai_khoan}\`** | User: \`${a.ten_dang_nhap}\` | Vai trò: \`${a.ten_vai_tro}\` | Tên: ${a.ho_ten || 'N/A'}`).join('\n') : '*Chưa có tài khoản nào.*'}

---

## 💊 3. Danh mục Thuốc (\`ma_thuoc\`) — [Người 3 dùng kê đơn]
${drugs.length > 0 ? drugs.map(d => `- **ma_thuoc: \`${d.ma_thuoc}\`** | Thuốc: **${d.ten_biet_duoc}** (${d.hoat_chat} ${d.ham_luong || ''})`).join('\n') : '*Chưa có dữ liệu thuốc.*'}

---

## 📊 4. Thống kê số lượng bản ghi của toàn bộ bảng
| Tên Bảng | Số lượng bản ghi hiện có |
| :--- | :--- |
${summaryData.map(s => `| \`${s.table}\` | **${s.count}** |`).join('\n')}
`;

    fs.writeFileSync(path.join(outputDir, 'ID_QUICK_LOOKUP.md'), lookupContent, 'utf-8');

    console.log('\n================================================================');
    console.log('✅ ĐÃ KÉO VÀ LƯU DỮ LIỆU THÀNH CÔNG!');
    console.log(`📁 Thư mục snapshot: drmayday-system/database_snapshot/`);
    console.log(`📖 Bảng tra cứu ID nhanh: drmayday-system/database_snapshot/ID_QUICK_LOOKUP.md`);
    console.log('================================================================');
  } catch (err) {
    console.error('\n❌ Lỗi trong quá trình kéo dữ liệu từ CSDL lớp:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

pullMainDatabase();
