import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LogOut, User, Bell } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <span className="font-bold text-xl text-blue-600 tracking-tight">DrMayDay</span>
        <span className="text-xs bg-blue-100 text-blue-800 font-semibold px-2.5 py-0.5 rounded-full">
          Hệ thống Quản lý Mề đay
        </span>
      </div>

      <div className="flex items-center gap-4">
        <button
          className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
          title="Thông báo"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        </button>

        <div className="h-6 w-px bg-slate-200"></div>

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 font-bold">
            <User className="w-5 h-5" />
          </div>
          <div className="text-left text-sm">
            <div className="font-medium text-slate-800">{user?.full_name || user?.display_name || user?.ho_ten || 'Tài khoản thử nghiệm'}</div>
            <div className="text-xs text-slate-500 capitalize">
              {user?.role_name || (user?.role_id === 1 ? 'Quản trị viên' : user?.role_id === 2 ? 'Bác sĩ' : user?.role_id === 3 ? 'Bệnh nhân' : user?.vai_tro || 'Nhân viên')}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
          title="Đăng xuất"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
