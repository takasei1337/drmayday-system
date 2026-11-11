import React from 'react';
import { Building2, Users, Shield, CheckCircle } from 'lucide-react';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Bảng điều khiển Quản trị viên (Thành viên 1)</h1>
        <p className="text-sm text-slate-500">Phạm vi Slide 3 & 4: Cơ sở vật chất, Tài khoản, Phân quyền RBAC</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">Chi nhánh & Phòng khám</div>
              <div className="text-sm text-slate-500">Quản lý sơ đồ cơ sở vật chất</div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">Nhân sự & Bác sĩ</div>
              <div className="text-sm text-slate-500">Cấp tài khoản & gán vai trò</div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-white rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-800">Phân quyền RBAC</div>
              <div className="text-sm text-slate-500">Quyền hạn theo Vai trò</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
        <h2 className="text-lg font-semibold text-slate-800">Tình trạng Module Thành viên 1</h2>
        <ul className="space-y-2 text-sm text-slate-600">
          <li className="flex items-center gap-2 text-emerald-600">
            <CheckCircle className="w-4 h-4" /> Endpoint Backend kết nối: <code>/api/v1/admin/branches</code>, <code>/api/v1/admin/clinics</code>
          </li>
          <li className="flex items-center gap-2 text-emerald-600">
            <CheckCircle className="w-4 h-4" /> Bảng DB phụ trách: <code>chinhanh</code>, <code>phongkham</code>, <code>nguoi</code>, <code>taikhoan</code>, <code>vaitro</code>, <code>quyenhan</code>
          </li>
        </ul>
      </div>
    </div>
  );
}
