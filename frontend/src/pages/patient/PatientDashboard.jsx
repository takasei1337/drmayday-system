import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import apiClient from "../../services/apiClient";
import { getUas7Band, getDailyUasBand } from "../../utils/uas7";
import { StatusBadge } from "../../components/ui";

export default function PatientDashboard() {
  const storedUser = (() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  })();

  const [fullName, setFullName] = useState(storedUser.full_name || "Nguyễn Thị Mai");
  const [records, setRecords] = useState([]);
  const [scores, setScores] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const profRes = await apiClient
          .get("/profile", { silent: true })
          .catch(() => ({ data: {} }));
        const prof = profRes.data || {};
        const uid = prof.user_id || storedUser.user_id;
        if (!cancelled && prof.full_name) {
          setFullName(prof.full_name);
        }

        if (uid) {
          const [histRes, uasRes] = await Promise.all([
            apiClient
              .get(`/medical_records/patients/${uid}/history`, { silent: true })
              .catch(() => ({ data: [] })),
            apiClient
              .get(`/uas7-scores/patient/${uid}`, { silent: true })
              .catch(() => ({ data: [] })),
          ]);

          if (cancelled) return;

          const recList = Array.isArray(histRes.data) ? histRes.data : [];
          setRecords(recList);

          const rawScores = Array.isArray(uasRes.data) ? uasRes.data : [];
          const normalized = rawScores
            .map((s) => ({
              score_date: String(s.score_date || "").slice(0, 10),
              daily_score: Number(s.daily_score || 0),
              hss7: Number(s.hss7 || 0),
              iss7: Number(s.iss7 || 0),
            }))
            .sort((a, b) => a.score_date.localeCompare(b.score_date))
            .slice(-7);

          setScores(normalized);
        }
      } catch {
        // Fallback gracefully
      }
    }

    loadDashboard();
    return () => {
      cancelled = true;
    };
  }, [storedUser.user_id]);

  const todayScore = scores.length > 0 ? scores[scores.length - 1] : null;
  const recentRecord = records.length > 0 ? records[0] : null;

  // UAS7 calculation
  const weeklyTotal = scores.length > 0 ? scores.reduce((sum, s) => sum + s.daily_score, 0) : 0;

  // Calculate 7-day range label
  const todayFormatted = new Date().toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const todayShortDate = new Date().toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const getWeekRange = () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
  };

  const getSeverity = (score) => {
    const b = getUas7Band(score);
    return {
      label: b.label,
      tagClass: `base-tag ${b.tagClass}`,
    };
  };

  const getBarHeight = (daily) => {
    return Math.max(15, Math.round((daily / 6) * 100));
  };

  const getRecordStatusBadge = (status) => {
    if (status === "completed") {
      return { label: "Đã chốt bệnh án", tagClass: "base-tag base-tag-positive" };
    }
    if (status === "in_progress") {
      return { label: "Đang khám lâm sàng", tagClass: "base-tag base-tag-info" };
    }
    return { label: "Đang chờ khám", tagClass: "base-tag base-tag-warning" };
  };

  const currentSeverity = getSeverity(weeklyTotal);

  return (
    <div className="space-y-5">
      {/* 1. Header Banner */}
      <div className="relative rounded-lg overflow-hidden flex items-center p-6 sm:p-7 border border-[var(--color-border-default)] bg-[#091F5B]">
        {/* Background Image & Subtle Overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/clinic/patient-hero-banner.png"
            alt="DrMayDay Consultation"
            className="w-full h-full object-cover object-right opacity-30 mix-blend-luminosity"
            onError={(e) => {
              e.target.src = "/images/clinic/clinic-consultation-01.jpg";
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage:
                "linear-gradient(90deg, #091F5B 35%, rgba(9, 31, 91, 0.85) 70%, rgba(9, 31, 91, 0.4) 100%)",
            }}
          />
        </div>

        {/* Content On Top */}
        <div className="relative z-10 flex flex-col gap-2 max-w-xl text-white">
          <div className="space-y-0.5">
            <p className="text-xs font-medium text-white/70 tracking-wide">
              Cổng bệnh nhân ngoại trú • DR. MAYDAY
            </p>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {fullName}
            </h1>
          </div>
          <div className="flex items-center gap-2 text-white/80 text-xs font-normal">
            <span className="isax icon-calendar text-sm text-white/70"></span>
            <span>{todayFormatted}</span>
          </div>
        </div>
      </div>

      {/* 2. Thẻ "Tổng quan sức khỏe" */}
      <div className="bg-white border border-[var(--color-border-default)] rounded-lg p-5 space-y-4">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-3 border-b border-[var(--color-border-default)]">
          <h2 className="text-base font-bold text-[var(--color-primary-600)] tracking-tight">
            Tổng quan sức khỏe
          </h2>
          <Link
            to="/patient/uas7"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] transition-colors cursor-pointer"
          >
            <span>Chi tiết nhật ký</span>
            <span className="isax icon-arrow-right-1 text-xs"></span>
          </Link>
        </div>

        {/* 3 KPI Stat Cards Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Card 1: CHỈ SỐ UAS (Hôm nay) */}
          <div className="bg-white border border-[var(--color-border-default)] rounded-lg p-4 flex flex-col justify-between transition-colors">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <div className="flex items-center gap-1.5">
                  <span className="isax icon-chart-2 text-sm text-[var(--color-primary-600)]"></span>
                  <span className="font-semibold text-gray-700 text-xs">
                    Chỉ số UAS hôm nay
                  </span>
                </div>
                <span className="text-xs text-[var(--color-text-muted)] font-mono">
                  {todayShortDate}
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-[var(--color-primary-600)] pt-0.5">
                {todayScore ? `${todayScore.daily_score}` : "—"} <span className="text-xs font-normal text-gray-400">/ 6 điểm</span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3">
              <span className="base-tag base-tag-info font-mono">
                HSS: <strong>{todayScore ? todayScore.hss7 : "—"}</strong>/3
              </span>
              <span className="base-tag base-tag-info font-mono">
                ISS: <strong>{todayScore ? todayScore.iss7 : "—"}</strong>/3
              </span>
            </div>
          </div>

          {/* Card 2: CHỈ SỐ UAS TUẦN */}
          <div className="bg-white border border-[var(--color-border-default)] rounded-lg p-4 flex flex-col justify-between transition-colors">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-[var(--color-text-muted)]">
                <div className="flex items-center gap-1.5">
                  <span className="isax icon-chart-success text-sm text-[var(--color-primary-600)]"></span>
                  <span className="font-semibold text-gray-700 text-xs">
                    UAS7 tích lũy tuần
                  </span>
                </div>
                <span className="text-xs text-[var(--color-text-muted)] font-mono">
                  {getWeekRange()}
                </span>
              </div>
              <div className="text-2xl font-bold font-mono text-[var(--color-primary-600)] pt-0.5">
                {scores.length > 0 ? weeklyTotal : "—"} <span className="text-xs font-normal text-gray-400">/ 42 điểm</span>
              </div>
            </div>

            <div className="pt-3">
              <span className={scores.length > 0 ? currentSeverity.tagClass : "base-tag base-tag-neutral"}>
                {scores.length > 0 ? currentSeverity.label : "Chưa có dữ liệu 7 ngày"}
              </span>
            </div>
          </div>

          {/* Card 3: BỆNH ÁN GẦN NHẤT */}
          <div className="bg-white border border-[var(--color-border-default)] rounded-lg p-4 flex flex-col justify-between transition-colors">
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-gray-700">
                Bệnh án gần nhất
              </div>
              <div className="text-xl font-bold font-mono text-[var(--color-primary-600)]">
                {recentRecord?.record_code || "BA-2026-0006"}
              </div>
              <p className="text-xs text-[var(--color-text-muted)] line-clamp-1">
                {recentRecord?.diagnosis ||
                  "Mày đay mạn tính tự phát (CSU)"}
              </p>
            </div>

            <div className="pt-3">
              <StatusBadge
                variant={
                  (recentRecord?.status || "in_progress") === "completed"
                    ? "completed"
                    : (recentRecord?.status || "in_progress") === "in_progress"
                    ? "in_progress"
                    : "pending"
                }
                label={getRecordStatusBadge(recentRecord?.status || "in_progress").label}
                dot
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. CẢNH BÁO BÁO ĐỘNG ĐỎ TRONG 30S (Unified Clinical Alert) */}
      <div className="p-4 rounded-lg bg-white border border-[var(--color-border-default)] border-l-4 border-l-rose-600 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-start sm:items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
            <span className="isax-b icon-danger text-xl"></span>
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-gray-900">
              Sàng lọc dấu hiệu phản vệ cấp cứu trong 30 giây
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Nếu khó thở, sưng họng hoặc choáng ngất, kích hoạt Báo động đỏ ngay để gọi 115.
            </p>
          </div>
        </div>
        <Link
          to="/emergency-triage"
          className="base-btn base-btn-danger base-btn-sm shrink-0 self-start sm:self-auto text-xs font-bold px-3.5 py-2"
        >
          <span className="isax-b icon-danger text-sm"></span>
          <span>Báo động đỏ (115)</span>
        </Link>
      </div>

      {/* 4. BIỂU ĐỒ DIỄN TIẾN ĐIỂM UAS7 7 NGÀY */}
      <div className="bg-white border border-[var(--color-border-default)] rounded-lg p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--color-border-default)]">
          <h2 className="text-base font-bold text-[var(--color-primary-600)]">
            Diễn tiến điểm UAS 7 ngày gần nhất
          </h2>
          <div className="flex items-center gap-3 text-xs flex-wrap text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#0F766E]"></span> 0 (Sạch bệnh)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#15803D]"></span> 1 (Kiểm soát tốt)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#0369A1]"></span> 2 (Nhẹ)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#B45309]"></span> 3–4 (Trung bình)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#DC2626]"></span> 5–6 (Nặng)
            </span>
          </div>
        </div>

        <div className="pt-4">
          {scores.length === 0 ? (
            <div className="p-6 text-center text-xs text-[var(--color-text-muted)] bg-[var(--color-neutral-50)] rounded-lg border border-[var(--color-border-default)]">
              Chưa có dữ liệu điểm tuần này. Hãy bấm{" "}
              <Link to="/patient/uas7" className="text-[var(--color-primary-600)] font-bold underline">
                Chấm điểm UAS7
              </Link>{" "}
              để cập nhật tình trạng hôm nay!
            </div>
          ) : (
            <div className="flex items-end gap-2 h-36 pt-4 px-4 bg-[var(--color-neutral-50)] rounded-lg border border-[var(--color-border-default)]">
              {scores.map((s) => {
                const dailyBand = getDailyUasBand(s.daily_score);
                return (
                <div
                  key={s.score_date}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end cursor-pointer"
                  title={`Ngày ${s.score_date}: ${s.daily_score} / 6 điểm (${dailyBand.label})`}
                >
                  <div className="font-mono text-xs font-bold text-[var(--color-primary-600)]">
                    {s.daily_score}
                  </div>
                  <div
                    className="w-full max-w-[40px] rounded-t-sm"
                    style={{
                      height: `${getBarHeight(s.daily_score)}%`,
                      backgroundColor: dailyBand.barColor,
                    }}
                  ></div>
                  <div className="font-mono text-xs text-[var(--color-text-muted)] text-center">
                    {s.score_date.slice(5)}
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 5. PHÂN HỆ CHỨC NĂNG LÂM SÀNG */}
      <div>
        <h2 className="text-sm font-bold text-gray-900 mb-3">
          Chức năng theo dõi
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            to="/patient/uas7"
            className="bg-white border border-[var(--color-border-default)] rounded-lg p-4 flex items-center justify-between gap-3 group hover:border-[var(--base-brand-navy)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[var(--color-primary-50)] flex items-center justify-center text-[var(--color-primary-600)] shrink-0">
                <span className="isax-b icon-chart text-lg"></span>
              </div>
              <div className="text-xs font-bold text-gray-900 group-hover:text-[var(--base-brand-navy)]">
                Nhật ký theo dõi
              </div>
            </div>
            <span className="isax icon-arrow-right-1 text-xs text-gray-400 group-hover:text-[var(--base-brand-navy)] transition-colors"></span>
          </Link>

          <Link
            to="/patient/lesions"
            className="bg-white border border-[var(--color-border-default)] rounded-lg p-4 flex items-center justify-between gap-3 group hover:border-[var(--base-brand-navy)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[var(--color-primary-50)] flex items-center justify-center text-[var(--color-primary-600)] shrink-0">
                <span className="isax-b icon-camera text-lg"></span>
              </div>
              <div className="text-xs font-bold text-gray-900 group-hover:text-[var(--base-brand-navy)]">
                Ảnh tổn thương
              </div>
            </div>
            <span className="isax icon-arrow-right-1 text-xs text-gray-400 group-hover:text-[var(--base-brand-navy)] transition-colors"></span>
          </Link>

          <Link
            to="/patient/screening"
            className="bg-white border border-[var(--color-border-default)] rounded-lg p-4 flex items-center justify-between gap-3 group hover:border-[var(--base-brand-navy)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-amber-50 flex items-center justify-center text-amber-700 shrink-0">
                <span className="isax-b icon-clipboard-text text-lg"></span>
              </div>
              <div className="text-xs font-bold text-gray-900 group-hover:text-[var(--base-brand-navy)]">
                Khảo sát lâm sàng
              </div>
            </div>
            <span className="isax icon-arrow-right-1 text-xs text-gray-400 group-hover:text-[var(--base-brand-navy)] transition-colors"></span>
          </Link>

          <Link
            to="/patient/profile"
            className="bg-white border border-[var(--color-border-default)] rounded-lg p-4 flex items-center justify-between gap-3 group hover:border-[var(--base-brand-navy)] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-[var(--color-primary-50)] flex items-center justify-center text-[var(--color-primary-600)] shrink-0">
                <span className="isax-b icon-user text-lg"></span>
              </div>
              <div className="text-xs font-bold text-gray-900 group-hover:text-[var(--base-brand-navy)]">
                Hồ sơ cá nhân
              </div>
            </div>
            <span className="isax icon-arrow-right-1 text-xs text-gray-400 group-hover:text-[var(--base-brand-navy)] transition-colors"></span>
          </Link>
        </div>
      </div>
    </div>
  );
}
