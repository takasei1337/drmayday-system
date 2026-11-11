import React, { useState } from 'react';
import api from '../../../api/client';
import { Camera, Upload, CheckCircle2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function LesionUploadPage() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [maHoSo, setMaHoSo] = useState('16'); // Mẫu ID từ snapshot
  const [vungCoThe, setVungCoThe] = useState('Cẳng tay trái');
  const [diemNgua, setDiemNgua] = useState(2);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Vui lòng chọn ảnh chụp tổn thương');
      return;
    }

    setLoading(true);
    // Lưu ý: AI Predict là service bên thứ 3 đảm nhiệm theo Slide APIs.
    // Module này chỉ thực hiện upload ảnh lên Supabase Storage và lưu metadata vào DB.
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);
      formData.append('ma_ho_so', maHoSo);
      formData.append('vung_co_the', vungCoThe);
      formData.append('diem_ngua_nrs', diemNgua);

      const res = await api.post('/lesions/anh-mo-rong', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.code === 1000) {
        toast.success('Tải ảnh tổn thương lên Supabase thành công!');
        setSelectedFile(null);
        setPreview(null);
      } else {
        toast.error(res.message || 'Lỗi tải ảnh');
      }
    } catch (err) {
      toast.error(err.message || 'Lỗi gửi yêu cầu upload');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Kho ảnh & Tải ảnh tổn thương (Thành viên 4)</h1>
        <p className="text-sm text-slate-500">Phạm vi Slide 8, 9, 10 & 11: Lưu trữ đám mây Supabase Storage & Đánh dấu tọa độ tổn thương</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <form onSubmit={handleUpload} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <Camera className="w-5 h-5 text-blue-600" /> Tải ảnh thương tổn mới
          </h2>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Mã hồ sơ bệnh án (ma_ho_so)</label>
            <input
              type="text"
              value={maHoSo}
              onChange={(e) => setMaHoSo(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
              placeholder="Ví dụ: 16"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Vùng cơ thể xuất hiện sẩn ngứa</label>
            <select
              value={vungCoThe}
              onChange={(e) => setVungCoThe(e.target.value)}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-blue-500"
            >
              <option value="Cẳng tay trái">Cẳng tay trái</option>
              <option value="Cẳng tay phải">Cẳng tay phải</option>
              <option value="Vùng lưng">Vùng lưng</option>
              <option value="Vùng bụng">Vùng bụng</option>
              <option value="Mặt & Cổ">Mặt & Cổ</option>
              <option value="Đùi & Bắp chân">Đùi & Bắp chân</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Mức độ ngứa NRS tại vùng da (0 - 10)</label>
            <input
              type="range"
              min="0"
              max="10"
              value={diemNgua}
              onChange={(e) => setDiemNgua(e.target.value)}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>0 (Không ngứa)</span>
              <span className="font-bold text-blue-600">{diemNgua} điểm</span>
              <span>10 (Ngứa dữ dội)</span>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:border-blue-400 transition cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              id="lesion-upload"
              className="hidden"
            />
            <label htmlFor="lesion-upload" className="cursor-pointer">
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-700">Chọn hoặc kéo thả ảnh chụp vết thương</p>
              <p className="text-xs text-slate-400 mt-1">Định dạng JPG, PNG (tự động đẩy lên Supabase Bucket)</p>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm"
          >
            {loading ? 'Đang tải lên Supabase...' : 'Xác nhận tải ảnh'}
          </button>
        </form>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col items-center justify-center">
          {preview ? (
            <div className="space-y-4 text-center">
              <img src={preview} alt="Xem trước" className="max-h-80 rounded-lg shadow-sm border border-slate-200 object-contain mx-auto" />
              <p className="text-xs text-slate-500 font-medium">Xem trước ảnh vùng da tổn thương</p>
            </div>
          ) : (
            <div className="text-center text-slate-400 space-y-2">
              <Camera className="w-12 h-12 mx-auto stroke-1 text-slate-300" />
              <p className="text-sm">Chưa có ảnh nào được chọn</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
