import { useState, useRef, useEffect } from "react";
import { Link, NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../services/apiClient";

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}") || {};
  } catch {
    return {};
  }
}

function formatNotifTime(iso) {
  if (!iso) return "Vừa xong";
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} giờ trước`;
  return new Date(iso).toLocaleDateString("vi-VN");
}

export default function PatientLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getStoredUser();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    document.documentElement.setAttribute("data-density", "patient");
    return () => document.documentElement.removeAttribute("data-density");
  }, []);

  const userDropdownRef = useRef(null);
  const notifDropdownRef = useRef(null);

  const handleLogout = async () => {
    await apiClient.post("/auth/logout").catch(() => {});
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();
    toast.success("Đã đăng xuất tài khoản bệnh nhân");
    navigate("/login");
  };

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/notifications", { silent: true })
      .then((res) => {
        if (cancelled) return;
        const rawList = Array.isArray(res.data) ? res.data : res.data?.items || [];
        const items = rawList.map((n) => ({
          id: n.id,
          title: n.title,
          desc: n.body || n.message,
          time: formatNotifTime(n.created_at),
          unread: !(String(n.is_read) === "1" || n.is_read === true),
          icon:
            n.type === "UAS7"
              ? "icon-clock"
              : n.type === "PRESCRIPTION" || n.type === "VISIT_COMPLETED"
              ? "icon-health"
              : "icon-notification",
          link:
            n.type === "UAS7"
              ? "/patient/uas7"
              : n.type === "LESION"
              ? "/patient/lesions"
              : "/patient/profile",
        }));
        setNotifications(items);
        const unread = res.data?.unread_count !== undefined
          ? Number(res.data.unread_count)
          : items.filter((i) => i.unread).length;
        setUnreadCount(unread);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const handleMarkAllRead = async () => {
    await apiClient.put("/notifications/read-all", {}, { silent: true }).catch(() => {});
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    setUnreadCount(0);
    toast.success("Đã đánh dấu đọc tất cả thông báo");
    setNotifDropdownOpen(false);
  };

  const handleClickNotif = (n) => {
    if (n.unread) {
      apiClient.put(`/notifications/${n.id}/read`, {}, { silent: true }).catch(() => {});
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setNotifDropdownOpen(false);
  };

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
      if (notifDropdownRef.current && !notifDropdownRef.current.contains(event.target)) {
        setNotifDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setUserDropdownOpen(false);
    setNotifDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Primary navigation aligned with Figma design node 22:639
  const mainNav = [
    { name: "Trang chủ", path: "/patient", icon: "icon-home-2" },
    { name: "Thông báo", path: "/patient/notifications", icon: "icon-notification", badge: unreadCount },
    { name: "Khảo sát lâm sàng", path: "/patient/screening", icon: "icon-edit-2" },
    { name: "Nhật ký theo dõi", path: "/patient/uas7", icon: "icon-task-square" },
    { name: "Hồ sơ của bạn", path: "/patient/profile", icon: "icon-user" },
  ];

  return (
    <div className="flex h-screen bg-[#eff2fa] font-sans antialiased overflow-hidden text-[16px]">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Bệnh Nhân — Drawer trên mobile (<768px), cố định 272px trên desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[272px] bg-[#091f5b] text-white flex-col justify-between shrink-0 border-r border-white/10 transition-transform duration-200 md:static md:flex md:translate-x-0 md:z-20 ${
          mobileMenuOpen ? "flex translate-x-0" : "hidden -translate-x-full"
        }`}
      >
        <div>
          {/* Logo Header */}
          <div className="h-[76px] px-6 border-b border-white/10 flex items-center justify-between">
            <Link to="/patient" className="flex items-center gap-3">
              <img
                src="/images/logo/drmayday-logo-white-figma.png"
                alt="DrMayDay"
                className="h-10 w-auto object-contain"
                onError={(e) => {
                  e.target.src = "/images/logo/drmayday-logo-white.png";
                }}
              />
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="md:hidden h-10 w-10 rounded-lg text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center cursor-pointer"
              aria-label="Đóng menu"
            >
              <span className="isax icon-close-circle text-xl"></span>
            </button>
          </div>

          {/* Navigation Links */}
          <div className="p-4 space-y-2">
            <nav className="space-y-1">
              {mainNav.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/patient"}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-4 py-2.5 rounded-lg text-[15px] transition-colors cursor-pointer ${
                      isActive
                        ? "bg-[rgba(239,242,250,0.14)] text-white font-semibold"
                        : "text-white/80 hover:text-white hover:bg-white/5 font-medium"
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className={`isax ${item.icon} text-xl`}></span>
                    <span>{item.name}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="h-5 px-1.5 rounded-full bg-blue-500 text-white text-xs font-mono font-bold flex items-center justify-center">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}

              {/* Đường viền nét đứt phân cách khu vực tiện ích */}
              <div className="pt-3 mt-3 border-t border-dashed border-white/20 space-y-1">
                {/* Báo Động Đỏ Khẩn Cấp */}
                <NavLink
                  to="/emergency-triage"
                  className={({ isActive }) =>
                    `flex items-center justify-between px-4 py-2.5 rounded-lg text-[15px] font-bold transition-colors cursor-pointer ${
                      isActive
                        ? "bg-rose-600 text-white"
                        : "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 hover:text-white"
                    }`
                  }
                >
                  <div className="flex items-center gap-3">
                    <span className="isax-b icon-danger text-xl text-rose-400"></span>
                    <span>Sàng lọc phản vệ</span>
                  </div>
                  <span className="h-5 px-1.5 rounded-full bg-rose-600 text-white text-xs font-mono font-bold flex items-center justify-center">
                    115
                  </span>
                </NavLink>
              </div>
            </nav>
          </div>
        </div>

        {/* Sidebar Footer: Hotline Hỗ Trợ Y Tế 1900 6951 (Figma 26:1181) */}
        <div className="p-5 border-t border-white/10 flex items-center gap-3 bg-black/10">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0">
            <span className="isax-b icon-call text-xl"></span>
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-medium tracking-wide text-white/70">
              Liên hệ hỗ trợ y tế
            </span>
            <strong className="text-xl font-bold font-mono text-white tracking-tight">
              1900 6951
            </strong>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Top Header — Chuẩn Figma 28:1186: White bg, h-[76px], border-b #eff2fa */}
        <header className="h-[76px] border-b border-[#eff2fa] bg-white px-4 sm:px-8 flex items-center justify-between gap-2 shrink-0 z-30">
          {/* Mobile Menu + Institutional Identifier */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden h-11 w-11 rounded-lg border border-slate-200 text-[#091F5B] flex items-center justify-center shrink-0 cursor-pointer"
              aria-label="Mở menu điều hướng"
            >
              <span className="isax icon-menu text-xl"></span>
            </button>
            <span className="isax icon-hospital text-xl text-[#091F5B] hidden sm:inline-block shrink-0"></span>
            <span className="font-bold text-[#091F5B] text-sm sm:text-base tracking-tight truncate">
              Bệnh viện Da liễu Trung ương
            </span>
          </div>

          {/* Right Header Actions: Persistent Emergency Button + User Account Dropdown */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              to="/emergency-triage"
              className="inline-flex items-center gap-1.5 px-3 sm:px-4 min-h-[44px] rounded-full bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs sm:text-sm font-bold transition-colors shrink-0"
              title="Sàng lọc phản vệ khẩn cấp & Cấp cứu 115"
            >
              <span className="isax-b icon-danger text-base"></span>
              <span className="hidden sm:inline">Cấp cứu</span>
              <span>115</span>
            </Link>

            {/* User Account Drop Box (Figma 28:1255) */}
            <div className="relative" ref={userDropdownRef}>
              <button
                type="button"
                aria-label="Tài khoản người dùng"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-3 p-1.5 pr-3.5 rounded-full border border-[#dde3ec] hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="h-9 w-9 rounded-full bg-[#eef1f6] text-[#091F5B] flex items-center justify-center font-bold shrink-0">
                  <span className="isax-b icon-user text-xl"></span>
                </div>
                <div className="text-left text-xs leading-tight hidden sm:block">
                  <p className="font-bold text-[#091F5B] text-sm">{currentUser.full_name || "Nguyễn Thị Mai"}</p>
                  <span className="text-xs font-medium text-[#718096]">Bệnh nhân</span>
                </div>
                <span
                  className={`isax icon-arrow-down-1 text-xs text-[#718096] transition-transform duration-200 ${
                    userDropdownOpen ? "rotate-180" : ""
                  }`}
                ></span>
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-md border border-[#dde3ec] p-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                  <div className="p-3 bg-gray-50 rounded-lg mb-1">
                    <p className="text-xs font-bold text-gray-900 leading-snug">
                      {currentUser.full_name || "Nguyễn Thị Mai"}
                    </p>
                    <span className="base-tag base-tag-positive text-xs mt-1 inline-block rounded">
                      Bệnh Nhân Ngoại Trú
                    </span>
                    <p className="text-xs font-mono text-gray-500 mt-1">{currentUser.phone || "0912 345 678"}</p>
                  </div>

                  <div className="space-y-0.5">
                    <Link
                      to="/patient"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
                    >
                      <span className="isax icon-home-2 text-base text-[#173a7d]"></span>
                      <span>Trang chủ điều trị</span>
                    </Link>

                    <Link
                      to="/patient/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
                    >
                      <span className="isax icon-user text-base text-[#173a7d]"></span>
                      <span>Hồ sơ bệnh nhân &amp; BHYT</span>
                    </Link>

                    <Link
                      to="/patient/uas7"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
                    >
                      <span className="isax icon-chart text-base text-[#173a7d]"></span>
                      <span>Nhật ký hoạt tính bệnh</span>
                    </Link>
                  </div>

                  <div className="my-1.5 border-t border-[#dde3ec]"></div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer text-left"
                  >
                    <span className="isax icon-logout text-base"></span>
                    <span>Đăng Xuất Tài Khoản</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Viewport (bg #EFF2FA, padding 24px) */}
        <main className="flex-1 overflow-y-auto p-6 bg-[#eff2fa]">
          <div className="max-w-[1200px] mx-auto w-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
