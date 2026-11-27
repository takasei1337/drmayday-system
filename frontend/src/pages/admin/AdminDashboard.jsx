import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../services/apiClient";
import { StatusBadge } from "../../components/ui";

export default function AdminDashboard() {
  const [kpis, setKpis] = useState({
    pending_count: 0,
    in_progress_count: 0,
    completed_count: 0,
    branches_count: 0,
    rooms_count: 0,
  });
  const [records, setRecords] = useState([]);
  const [staffs, setStaffs] = useState([]);
  const [activeTemplate, setActiveTemplate] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let remaining = 3;
    const doneOne = () => {
      remaining -= 1;
      if (!cancelled && remaining <= 0) setLoading(false);
    };

    apiClient
      .get("/branches", { silent: true })
      .then((bRes) => {
        if (cancelled) return;
        const brList = Array.isArray(bRes?.data) ? bRes.data : [];
        setKpis((prev) => ({ ...prev, branches_count: brList.length }));
      })
      .catch(() => {})
      .finally(doneOne);

    apiClient
      .get("/rooms", { silent: true })
      .then((rRes) => {
        if (cancelled) return;
        const rmList = Array.isArray(rRes?.data) ? rRes.data : [];
        setKpis((prev) => ({ ...prev, rooms_count: rmList.length }));
      })
      .catch(() => {})
      .finally(doneOne);

    apiClient
      .get("/admin/users", { params: { limit: 100 }, silent: true })
      .then((uRes) => {
        if (cancelled) return;
        const uList = Array.isArray(uRes?.data) ? uRes.data : [];
        setStaffs(uList.filter((s) => Number(s.role_id) === 2 || Number(s.role_id) === 3));
      })
      .catch(() => {})
      .finally(doneOne);

    apiClient
      .get("/templates/all", { silent: true })
      .then((tRes) => {
        if (cancelled) return;
        const tList = Array.isArray(tRes?.data) ? tRes.data : [];
        if (tList.length > 0) {
          setActiveTemplate(tList.find((t) => String(t.is_active) === "1" || t.is_active === true) || tList[0]);
        }
      })
      .catch(() => {});

    apiClient
      .get("/medical_records/all", { params: { limit: 20 }, silent: true })
      .then((recRes) => {
        if (cancelled) return;
        const recList = Array.isArray(recRes?.data) ? recRes.data : [];
        setKpis((prev) => ({
          ...prev,
          pending_count: recList.filter((r) => r.status === "pending").length,
          in_progress_count: recList.filter((r) => r.status === "in_progress").length,
          completed_count: recList.filter((r) => r.status === "completed").length,
        }));
        setRecords(recList);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <div className="flex items-center gap-2 mb-2 text-xs text-white/60">
              <span className="text-white/70">Quản trị</span>
              <span className="isax icon-arrow-right-3 text-xs"></span>
              <span className="text-white/90 font-medium">Tổng quan</span>
            </div>
            <h1 className="base-hero-title">Tổng quan quản trị</h1>
          </div>
          <div className="base-hero-actions">
            <Link to="/admin/topology" className="base-btn-hero-primary">
              <span className="isax icon-buildings text-sm"></span>
              <span>Hạ tầng</span>
            </Link>
            <Link to="/admin/form-builder" className="base-btn-hero-accent">
              <span className="isax-b icon-document-text text-sm"></span>
              <span>Biểu mẫu</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 4 Metric KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="base-stat-card rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">Ca chờ tiếp nhận</span>
            <div className="base-stat-card-icon text-[var(--base-warning-primary)]">
              <span className="isax icon-clock text-lg"></span>
            </div>
          </div>
          <div>
            <span className="base-stat-card-value">{kpis.pending_count}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="base-tag base-tag-warning text-xs font-bold">Chờ bác sĩ</span>
            <span className="text-xs text-[var(--base-content-tertiary)]">Hàng đợi trực tiếp</span>
          </div>
        </div>

        <div className="base-stat-card rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">Đang khám điều trị</span>
            <div className="base-stat-card-icon text-[var(--base-info-primary)]">
              <span className="isax icon-health text-lg"></span>
            </div>
          </div>
          <div>
            <span className="base-stat-card-value">{kpis.in_progress_count}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="base-tag base-tag-info text-xs font-bold">Đang khám</span>
            <span className="text-xs text-[var(--base-content-tertiary)]">Khám lâm sàng</span>
          </div>
        </div>

        <div className="base-stat-card rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">Đã chốt bệnh án</span>
            <div className="base-stat-card-icon text-[var(--base-positive-primary)]">
              <span className="isax icon-tick-circle text-lg"></span>
            </div>
          </div>
          <div>
            <span className="base-stat-card-value">{kpis.completed_count}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="base-tag base-tag-positive text-xs font-bold">Hoàn thành</span>
            <span className="text-xs text-[var(--base-content-tertiary)]">Đã gửi đơn thuốc</span>
          </div>
        </div>

        <div className="base-stat-card rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="base-stat-card-label">Hạ tầng cơ sở</span>
            <div className="base-stat-card-icon">
              <span className="isax icon-buildings text-lg"></span>
            </div>
          </div>
          <div>
            <span className="base-stat-card-value">{kpis.branches_count}</span>{" "}
            <span className="base-stat-card-unit">chi nhánh</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="base-tag base-tag-neutral text-xs font-bold">{kpis.rooms_count} phòng khám</span>
            <span className="text-xs text-[var(--base-content-tertiary)]">Cơ cấu 3 tầng</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Recent Consultations Table (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <div className="base-card rounded-lg overflow-hidden">
            <div className="base-card-header flex items-center justify-between">
              <h2 className="base-card-title">Ca Khám Toàn Viện</h2>
              <Link to="/admin/users" className="base-btn base-btn-secondary base-btn-sm text-xs">
                <span>Nhân sự trực</span>
                <span className="isax icon-arrow-right-1 text-xs"></span>
              </Link>
            </div>

            <div className="overflow-x-auto base-table-container">
              <table className="base-table min-w-[760px]">
                <thead>
                  <tr>
                    <th className="whitespace-nowrap">Mã BA</th>
                    <th className="whitespace-nowrap">Bệnh nhân</th>
                    <th className="whitespace-nowrap">Số điện thoại</th>
                    <th className="whitespace-nowrap">Thể bệnh</th>
                    <th className="whitespace-nowrap">Bác sĩ</th>
                    <th className="whitespace-nowrap">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-xs text-gray-400">
                        Đang tải dữ liệu giám sát toàn viện...
                      </td>
                    </tr>
                  ) : records.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-xs text-gray-400">
                        Chưa có ca khám nào trong hệ thống.
                      </td>
                    </tr>
                  ) : (
                    records.map((r) => (
                      <tr key={r.medical_record_id}>
                        <td className="font-mono font-bold text-xs text-[var(--base-brand-navy)] whitespace-nowrap">
                          {r.record_code}
                        </td>
                        <td className="font-bold text-xs text-gray-900 whitespace-nowrap">
                          {r.patient_name}
                        </td>
                        <td className="font-mono text-xs text-gray-600 whitespace-nowrap">
                          {r.patient_phone || "—"}
                        </td>
                        <td className="whitespace-nowrap">
                          {r.clinical_type === "chronic" ? (
                            <span className="base-tag base-tag-info font-bold text-xs">Mạn tính</span>
                          ) : (
                            <span className="base-tag base-tag-warning font-bold text-xs">Cấp tính</span>
                          )}
                        </td>
                        <td className="text-xs font-semibold text-gray-800 whitespace-nowrap">
                          {r.doctor_name || "Chưa phân công"}
                        </td>
                        <td className="whitespace-nowrap">
                          <StatusBadge
                            variant={
                              r.status === "completed"
                                ? "completed"
                                : r.status === "in_progress"
                                ? "in_progress"
                                : "pending"
                            }
                            label={
                              r.status === "completed"
                                ? "Đã khám"
                                : r.status === "in_progress"
                                ? "Đang khám"
                                : "Chờ khám"
                            }
                            dot
                          />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right: Active Doctors & Active Template (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="base-card p-5 space-y-3 rounded-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--base-border-opaque)]">
              <h3 className="text-xs font-bold text-gray-900">Nhân sự phụ trách lâm sàng</h3>
              <Link to="/admin/users" className="text-xs font-bold text-[var(--base-brand-blue)] hover:underline">
                Quản lý
              </Link>
            </div>

            <div className="space-y-2">
              {staffs.slice(0, 5).map((st) => {
                const nameParts = String(st.full_name || "NV").trim().split(/\s+/);
                const initials =
                  nameParts.length >= 2
                    ? `${nameParts[0][0]}${nameParts[nameParts.length - 1][0]}`.toUpperCase()
                    : String(st.full_name || "NV").slice(0, 2).toUpperCase();
                const subtitle = [
                  st.specialty || (Number(st.role_id) === 2 ? "Bác sĩ lâm sàng" : "Điều dưỡng lâm sàng"),
                  st.room_name,
                ]
                  .filter(Boolean)
                  .join(" • ");
                return (
                  <div key={st.user_id} className="base-staff-row">
                    <div className="base-staff-avatar rounded-full">{initials}</div>
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-bold text-gray-900 truncate">{st.full_name}</p>
                      <p className="text-xs text-gray-500 truncate">{subtitle}</p>
                    </div>
                    <span className="base-staff-online"></span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="base-card p-5 space-y-3 rounded-2xl">
            <h3 className="text-xs font-bold text-gray-900">Mẫu phiếu đang kích hoạt</h3>
            {activeTemplate ? (
              <div className="p-3 rounded-2xl bg-[var(--base-bg-surface-alt)] border border-[var(--base-border-opaque)] text-xs space-y-1">
                <div className="font-bold text-gray-900">{activeTemplate.name}</div>
                <div className="text-xs text-gray-500">
                  {(activeTemplate.sections_count ?? activeTemplate.sections?.length ?? 0)} phân mục •{" "}
                  {(activeTemplate.questions_count ??
                    (Array.isArray(activeTemplate.sections)
                      ? activeTemplate.sections.reduce((acc, s) => acc + (s.questions?.length || 0), 0)
                      : 0))}{" "}
                  câu hỏi • v{activeTemplate.version || "1.0"}
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-400">Đang nạp thông tin mẫu phiếu...</div>
            )}
            <Link
              to="/admin/form-builder"
              className="base-btn base-btn-primary base-btn-sm w-full text-xs font-bold justify-center"
            >
              <span>Bộ tạo mẫu phiếu khám</span>
              <span className="isax icon-arrow-right-1 text-xs"></span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
