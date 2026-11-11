const db = require('../../config/db');
const prisma = require('../../config/prisma');
const { supabase, bucketName } = require('../../config/supabase');

/**
 * MODULE TỔN THƯƠNG DA & KHO ẢNH (Slide 8, 9, 10, 11)
 * Kết hợp CSDL chính (đọc metadata) và Sub Database Supabase qua Prisma (lưu trữ mở rộng, tọa độ, bucket)
 */
class LesionService {
  // Lấy danh mục vị trí tổn thương từ CSDL chính
  async getViTriTonThuongList() {
    const query = 'SELECT * FROM public.vitritonthuong ORDER BY ma_vi_tri ASC';
    const result = await db.query(query);
    return result.rows;
  }

  // Lấy các đợt bùng phát tổn thương da từ CSDL chính
  async getDotTonThuongByHoSo(ma_ho_so) {
    const query = `
      SELECT * FROM public.dottonthuongda
      WHERE ma_ho_so = $1
      ORDER BY ngay_bat_dau_dot DESC
    `;
    const result = await db.query(query, [ma_ho_so]);
    return result.rows;
  }

  /**
   * Lưu ảnh tổn thương vào Sub Database (Prisma) và đồng bộ vào CSDL chính
   */
  async saveAnhTonThuongMoRong(data) {
    const {
      ma_ho_so,
      ma_tai_khoan,
      ten_tep_goc,
      storage_path,
      public_url,
      dinh_dang_tep,
      dung_luong_bytes,
      toa_do_x,
      toa_do_y,
      vung_co_the,
      ghi_chu_lam_sang,
      diem_ngua_nrs,
      diem_dau_nrs,
    } = data;

    // 1. Lưu vào Sub Database Supabase bằng Prisma
    const anhMoRong = await prisma.anhTonThuongMoRong.create({
      data: {
        maHoSo: BigInt(ma_ho_so),
        maTaiKhoan: BigInt(ma_tai_khoan),
        bucketName: bucketName || 'mayday-attachments',
        storagePath: storage_path,
        publicUrl: public_url,
        dinhDangTep: dinh_dang_tep || 'image/jpeg',
        dungLuongBytes: dung_luong_bytes ? BigInt(dung_luong_bytes) : null,
        toaDoX: toa_do_x ? parseFloat(toa_do_x) : null,
        toaDoY: toa_do_y ? parseFloat(toa_do_y) : null,
        vungCoThe: vung_co_the,
        ghiChuLamSang: ghi_chu_lam_sang,
        diemNguaNrs: diem_ngua_nrs ? parseInt(diem_ngua_nrs, 10) : null,
        diemDauNrs: diem_dau_nrs ? parseInt(diem_dau_nrs, 10) : null,
      },
    });

    // 2. Ghi một bản ghi đối chiếu vào CSDL chính (bảng tepdinhkem) nếu có
    try {
      const tepQuery = `
        INSERT INTO public.tepdinhkem (
          ma_ho_so, ma_tai_khoan, ten_tep_goc, duong_dan_luu_tru, duong_dan_url, dinh_dang_tep, dung_luong_byte
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING ma_tep_dinh_kem
      `;
      const tepRes = await db.query(tepQuery, [
        ma_ho_so, ma_tai_khoan, ten_tep_goc, storage_path, public_url, dinh_dang_tep, dung_luong_bytes
      ]);

      if (tepRes.rows[0]) {
        // Cập nhật maTepDinhKemGoc trong Sub DB
        await prisma.anhTonThuongMoRong.update({
          where: { id: anhMoRong.id },
          data: { maTepDinhKemGoc: BigInt(tepRes.rows[0].ma_tep_dinh_kem) },
        });
      }
    } catch (mainDbErr) {
      console.warn('[Sync Warning] Không thể ghi bản ghi đối chiếu sang CSDL chính:', mainDbErr.message);
    }

    return anhMoRong;
  }

  // Lấy danh sách ảnh tổn thương mở rộng theo hồ sơ từ Sub DB (Prisma)
  async getAnhTonThuongMoRongByHoSo(ma_ho_so) {
    const list = await prisma.anhTonThuongMoRong.findMany({
      where: { maHoSo: BigInt(ma_ho_so) },
      orderBy: { thoiDiemTao: 'desc' },
    });
    return list;
  }
}

module.exports = new LesionService();
