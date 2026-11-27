import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";

const DEMO_ACCOUNTS = {
  patient: {
    role: "patient",
    title: "Bệnh Nhân",
    phone: "0912 345 678",
    cleanPhone: "0912345678",
    password: "Patient@123",
    icon: "isax icon-user",
    activeIcon: "isax-b icon-user",
    note: "Bệnh nhân theo dõi mày đay (CSDL thật)",
  },
  doctor: {
    role: "doctor",
    title: "Bác Sĩ",
    phone: "0901 000 002",
    cleanPhone: "0901000002",
    password: "Doctor@123",
    icon: "isax icon-health",
    activeIcon: "isax-b icon-health",
    note: "Bác Sĩ Test (Chuyên khoa Da liễu)",
  },
  admin: {
    role: "admin",
    title: "Quản Trị",
    phone: "0900 000 001",
    cleanPhone: "0900000001",
    password: "Admin@123",
    icon: "isax icon-shield-tick",
    activeIcon: "isax-b icon-shield-tick",
    note: "Quản Trị Viên Hệ Thống (Toàn quyền quản trị)",
  },
};

export default function LoginPage() {
  const [role, setRole] = useState("patient");
  const [phone, setPhone] = useState(DEMO_ACCOUNTS.patient.phone);
  const [password, setPassword] = useState(DEMO_ACCOUNTS.patient.password);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const selectRole = (key) => {
    const acc = DEMO_ACCOUNTS[key];
    if (!acc) return;
    setRole(key);
    setPhone(acc.phone);
    setPassword(acc.password);
    toast.success(`Đã ghim tài khoản ${acc.title}: ${acc.phone}`, {
      id: "pin-account-toast",
      duration: 2000,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\s+/g, "").trim();
    if (!cleanPhone || !password) {
      toast.error("Vui lòng nhập đầy đủ Số điện thoại và Mật khẩu!");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiClient.post("/auth/login", {
        phone: cleanPhone,
        password,
      });
      const { token, user_info, user } = res.data || {};
      const finalUser = user_info || user || {};
      const roleId = Number(finalUser?.role_id);
      const mappedRole =
        finalUser?.role_name === "admin" || roleId === 1
          ? "admin"
          : finalUser?.role_name === "bac_si" || finalUser?.role_name === "dieu_duong" || roleId === 2 || roleId === 3
          ? "doctor"
          : "patient";

      localStorage.setItem("token", token);
      localStorage.setItem(
        "user",
        JSON.stringify({
          ...finalUser,
          role: mappedRole,
        })
      );
      toast.success(`Xin chào ${finalUser?.full_name || cleanPhone}!`);

      if (mappedRole === "admin") navigate("/admin");
      else if (mappedRole === "doctor") navigate("/doctor");
      else navigate("/patient");
    } catch {
      // Error toast already handled by apiClient interceptor
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mobile Branding Header */}
      <div className="lg:hidden flex items-center gap-3 mb-6">
        <img
          src="/images/logo/drmayday-logo.png"
          alt="DrMayDay"
          className="h-10 w-auto object-contain"
        />
      </div>

      <div>
        <h2 className="text-2xl font-bold text-[var(--base-brand-navy)] tracking-tight">Đăng nhập</h2>
      </div>

      {/* Role Selector Pill Tabs with Pinned Credentials */}
      <div className="space-y-2">
        <div className="p-1 rounded-2xl bg-[var(--base-bg-surface-alt)] border border-[var(--base-border-opaque)] grid grid-cols-3 gap-1">
          {Object.entries(DEMO_ACCOUNTS).map(([key, item]) => {
            const isSelected = role === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => selectRole(key)}
                className={`py-2 px-1 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                  isSelected
                    ? "bg-white text-[var(--base-brand-navy)] border border-[var(--base-border-opaque)]"
                    : "text-[var(--base-content-secondary)] hover:text-gray-900"
                }`}
                title={`Ghim tài khoản ${item.title}: ${item.phone}`}
              >
                <span className={`${isSelected ? item.activeIcon : item.icon} text-sm`}></span>
                <span>{item.title}</span>
              </button>
            );
          })}
        </div>

        {/* Pinned Account Hint Card */}
        <div className="px-3.5 py-2.5 rounded-2xl bg-[var(--base-bg-surface-alt)] border border-[var(--base-border-subtle)] flex flex-wrap items-center justify-between gap-2 text-xs transition-all">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--base-brand-navy)] text-white flex items-center justify-center">
              <span className="isax-b icon-key text-xs"></span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-[var(--base-content-primary)] break-words">
                {DEMO_ACCOUNTS[role]?.title}: <span className="font-mono text-[var(--base-brand-blue)] whitespace-nowrap">{DEMO_ACCOUNTS[role]?.phone}</span>
              </p>
              <p className="text-xs text-[var(--base-content-tertiary)] break-words">
                {DEMO_ACCOUNTS[role]?.note}
              </p>
            </div>
          </div>
          <div className="flex-shrink-0 text-right">
            <span className="inline-block px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Pass: {DEMO_ACCOUNTS[role]?.password}
            </span>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
            Số điện thoại
          </label>
          <div className="relative">
            <span className="isax icon-call text-base absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--base-content-tertiary)]"></span>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0912 345 678"
              className="base-input !pl-10 text-xs rounded-2xl"
              required
            />
          </div>
        </div>

        <div>
          <label className="base-label-sm text-[var(--base-content-secondary)] block mb-1">
            Mật khẩu
          </label>
          <div className="relative">
            <span className="isax icon-lock text-base absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--base-content-tertiary)]"></span>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="base-input !pl-10 !pr-10 text-xs rounded-2xl"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--base-content-tertiary)] hover:text-gray-900 cursor-pointer"
            >
              <span className={`isax ${showPassword ? "icon-eye" : "icon-eye-slash"} text-base`}></span>
            </button>
          </div>
          <div className="flex justify-end mt-2">
            <Link
              to="/forgot-password"
              className="text-xs text-[var(--base-brand-blue)] hover:underline"
            >
              Quên mật khẩu?
            </Link>
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="base-btn base-btn-primary w-full py-3 text-xs font-bold justify-center cursor-pointer mt-2 disabled:opacity-60"
        >
          <span>{submitting ? "Đang xác thực..." : "Đăng nhập"}</span>
        </button>
      </form>

      <div className="pt-3 border-t border-[var(--base-border-opaque)] text-center text-xs text-[var(--base-content-secondary)]">
        Chưa có hồ sơ bệnh nhân?{" "}
        <Link to="/register" className="text-[var(--base-brand-blue)] font-bold hover:underline">
          Đăng ký hồ sơ khám mới
        </Link>
      </div>
    </div>
  );
}
