import React from 'react';
import { Camera, MapPin } from 'lucide-react';

export default function LesionGalleryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Bản đồ Định vị Tổn thương & Kho ảnh</h1>
        <p className="text-sm text-slate-500">Gắn tọa độ X, Y trên mô hình cơ thể & Quản lý lịch sử nốt sẩn mày đay (Slide 8 & 9)</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <MapPin className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-800">Bản đồ tọa độ cơ thể (Body Mapping)</h2>
        </div>
        <p className="text-sm text-slate-600 mb-4">
          Hỗ trợ bác sĩ và bệnh nhân click trực tiếp lên ảnh giải phẫu cơ thể để đánh dấu vị trí phát ban, sẩn phù. Dữ liệu được lưu trữ tại bảng <code>anh_ton_thuong_mo_rong</code> (toa_do_x, toa_do_y).
        </p>
      </div>
    </div>
  );
}
