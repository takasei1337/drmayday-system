import React from 'react';
import { FileQuestion, Plus } from 'lucide-react';

export default function DynamicFormPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bộ tạo Mẫu phiếu khám Động (Slide 11)</h1>
          <p className="text-sm text-slate-500">Cho phép bác sĩ tự cấu hình Section và Question khảo sát động theo từng ca bệnh</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition shadow-sm">
          <Plus className="w-4 h-4" /> Tạo mẫu phiếu mới
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <FileQuestion className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-800">Kiến trúc Form Builder</h2>
        </div>
        <p className="text-sm text-slate-600">
          Quản lý theo mô hình phân cấp: <code>Template</code> $\rightarrow$ <code>TemplateSection</code> $\rightarrow$ <code>TemplateQuestion</code> trên Sub Database Prisma.
        </p>
      </div>
    </div>
  );
}
