import React from 'react';
import { Pill, Plus } from 'lucide-react';

export default function PrescriptionPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Kê đơn thuốc & Chỉ định Cận lâm sàng</h1>
          <p className="text-sm text-slate-500">Phác đồ thuốc kháng Histamin H1 thế hệ 2 & Theo dõi chỉ dẫn ngừng thuốc</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
          <Plus className="w-4 h-4" /> Tạo đơn thuốc mới
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <Pill className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-800">Danh mục thuốc & Cận lâm sàng</h2>
        </div>
        <p className="text-sm text-slate-600">
          Kết nối trực tiếp các bảng CSDL: <code>thuoc</code>, <code>donthuoc</code>, <code>chitietdonthuoc</code>, <code>chidanngungthuoc</code>, <code>ketquacanlamsang</code>.
        </p>
      </div>
    </div>
  );
}
