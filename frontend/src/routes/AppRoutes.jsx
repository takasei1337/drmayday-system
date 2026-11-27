import { Routes, Route, Navigate } from "react-router-dom";

// Layouts
import AdminLayout from "../layouts/AdminLayout";
import DoctorLayout from "../layouts/DoctorLayout";
import PatientLayout from "../layouts/PatientLayout";
import AuthLayout from "../layouts/AuthLayout";

// Auth Pages
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import NotFound from "../pages/NotFound";

// Admin Pages
import AdminDashboard from "../pages/admin/AdminDashboard";
import AdminNotifications from "../pages/admin/AdminNotifications";
import UserManagement from "../pages/admin/UserManagement";
import TopologyManagement from "../pages/admin/TopologyManagement";
import FormBuilder from "../pages/admin/FormBuilder";

// Doctor Pages
import DoctorQueue from "../pages/doctor/DoctorQueue";
import DoctorNotifications from "../pages/doctor/DoctorNotifications";
import DoctorPrescription from "../pages/doctor/DoctorPrescription";
import DoctorLesionReview from "../pages/doctor/DoctorLesionReview";
import DoctorLabRequests from "../pages/doctor/DoctorLabRequests";

// Patient Pages
import PatientDashboard from "../pages/patient/PatientDashboard";
import PatientNotifications from "../pages/patient/PatientNotifications";
import Uas7Tracker from "../pages/patient/Uas7Tracker";
import ScreeningForm from "../pages/patient/ScreeningForm";
import LesionTracker from "../pages/patient/LesionTracker";
import PatientProfile from "../pages/patient/PatientProfile";
import EmergencyTriage from "../pages/patient/EmergencyTriage";

function getStoredRole() {
  try {
    const raw = localStorage.getItem("user");
    if (!raw) return null;
    const u = JSON.parse(raw);
    if (u.role) return u.role;
    const rid = Number(u.role_id);
    if (u.role_name === "admin" || rid === 1) return "admin";
    if (u.role_name === "bac_si" || u.role_name === "dieu_duong" || rid === 2 || rid === 3) return "doctor";
    return "patient";
  } catch {
    return null;
  }
}

function ProtectedRoute({ allowedRoles, children }) {
  const token = localStorage.getItem("token");
  const role = getStoredRole();
  if (!token || !role) {
    return <Navigate to="/login" replace />;
  }
  if (allowedRoles && !allowedRoles.includes(role)) {
    const fallback = role === "admin" ? "/admin" : role === "doctor" ? "/doctor" : "/patient";
    return <Navigate to={fallback} replace />;
  }
  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Public Emergency Triage (< 30s Red Alert) */}
      <Route path="/emergency-triage" element={<EmergencyTriage />} />

      {/* Auth Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      {/* Admin Module Routes (Đầu việc 1) */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="notifications" element={<AdminNotifications />} />
        <Route path="users" element={<UserManagement />} />
        <Route path="topology" element={<TopologyManagement />} />
        <Route path="form-builder" element={<FormBuilder />} />
      </Route>

      {/* Doctor Module Routes (Đầu việc 3) */}
      <Route
        path="/doctor"
        element={
          <ProtectedRoute allowedRoles={["doctor", "admin"]}>
            <DoctorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DoctorQueue />} />
        <Route path="notifications" element={<DoctorNotifications />} />
        <Route path="prescriptions" element={<DoctorPrescription />} />
        <Route path="lesions" element={<DoctorLesionReview />} />
        <Route path="lesion-review" element={<Navigate to="/doctor/lesions" replace />} />
        <Route path="lab-requests" element={<DoctorLabRequests />} />
      </Route>

      {/* Patient Module Routes (Đầu việc 2) */}
      <Route
        path="/patient"
        element={
          <ProtectedRoute allowedRoles={["patient"]}>
            <PatientLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<PatientDashboard />} />
        <Route path="notifications" element={<PatientNotifications />} />
        <Route path="screening" element={<ScreeningForm />} />
        <Route path="uas7" element={<Uas7Tracker />} />
        <Route path="diary" element={<Navigate to="/patient/uas7" replace />} />
        <Route path="lesions" element={<LesionTracker />} />
        <Route path="profile" element={<PatientProfile />} />
      </Route>

      {/* 404 Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
