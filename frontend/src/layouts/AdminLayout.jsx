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

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getStoredUser();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [topologyBadge, setTopologyBadge] = useState(null);
  const [templateBadge, setTemplateBadge] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-density", "clinician");
    return () => document.documentElement.removeAttribute("data-density");
  }, []);

  const userDropdownRef = useRef(null);

  const handleLogout = async () => {
    await apiClient.post("/auth/logout").catch(() => {});
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    sessionStorage.clear();
    toast.success("Đã đăng xuất tài khoản quản trị");
    navigate("/login");
  };

  useEffect(() => {
    let cancelled = false;
    apiClient
      .get("/notifications", { silent: true })
      .then((res) => {
        if (cancelled) return;
        const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
        const unread = res.data?.unread_count !== undefined
          ? Number(res.data.unread_count)
          : list.filter((n) => String(n.is_read) === "0" || n.is_read === false).length;
        setUnreadCount(unread);
      })
      .catch(() => {});

    Promise.all([
      apiClient.get("/branches", { silent: true }).catch(() => null),
      apiClient.get("/templates/all", { silent: true }).catch(() => null),
    ]).then(([bRes, tRes]) => {
      if (cancelled) return;
      if (Array.isArray(bRes?.data)) setTopologyBadge(bRes.data.length);
      if (Array.isArray(tRes?.data)) setTemplateBadge(tRes.data.length);
    });

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const adminNav = [
    {
      name: "Bảng điều khiển chỉ số",
      path: "/admin",
      icon: "icon-element-plus",
    },
    {
      name: "Thông báo",
      path: "/admin/notifications",
      icon: "icon-notification",
      badge: unreadCount,
    },
    {
      name: "Hạ tầng cơ sở y tế",
      path: "/admin/topology",
      icon: "icon-buildings",
      badge: topologyBadge,
    },
    {
      name: "Danh bạ nhân sự & quyền",
      path: "/admin/users",
      icon: "icon-profile-2user",
    },
    {
      name: "Trình tạo biểu mẫu khám",
      path: "/admin/form-builder",
      icon: "icon-document-text",
      badge: templateBadge,
    },
  ];

  return (
    <div className="flex h-screen bg-[#eff2fa] font-sans antialiased overflow-hidden">
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-950/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Quản Trị — Drawer trên mobile (<768px), cố định 272px trên desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[272px] bg-[#091f5b] text-white flex-col justify-between shrink-0 border-r border-white/10 transition-transform duration-200 md:static md:flex md:translate-x-0 md:z-20 ${
          mobileMenuOpen ? "flex translate-x-0" : "hidden -translate-x-full"
        }`}
      >
        <div>
          {/* Logo Header */}
          <div className="h-[76px] px-6 border-b border-white/10 flex items-center justify-between">
            <Link to="/admin" className="flex items-center gap-3">
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
              {adminNav.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === "/admin"}
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
                  {item.badge !== undefined && item.badge !== null && item.badge > 0 && (
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

        {/* Sidebar Footer: Hotline Hỗ Trợ Y Tế 1900 6951 */}
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
        {/* Top Header — Đồng bộ chuẩn Figma 28:1186: White bg, h-[76px], border-b #eff2fa */}
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

          {/* Right Header Actions: User Account Dropdown (Không icon thông báo ở topbar) */}
          <div className="flex items-center gap-4">
            <div className="relative" ref={userDropdownRef}>
              <button
                type="button"
                aria-label="Tài khoản người dùng"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-3 p-1.5 pr-3.5 rounded-full border border-[#dde3ec] hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <div className="h-9 w-9 rounded-full bg-[#eef1f6] text-[#091F5B] flex items-center justify-center text-lg font-bold shrink-0">
                  <span className="isax-b icon-user text-xl"></span>
                </div>
                <div className="text-left text-xs leading-tight hidden sm:block">
                  <p className="font-bold text-[#091F5B] text-sm">
                    {currentUser.full_name || "Quản Trị Viên Hệ Thống"}
                  </p>
                  <span className="text-xs font-medium text-[#718096]">Quản trị viên</span>
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
                      {currentUser.full_name || "Quản Trị Viên Hệ Thống"}
                    </p>
                    <span className="base-tag base-tag-info text-xs mt-1 inline-block rounded">
                      Quản Trị Hệ Thống
                    </span>
                    <p className="text-xs font-mono text-gray-500 mt-1">
                      {currentUser.phone || "—"}
                    </p>
                  </div>

                  <div className="space-y-0.5">
                    <Link
                      to="/admin"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
                    >
                      <span className="isax icon-element-plus text-base text-[#091F5B]"></span>
                      <span>Bảng điều khiển chỉ số</span>
                    </Link>

                    <Link
                      to="/admin/topology"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
                    >
                      <span className="isax icon-buildings text-base text-[#091F5B]"></span>
                      <span>Hạ tầng cơ sở y tế</span>
                    </Link>

                    <Link
                      to="/admin/notifications"
                      onClick={() => setUserDropdownOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition"
                    >
                      <span className="isax icon-notification text-base text-[#091F5B]"></span>
                      <span>Thông báo hệ thống</span>
                    </Link>
                  </div>

                  <div className="my-1.5 border-t border-[#dde3ec]"></div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 transition cursor-pointer text-left"
                  >
                    <span className="isax icon-logout text-base"></span>
                    <span>Đăng Xuất Quản Trị</span>
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
