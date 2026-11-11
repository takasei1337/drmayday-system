import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Lock, Phone, ArrowRight, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [soDienThoai, setSoDienThoai] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const { login, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await login(soDienThoai, matKhau);
    if (res.success) {
      toast.success('Đăng nhập thành công!');
      navigate('/');
    } else {
      toast.error(res.message || 'Số điện thoại hoặc mật khẩu không đúng');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div className="inline-flex p-3 bg-blue-600 text-white rounded-2xl shadow-lg mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Hệ thống DrMayDay</h1>
          <p className="text-sm text-slate-500 mt-1">Đăng nhập tài khoản Bác sĩ / Quản trị viên / Bệnh nhân</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Số điện thoại đăng nhập
            </label>
            <div className="relative">
              <Phone className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={soDienThoai}
                onChange={(e) => setSoDienThoai(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                placeholder="Nhập số điện thoại"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                value={matKhau}
                onChange={(e) => setMatKhau(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
                placeholder="Nhập mật khẩu"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition shadow-sm"
          >
            {loading ? 'Đang xác thực...' : 'Đăng nhập'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="bg-white p-4 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1 text-center">
          <p className="font-semibold text-slate-800">Thông tin tài khoản đăng nhập:</p>
          <p className="text-slate-500 text-[11px]">
            Xem tài khoản quản trị và bác sĩ trong file nội bộ (docs/README_TEAM_GUIDE.md hoặc .env).
          </p>
        </div>
      </div>
    </div>
  );
}
