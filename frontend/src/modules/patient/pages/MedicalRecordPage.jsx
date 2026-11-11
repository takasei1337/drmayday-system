import React from 'react';
import { FolderHeart, AlertTriangle } from 'lucide-react';

export default function MedicalRecordPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Hồ sơ Bệnh án Mày đay (Mạn & Cấp tính)</h1>
        <p className="text-sm text-slate-500">Phân loại bệnh án theo tài liệu Bệnh viện Da liễu & bảng `benhanmaydayman`, `benhanmaydaycap`</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
              <FolderHeart className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Bệnh án Mày đay Mạn tính</h2>
              <span className="text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">Kéo dài &gt; 6 tuần</span>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Theo dõi tiến triển kéo dài, chu kỳ tính điểm UAS7 hàng ngày, lịch sử kháng Histamin và đáp ứng Omalizumab.
          </p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-50 text-red-600 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Bệnh án Mày đay Cấp tính</h2>
              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-medium">Kéo dài &lt; 6 tuần</span>
            </div>
          </div>
          <p className="text-sm text-slate-600">
            Sàng lọc dấu hiệu báo động đỏ (phù mạch khó thở, sốc phản vệ), tìm hoàn cảnh khởi phát dị ứng tức thì.
          </p>
        </div>
      </div>
    </div>
  );
}
