import React from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from '../components/layout/AppLayout';

// Nhập routes từ từng module độc lập của 4 thành viên
import { authRoutes } from '../modules/auth/auth.routes';
import { adminRoutes } from '../modules/admin/admin.routes';
import { patientRoutes } from '../modules/patient/patient.routes';
import { clinicalRoutes } from '../modules/clinical/clinical.routes';
import { lesionRoutes } from '../modules/lesion/lesion.routes';

export const router = createBrowserRouter([
  // Route công khai (Đăng nhập)
  ...authRoutes,

  // Các route nghiệp vụ chính nằm trong Layout chung
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="/admin" replace /> },
      ...adminRoutes,      // Thành viên 1
      ...patientRoutes,    // Thành viên 2
      ...clinicalRoutes,   // Thành viên 3
      ...lesionRoutes,     // Thành viên 4
    ],
  },

  // 404 fallback
  {
    path: '*',
    element: (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-center">
        <div>
          <h1 className="text-4xl font-bold text-slate-800">404</h1>
          <p className="text-slate-500 mt-2">Trang không tồn tại</p>
          <a href="/" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">
            Về trang chủ
          </a>
        </div>
      </div>
    ),
  },
]);
