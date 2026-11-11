import React, { useEffect, useState } from 'react';
import api from '../../../api/client';
import { Users, Search, UserPlus, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

export default function PatientListPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/patients');
      if (res.code === 1000) {
        setPatients(res.data || []);
      }
    } catch (err) {
      toast.error(err.message || 'Không thể tải danh sách bệnh nhân');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filtered = patients.filter((p) =>
    (p.ho_ten || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.so_dien_thoai || '').includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Danh sách Bệnh nhân (Thành viên 2)</h1>
          <p className="text-sm text-slate-500">Phạm vi Slide 5: Tiếp nhận bệnh nhân & Quản lý thông tin hồ sơ y tế</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchPatients}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm transition"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Làm mới
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
            <UserPlus className="w-4 h-4" /> Tiếp nhận mới
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <Search className="w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Tìm theo họ tên, số điện thoại..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full text-sm outline-none bg-transparent"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="py-3.5 px-4">Mã BN</th>
              <th className="py-3.5 px-4">Họ và Tên</th>
              <th className="py-3.5 px-4">Giới tính</th>
              <th className="py-3.5 px-4">Ngày sinh</th>
              <th className="py-3.5 px-4">Số điện thoại</th>
              <th className="py-3.5 px-4">Nghề nghiệp</th>
              <th className="py-3.5 px-4 text-right">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {filtered.length > 0 ? (
              filtered.map((p) => (
                <tr key={p.ma_benh_nhan} className="hover:bg-slate-50">
                  <td className="py-3.5 px-4 font-mono font-medium text-blue-600">#{p.ma_benh_nhan}</td>
                  <td className="py-3.5 px-4 font-medium text-slate-900">{p.ho_ten}</td>
                  <td className="py-3.5 px-4">{p.gioi_tinh || '—'}</td>
                  <td className="py-3.5 px-4">{p.ngay_sinh ? new Date(p.ngay_sinh).toLocaleDateString('vi-VN') : '—'}</td>
                  <td className="py-3.5 px-4">{p.so_dien_thoai || '—'}</td>
                  <td className="py-3.5 px-4">{p.nghe_nghiep || '—'}</td>
                  <td className="py-3.5 px-4 text-right">
                    <button className="text-blue-600 hover:underline font-medium text-xs">Xem bệnh án</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-400">
                  {loading ? 'Đang truy vấn CSDL...' : 'Không tìm thấy bệnh nhân nào.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
