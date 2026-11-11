import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Activity, Calendar, Info } from 'lucide-react';

const sampleUas7Data = [
  { day: 'Thứ 2', ngua: 2, san: 2, tong: 4 },
  { day: 'Thứ 3', ngua: 3, san: 3, tong: 6 },
  { day: 'Thứ 4', ngua: 2, san: 1, tong: 3 },
  { day: 'Thứ 5', ngua: 1, san: 1, tong: 2 },
  { day: 'Thứ 6', ngua: 0, san: 1, tong: 1 },
  { day: 'Thứ 7', ngua: 1, san: 0, tong: 1 },
  { day: 'CN', ngua: 0, san: 0, tong: 0 },
];

export default function Uas7TrackingPage() {
  const [data] = useState(sampleUas7Data);
  const totalScore = data.reduce((acc, cur) => acc + cur.tong, 0);

  const getEvaluation = (score) => {
    if (score === 0) return { text: 'Kiểm soát hoàn toàn', color: 'text-emerald-600 bg-emerald-50' };
    if (score <= 6) return { text: 'Kiểm soát tốt', color: 'text-green-600 bg-green-50' };
    if (score <= 15) return { text: 'Mức độ nhẹ', color: 'text-yellow-600 bg-yellow-50' };
    if (score <= 27) return { text: 'Mức độ trung bình', color: 'text-orange-600 bg-orange-50' };
    return { text: 'Mức độ nặng', color: 'text-red-600 bg-red-50' };
  };

  const evalResult = getEvaluation(totalScore);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bảng theo dõi UAS7 hàng ngày (Thành viên 3)</h1>
          <p className="text-sm text-slate-500">Phạm vi Slide 6 & 7: Tính điểm UAS7 (0 - 42) & Đánh giá mức độ kiểm soát bệnh</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">Tổng điểm tuần:</span>
          <span className="text-2xl font-bold text-blue-600">{totalScore} / 42</span>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${evalResult.color}`}>
            {evalResult.text}
          </span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" /> Biểu đồ điểm triệu chứng 7 ngày liên tiếp
        </h2>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" />
              <YAxis domain={[0, 6]} stroke="#64748b" />
              <Tooltip />
              <Line type="monotone" dataKey="ngua" name="Điểm Ngứa (0-3)" stroke="#ef4444" strokeWidth={2} />
              <Line type="monotone" dataKey="san" name="Điểm Sẩn phù (0-3)" stroke="#3b82f6" strokeWidth={2} />
              <Line type="monotone" dataKey="tong" name="Tổng ngày (0-6)" stroke="#8b5cf6" strokeWidth={3} strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-sm text-blue-900">
        <Info className="w-5 h-5 shrink-0 text-blue-600 mt-0.5" />
        <div>
          <span className="font-semibold">Quy chuẩn UAS7 lâm sàng:</span>
          <p className="text-xs text-blue-700 mt-0.5">
            Mỗi ngày tính điểm từ 0 - 6 (Ngứa: 0-3 điểm + Nốt sẩn: 0-3 điểm). Tổng 7 ngày dao động từ 0 đến 42 điểm. Điểm càng thấp chứng tỏ phác đồ điều trị đáp ứng tốt.
          </p>
        </div>
      </div>
    </div>
  );
}
