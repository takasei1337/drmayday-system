import { Outlet, useLocation } from "react-router-dom";

export default function AuthLayout() {
  const location = useLocation();
  const isRegister = location.pathname.includes("register");

  return (
    <div className="min-h-screen flex bg-[#f3f6fc] font-sans antialiased">
      {/* Left Column: High-contrast Dark Clinical Branding (#091F5B) */}
      <div
        className={`hidden lg:flex ${
          isRegister ? "lg:w-5/12" : "lg:w-1/2"
        } min-h-screen bg-[var(--base-brand-navy)] flex-col justify-center p-12 text-white relative overflow-hidden border-r border-[#06143d] shrink-0 sticky top-0 h-screen`}
      >
        {/* Clinical Photography Background with Dark Overlay */}
        <div className="absolute inset-0 z-0 pointer-events-none select-none">
          <img
            src="/images/clinic/clinic-consultation-01.jpg"
            alt="DrMayDay"
            className="w-full h-full object-cover object-center opacity-25 filter brightness-90 contrast-105"
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
          <div className="absolute inset-0 bg-[#091F5B]/85"></div>
        </div>

        {/* Minimal Branding: Centered Large Logo & Subtitle */}
        <div className="relative z-10 w-full flex flex-col items-center justify-center text-center px-6">
          <div className="flex items-center justify-center mb-5">
            <img
              src="/images/logo/drmayday-logo-white.png"
              alt="DrMayDay"
              className="h-24 xl:h-28 w-auto object-contain mx-auto"
              onError={(e) => {
                e.target.style.display = "none";
                e.target.nextSibling.style.display = "block";
              }}
            />
            <div className="hidden font-bold text-3xl text-white">DrMayDay</div>
          </div>

          <h1 className="text-base xl:text-lg font-medium text-white/90 tracking-normal text-center">
            Hệ thống quản lý lâm sàng MayDay
          </h1>
        </div>
      </div>

      {/* Right Column: Auth Form with graceful scrolling */}
      <div className="flex-1 min-h-screen flex flex-col items-center justify-start p-6 sm:p-12 overflow-y-auto bg-[#f3f6fc]">
        <div className={`w-full my-auto ${isRegister ? "max-w-2xl py-8" : "max-w-md py-6"}`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}
