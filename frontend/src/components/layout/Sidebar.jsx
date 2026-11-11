import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Shield,
  Building2,
  Users,
  FolderHeart,
  Stethoscope,
  Pill,
  Activity,
  Camera,
  FileQuestion,
  LayoutDashboard
} from 'lucide-react';

export default function Sidebar() {
  const navSections = [
    {
      group: 'Tổng quan',
      items: [
        { label: 'Bảng điều khiển', to: '/', icon: LayoutDashboard }
      ]
    },
    {
      group: 'Thành viên 1: Quản trị & Hạ tầng',
      items: [
        { label: 'Chi nhánh & Phòng khám', to: '/admin/topology', icon: Building2 },
        { label: 'Nhân viên & Phân quyền', to: '/admin/users', icon: Shield },
      ]
    },
    {
      group: 'Thành viên 2: Bệnh nhân & Hồ sơ',
      items: [
        { label: 'Danh sách Bệnh nhân', to: '/patients', icon: Users },
        { label: 'Hồ sơ Bệnh án Mạn/Cấp', to: '/patients/records', icon: FolderHeart },
      ]
    },
    {
      group: 'Thành viên 3: Lâm sàng & UAS7',
      items: [
        { label: 'Phiên khám lâm sàng', to: '/clinical/exams', icon: Stethoscope },
        { label: 'Kê đơn thuốc & Cận lâm sàng', to: '/clinical/prescriptions', icon: Pill },
        { label: 'Theo dõi chỉ số UAS7/AAS', to: '/clinical/uas7', icon: Activity },
      ]
    },
    {
      group: 'Thành viên 4: Kho ảnh & Form động',
      items: [
        { label: 'Kho ảnh & Tải ảnh tổn thương', to: '/lesions/upload', icon: Camera },
        { label: 'Bản đồ vị trí tổn thương', to: '/lesions/gallery', icon: Camera },
        { label: 'Mẫu phiếu khám động', to: '/lesions/forms', icon: FileQuestion },
      ]
    }
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 min-h-[calc(100vh-4rem)]">
      <div className="p-4 space-y-6 flex-1 overflow-y-auto">
        {navSections.map((sec, idx) => (
          <div key={idx} className="space-y-1">
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
              {sec.group}
            </p>
            {sec.items.map((item, itemIdx) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={itemIdx}
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        DrMayDay 4-Member Modular Architecture
      </div>
    </aside>
  );
}
