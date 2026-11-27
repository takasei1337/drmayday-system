import { Link } from "react-router-dom";

function getBackTarget() {
  try {
    const token = localStorage.getItem("token");
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    if (!token) return { to: "/login", label: "Về Trang Đăng Nhập" };
    const roleId = Number(user?.role_id);
    if (roleId === 1) return { to: "/admin", label: "Về Trang Quản Trị" };
    if (roleId === 2 || roleId === 3) return { to: "/doctor", label: "Về Trang Bác Sĩ" };
    return { to: "/patient", label: "Về Trang Bệnh Nhân" };
  } catch {
    return { to: "/login", label: "Về Trang Đăng Nhập" };
  }
}

export default function NotFound() {
  const target = getBackTarget();
  return (
    <div className="min-h-screen bg-[var(--base-bg-canvas)] flex flex-col items-center justify-center p-6 text-center antialiased">
      <div className="base-card p-10 max-w-md w-full border border-[var(--base-border-opaque)] flex flex-col items-center">
        <div className="h-20 w-20 rounded-lg bg-[rgba(59,99,168,0.12)] text-[var(--base-brand-navy)] flex items-center justify-center mb-6">
          <span className="isax-b icon-danger text-4xl"></span>
        </div>
        <span className="base-tag base-tag-warning font-mono text-xs mb-3">MÃ LỖI 404</span>
        <h1 className="text-2xl font-bold text-[var(--base-content-primary)] tracking-tight">Trang Không Tồn Tại</h1>
        <p className="text-xs text-[var(--base-content-secondary)] mt-2 leading-relaxed">
          Đường dẫn bạn yêu cầu không nằm trong danh mục phân hệ của Bệnh viện Da liễu Trung ương.
        </p>
        <Link
          to={target.to}
          className="base-btn base-btn-primary w-full mt-6 justify-center"
        >
          <span className="isax icon-home-2 text-base"></span>
          <span>{target.label}</span>
        </Link>
      </div>
    </div>
  );
}
