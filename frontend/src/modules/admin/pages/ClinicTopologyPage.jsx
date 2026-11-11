import React, { useEffect, useState } from 'react';
import api from '../../../api/client';
import { Building2, Plus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ClinicTopologyPage() {
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchBranches = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/branches');
      if (res.code === 1000) {
        setBranches(res.data || []);
      }
    } catch (err) {
      toast.error(err.message || 'Chưa tải được danh sách chi nhánh');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBranches();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Sơ đồ Chi nhánh & Phòng khám</h1>
          <p className="text-sm text-slate-500">Quản lý mạng lưới cơ sở y tế theo mô hình 1-N (Slide 3 & 4)</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchBranches}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
            <Plus className="w-4 h-4" /> Thêm Chi nhánh
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4">Mã Chi nhánh</th>
              <th className="py-3.5 px-4">Tên Chi nhánh</th>
              <th className="py-3.5 px-4">Địa chỉ</th>
              <th className="py-3.5 px-4">Số điện thoại</th>
              <th className="py-3.5 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {branches.length > 0 ? (
              branches.map((b) => (
                <tr key={b.ma_chi_nhanh} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono font-medium text-blue-600">#{b.ma_chi_nhanh}</td>
                  <td className="py-3.5 px-4 font-medium">{b.ten_chi_nhanh}</td>
                  <td className="py-3.5 px-4">{b.dia_chi || '—'}</td>
                  <td className="py-3.5 px-4">{b.so_dien_thoai || '—'}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button className="text-blue-600 hover:underline font-medium text-xs">Chi tiết</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="py-8 text-center text-slate-400">
                  {loading ? 'Đang tải dữ liệu...' : 'Chưa có chi nhánh nào hoặc máy chủ backend đang offline.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
