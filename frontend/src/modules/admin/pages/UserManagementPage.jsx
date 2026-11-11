import React from 'react';
import { Shield, UserPlus } from 'lucide-react';

export default function UserManagementPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Quản trị Nhân viên & Phân quyền</h1>
          <p className="text-sm text-slate-500">Quản lý Bác sĩ, Điều dưỡng và cấu hình RBAC theo vai trò</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
          <UserPlus className="w-4 h-4" /> Cấp tài khoản mới
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-800">Các vai trò chính trong hệ thống</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-semibold text-blue-700">1. ADMIN (Quản trị viên)</span>
            <p className="text-xs text-slate-500 mt-1">Toàn quyền trên sơ đồ cơ sở vật chất, tài khoản, gán quyền và báo cáo hệ thống.</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-semibold text-emerald-700">2. DOCTOR (Bác sĩ)</span>
            <p className="text-xs text-slate-500 mt-1">Xem hồ sơ bệnh án, khám lâm sàng, kê đơn thuốc và đọc kết quả phân tích tổn thương.</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200">
            <span className="font-semibold text-amber-700">3. PATIENT (Bệnh nhân)</span>
            <p className="text-xs text-slate-500 mt-1">Cập nhật triệu chứng hàng ngày (UAS7), chụp tải ảnh tổn thương và xem lịch sử đơn thuốc.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
