import React from 'react';
import { Stethoscope, ClipboardCheck } from 'lucide-react';

export default function ClinicalExaminationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Phiên khám Lâm sàng Bác sĩ</h1>
        <p className="text-sm text-slate-500">Quản lý phiên khám bệnh án mạn và cấp tính (bảng `phienkham`, `phienkhamcap`, `phienkhamman`)</p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <Stethoscope className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-800">Hạng mục khám lâm sàng chuyên khoa</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-700">
          <div className="border border-slate-200 p-4 rounded-lg bg-slate-50">
            <h3 className="font-semibold text-slate-900 mb-1">Dấu hiệu sinh tồn & Triệu chứng toàn thân</h3>
            <p className="text-xs text-slate-500">Mạch, huyết áp, nhiệt độ, nhịp thở, tình trạng sốt và dấu hiệu nhiễm trùng.</p>
          </div>
          <div className="border border-slate-200 p-4 rounded-lg bg-slate-50">
            <h3 className="font-semibold text-slate-900 mb-1">Nghiệm pháp kích thích (Provocation Test)</h3>
            <p className="text-xs text-slate-500">Nghiệm pháp vạch da (Dermographism), nghiệm pháp đá lạnh (Ice cube), nghiệm pháp áp lực.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
