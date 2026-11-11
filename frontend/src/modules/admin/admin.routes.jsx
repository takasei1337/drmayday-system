import React from 'react';
import AdminDashboard from './pages/AdminDashboard';
import ClinicTopologyPage from './pages/ClinicTopologyPage';
import UserManagementPage from './pages/UserManagementPage';

export const adminRoutes = [
  { path: 'admin', element: <AdminDashboard /> },
  { path: 'admin/topology', element: <ClinicTopologyPage /> },
  { path: 'admin/users', element: <UserManagementPage /> },
];
