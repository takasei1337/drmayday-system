import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";
import LesionTracker from "./LesionTracker";
import { TabBar } from "../../components/ui";
import { getDailyUasBand, getUas7Band } from "../../utils/uas7";

function getLocalTodayIso() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

const HSS_OPTIONS = [
  { val: 0, title: "0 - Không có", desc: "Không xuất hiện nốt sẩn" },
  { val: 1, title: "1 - Nhẹ", desc: "Dưới 20 nốt / 24 giờ" },
  { val: 2, title: "2 - Vừa", desc: "20 - 50 nốt / 24 giờ" },
  { val: 3, title: "3 - Nặng", desc: "Trên 50 nốt hoặc mảng lớn" },
];

const ISS_OPTIONS = [
  { val: 0, title: "0 - Không ngứa", desc: "Không có cảm giác ngứa" },
  { val: 1, title: "1 - Nhẹ", desc: "Ngứa nhẹ, không ảnh hưởng" },
  { val: 2, title: "2 - Vừa", desc: "Ngứa gây khó chịu" },
  { val: 3, title: "3 - Nặng", desc: "Ngứa dữ dội, cản trở sinh hoạt" },
];

export default function Uas7Tracker() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialSection = searchParams.get("tab") === "lesions" ? "lesions" : "scoring";

  // Section cấp cao: 'scoring' (Chấm điểm hoạt tính) | 'lesions' (Ảnh tổn thương)
  const [activeSection, setActiveSection] = useState(initialSection);

  // Tab con trong scoring: 'uas7' (Mày đay) | 'aas7' (Phù mạch)
  const [activeScoreTab, setActiveScoreTab] = useState("uas7");

  const todayIso = getLocalTodayIso();
  const [eligible, setEligible] = useState(true);
  const [scores, setScores] = useState([]);
  const [aasScores, setAasScores] = useState([]);
  const [savingUas, setSavingUas] = useState(false);
  const [savingAas, setSavingAas] = useState(false);

  // UAS7 state
  const [hss, setHss] = useState(1);
  const [iss, setIss] = useState(2);
  const [scoreDate, setScoreDate] = useState(todayIso);

  // AAS7 state
  const [aasDate, setAasDate] = useState(todayIso);
  const [hasAngioedema, setHasAngioedema] = useState(false);
  const [aasDiscomfort, setAasDiscomfort] = useState(1);
  const [aasActivity, setAasActivity] = useState(1);
  const [aasAppearance, setAasAppearance] = useState(1);
  const [aasOverall, setAasOverall] = useState(1);

  const dailyScore = hss + iss;
  const dailyAasScore = hasAngioedema
    ? aasDiscomfort + aasActivity + aasAppearance + aasOverall
    : 0;

  const handleSectionSwitch = (sec) => {
    setActiveSection(sec);
    setSearchParams(sec === "lesions" ? { tab: "lesions" } : {});
  };

  const loadAllScores = useCallback(async () => {
    try {
      let storedUid = null;
      try {
        storedUid = JSON.parse(localStorage.getItem("user") || "{}")?.user_id || null;
      } catch {
        storedUid = null;
      }
      const profRes = await apiClient.get("/profile", { silent: true }).catch(() => ({ data: {} }));
      const uid = profRes.data?.user_id || storedUid;

      const [eligRes, uasRes, aasRes] = await Promise.all([
        apiClient.get("/uas7-scores/eligibility", { silent: true }).catch(() => ({ data: { eligible: "true" } })),
        uid ? apiClient.get(`/uas7-scores/patient/${uid}`, { silent: true }).catch(() => ({ data: [] })) : { data: [] },
        uid ? apiClient.get(`/aas-scores/patient/${uid}`, { silent: true }).catch(() => ({ data: [] })) : { data: [] },
      ]);

      setEligible(String(eligRes.data?.eligible) !== "false");

      const rawUas = Array.isArray(uasRes.data) ? uasRes.data : [];
      const normUas = rawUas
        .map((s) => ({
          score_date: String(s.score_date || "").slice(0, 10),
          daily_score: Number(s.daily_score || 0),
          hss7: Number(s.hss7 || 0),
          iss7: Number(s.iss7 || 0),
        }))
        .sort((a, b) => b.score_date.localeCompare(a.score_date));
      setScores(normUas);

      const rawAas = Array.isArray(aasRes.data) ? aasRes.data : [];
      const normAas = rawAas
        .map((a) => ({
          date: String(a.ngay_theo_doi || a.score_date || "").slice(0, 10),
          has_swelling: Boolean(a.co_dot_sung_phu),
          daily_score: Number(a.diem_aas_ngay || 0),
          discomfort: a.muc_kho_chiu,
          activity: a.han_che_hoat_dong,
          appearance: a.anh_huong_ngoai_hinh,
          overall: a.do_nang_tong_the,
        }))
        .sort((a, b) => b.date.localeCompare(a.date));
      setAasScores(normAas);
    } catch {
      // Non-fatal
    }
  }, []);

  useEffect(() => {
    loadAllScores();
  }, [loadAllScores]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSavingUas(true);
    try {
      await apiClient.post("/uas7-scores", {
        score_date: scoreDate,
        hss7: hss,
        iss7: iss,
      });
      toast.success(`Đã ghi nhận điểm UAS ngày ${scoreDate}: ${dailyScore} / 6 điểm!`);
      await loadAllScores();
    } catch (err) {
      toast.error(err.message || "Không thể ghi nhận điểm UAS7");
    } finally {
      setSavingUas(false);
    }
  };

  const handleSubmitAas = async (e) => {
    e.preventDefault();
    setSavingAas(true);
    try {
      const payload = {
        ngay_theo_doi: aasDate,
        co_dot_sung_phu: hasAngioedema,
      };
      if (hasAngioedema) {
        payload.muc_kho_chiu = aasDiscomfort;
        payload.han_che_hoat_dong = aasActivity;
        payload.anh_huong_ngoai_hinh = aasAppearance;
        payload.do_nang_tong_the = aasOverall;
      }

      await apiClient.post("/aas-scores", payload);
      toast.success(`Đã lưu điểm phù mạch AAS ngày ${aasDate}: ${dailyAasScore} / 12 điểm!`);
      await loadAllScores();
    } catch (err) {
      toast.error(err.message || "Không thể lưu điểm AAS7");
    } finally {
      setSavingAas(false);
    }
  };

  const getSeverity = (daily) => {
    const band = getDailyUasBand(daily);
    return {
      label: band.label,
      fg: band.fg,
      bg: band.bg,
      border: band.border,
      badgeClass: "",
    };
  };

  const weeklyUasTotal = scores.slice(0, 7).reduce((sum, s) => sum + s.daily_score, 0);
  const weeklyBand = getUas7Band(scores.length > 0 ? weeklyUasTotal : null);
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const entry = scores.find((s) => s.score_date === iso);
    return { iso, label: `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`, entry };
  });

  return (
    <div className="space-y-5">
      {/* 1. Header gọn gàng */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--base-border-opaque)]">
        <h1 className="text-lg sm:text-xl font-bold text-[var(--base-brand-navy)] tracking-tight">
          Nhật ký theo dõi lâm sàng
        </h1>

        <Link
          to="/patient"
          className="base-btn base-btn-secondary base-btn-sm self-start sm:self-auto cursor-pointer"
        >
          <span className="isax icon-arrow-left-2 text-sm"></span>
          <span>Trang chủ</span>
        </Link>
      </div>

      {/* 2. Phân cấp rõ ràng: Tab chính (Chấm điểm vs Ảnh tổn thương) */}
      <TabBar
        tabs={[
          { id: "scoring", label: "Chấm điểm hoạt tính", icon: "task-square" },
          { id: "lesions", label: "Ảnh tổn thương", icon: "camera" },
        ]}
        activeTab={activeSection}
        onChange={handleSectionSwitch}
        variant="underline"
      />

      {/* NỘI DUNG SECTION 2: KHO ẢNH TỔN THƯƠNG */}
      {activeSection === "lesions" && <LesionTracker embedded={true} />}

      {/* NỘI DUNG SECTION 1: CHẤM ĐIỂM HOẠT TÍNH */}
      {activeSection === "scoring" && (
        <div className="space-y-4">
          {!eligible && (
            <div className="p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="isax-b icon-warning-2 text-base text-amber-600 shrink-0"></span>
                <span>
                  Bạn cần có hồ sơ Mày đay mạn tính đang theo dõi để kích hoạt đầy đủ nhật ký theo dõi.
                </span>
              </div>
              <Link
                to="/patient/screening"
                className="base-btn base-btn-primary base-btn-sm shrink-0 font-medium"
              >
                Tạo hồ sơ ngay
              </Link>
            </div>
          )}

          {/* Sub-tabs lựa chọn UAS7 vs AAS7 — Segmented Pills nhỏ gọn */}
          <div className="flex items-center justify-between">
            <TabBar
              tabs={[
                { id: "uas7", label: "Thang điểm UAS7 (Mày đay)", icon: "chart" },
                { id: "aas7", label: "Thang điểm AAS7 (Phù mạch)", icon: "activity" },
              ]}
              activeTab={activeScoreTab}
              onChange={setActiveScoreTab}
              variant="pills"
              size="sm"
            />
          </div>

          {activeScoreTab === "uas7" ? (
            /* Layout hai cột trên desktop: Nhập liệu (7 cols) & Lịch sử (5 cols) */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* CỘT TRÁI: FORM GHI NHẬN UAS7 */}
              <div className="lg:col-span-7">
                <div className="base-card p-5 rounded-2xl">
                  <div className="flex items-center justify-between pb-3.5 border-b border-[var(--base-border-opaque)] mb-4">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">
                        Ghi nhận chỉ số UAS hàng ngày
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Tình trạng trong 24 giờ qua
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-2xl border border-[var(--base-border-opaque)]">
                      <span className="isax icon-calendar text-xs text-gray-400"></span>
                      <input
                        type="date"
                        max={todayIso}
                        value={scoreDate}
                        onChange={(e) => setScoreDate(e.target.value)}
                        className="text-xs font-mono font-medium text-gray-700 bg-transparent border-0 p-0 focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* 1. Nốt sẩn phù (HSS) */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-gray-900">
                          1. Số lượng nốt sẩn (HSS)
                        </label>
                        <span className="text-xs font-mono font-medium text-gray-500">
                          <strong className="text-[var(--base-brand-navy)] font-bold">{hss}</strong> / 3 điểm
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {HSS_OPTIONS.map((opt) => {
                          const isSelected = hss === opt.val;
                          return (
                            <div
                              key={opt.val}
                              onClick={() => setHss(opt.val)}
                              className={`base-selection-card rounded-2xl ${isSelected ? "is-selected" : ""}`}
                            >
                              <input
                                type="radio"
                                name="hss"
                                checked={isSelected}
                                onChange={() => setHss(opt.val)}
                                className="mt-0.5 h-3.5 w-3.5 text-[var(--base-brand-navy)] shrink-0"
                              />
                              <div className="min-w-0">
                                <div className={`text-xs ${isSelected ? "font-bold text-[var(--base-brand-navy)]" : "font-medium text-gray-900"}`}>
                                  {opt.title}
                                </div>
                                <div className="text-xs text-gray-500 leading-snug mt-0.5">
                                  {opt.desc}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Phân cách giữa các câu hỏi */}
                    <div className="pt-3 border-t border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-semibold text-gray-900">
                          2. Mức độ ngứa (ISS)
                        </label>
                        <span className="text-xs font-mono font-medium text-gray-500">
                          <strong className="text-[var(--base-brand-navy)] font-bold">{iss}</strong> / 3 điểm
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {ISS_OPTIONS.map((opt) => {
                          const isSelected = iss === opt.val;
                          return (
                            <div
                              key={opt.val}
                              onClick={() => setIss(opt.val)}
                              className={`base-selection-card rounded-2xl ${isSelected ? "is-selected" : ""}`}
                            >
                              <input
                                type="radio"
                                name="iss"
                                checked={isSelected}
                                onChange={() => setIss(opt.val)}
                                className="mt-0.5 h-3.5 w-3.5 text-[var(--base-brand-navy)] shrink-0"
                              />
                              <div className="min-w-0">
                                <div className={`text-xs ${isSelected ? "font-bold text-[var(--base-brand-navy)]" : "font-medium text-gray-900"}`}>
                                  {opt.title}
                                </div>
                                <div className="text-xs text-gray-500 leading-snug mt-0.5">
                                  {opt.desc}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tổng điểm ngày & Nút lưu */}
                    <div className="p-3.5 rounded-2xl bg-gray-50/80 border border-[var(--base-border-opaque)] flex items-center justify-between mt-3">
                      <div>
                        <span className="text-xs text-gray-500 block">Tổng điểm ngày (HSS + ISS):</span>
                        <div className="flex items-baseline gap-1 mt-0.5">
                          <span className="text-2xl font-mono font-extrabold text-[var(--base-brand-navy)]">
                            {dailyScore}
                          </span>
                          <span className="text-xs font-medium text-gray-500">/ 6 điểm</span>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={savingUas || !eligible}
                        className="base-btn base-btn-primary base-btn-lg min-h-[48px] px-5 font-semibold cursor-pointer"
                      >
                        <span className="isax icon-tick-circle text-base"></span>
                        <span>{savingUas ? "Đang lưu..." : "Lưu kết quả"}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* CỘT PHẢI: LỊCH SỬ & THỐNG KÊ TUẦN */}
              <div className="lg:col-span-5 space-y-4">
                <div className="base-card p-5 rounded-2xl">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--base-border-opaque)] mb-3">
                    <h3 className="text-base font-semibold text-gray-900">
                      Nhật ký UAS 7 ngày
                    </h3>
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-mono font-bold"
                      style={{ backgroundColor: weeklyBand.bg, color: weeklyBand.fg, border: `1px solid ${weeklyBand.border}` }}
                    >
                      Tuần: <strong>{weeklyUasTotal}</strong>/42 · {weeklyBand.label}
                    </span>
                  </div>

                  {/* Dải 7 ngày phân biệt rõ ngày chưa ghi (—) với ngày 0 điểm */}
                  <div className="grid grid-cols-7 gap-1.5 mb-3">
                    {last7Days.map((day) => {
                      const hasData = Boolean(day.entry);
                      const band = hasData ? getDailyUasBand(day.entry.daily_score) : getUas7Band(null);
                      return (
                        <button
                          key={day.iso}
                          type="button"
                          onClick={() => setScoreDate(day.iso)}
                          className={`p-2 rounded-lg text-center border transition-colors cursor-pointer min-h-[56px] flex flex-col items-center justify-center ${
                            scoreDate === day.iso ? "ring-2 ring-[#091F5B]" : ""
                          } ${!hasData ? "border-dashed border-slate-300 bg-slate-50 text-slate-500" : ""}`}
                          style={hasData ? { backgroundColor: band.bg, color: band.fg, borderColor: band.border } : undefined}
                          title={hasData ? `${day.iso}: ${day.entry.daily_score}/6 (${band.label})` : `${day.iso}: Chưa ghi`}
                        >
                          <span className="text-[11px] font-medium">{day.label}</span>
                          <span className="text-sm font-mono font-bold mt-0.5">
                            {hasData ? day.entry.daily_score : "—"}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {scores.length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-4 text-center">
                      Chưa có bản ghi điểm UAS7 nào.
                    </p>
                  ) : (
                    /* Không dùng scrollbar lồng nhau, hiển thị đối chiếu 7 lần gần nhất */
                    <div className="divide-y divide-[var(--base-border-opaque)]">
                      {scores.slice(0, 7).map((s) => {
                        const sev = getSeverity(s.daily_score);
                        const isToday = s.score_date === todayIso;
                        return (
                          <div key={s.score_date} className="py-2.5 flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-1.5 font-mono text-xs font-semibold text-gray-900">
                                <span>{s.score_date}</span>
                                {isToday && (
                                  <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-[var(--base-brand-navy)] border border-blue-100">
                                    Hôm nay
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">
                                Sẩn (HSS): {s.hss7}/3 • Ngứa (ISS): {s.iss7}/3
                              </div>
                            </div>
                            <div className="text-right flex flex-col items-end gap-0.5">
                              <div className="font-mono text-sm font-bold text-gray-900">
                                {s.daily_score} <span className="text-xs font-normal text-gray-400">/ 6</span>
                              </div>
                              <span
                                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold"
                                style={{ backgroundColor: sev.bg, color: sev.fg, border: `1px solid ${sev.border}` }}
                              >
                                {sev.label}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Hướng dẫn lâm sàng */}
                <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-200/80 text-xs text-gray-600 space-y-1.5">
                  <div className="font-semibold text-gray-900 flex items-center gap-1.5">
                    <span className="isax-b icon-info-circle text-sm text-[var(--base-brand-navy)]"></span>
                    <span>Ý nghĩa lâm sàng thang điểm UAS7 (5 mức thống nhất)</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    0: Sạch bệnh • 1–6: Kiểm soát tốt • 7–15: Nhẹ • 16–27: Trung bình • 28–42: Nặng (cần bác sĩ điều chỉnh phác đồ).
                  </p>
                </div>
              </div>
            </div>
          ) : (
            /* TAB PHÙ MẠCH AAS7 */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              <div className="lg:col-span-7">
                <form onSubmit={handleSubmitAas} className="base-card p-5 space-y-4 rounded-2xl">
                  <div className="flex items-center justify-between pb-3.5 border-b border-[var(--base-border-opaque)]">
                    <div>
                      <h2 className="text-sm font-semibold text-gray-900">
                        Thang điểm phù mạch (AAS7)
                      </h2>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Theo dõi sưng phù mô sâu trong 24 giờ qua
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-2xl border border-[var(--base-border-opaque)]">
                      <span className="isax icon-calendar text-xs text-gray-400"></span>
                      <input
                        type="date"
                        max={todayIso}
                        value={aasDate}
                        onChange={(e) => setAasDate(e.target.value)}
                        className="text-xs font-mono font-medium text-gray-700 bg-transparent border-0 p-0 focus:outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-gray-900 block mb-2">
                      Trong 24 giờ qua, bạn có xuất hiện đợt sưng phù mạch nào không? *
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div
                        onClick={() => setHasAngioedema(false)}
                        className={`base-selection-card rounded-2xl ${!hasAngioedema ? "is-selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="angioedema"
                          checked={!hasAngioedema}
                          onChange={() => setHasAngioedema(false)}
                          className="mt-0.5 h-3.5 w-3.5 text-[var(--base-brand-navy)] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className={`text-xs ${!hasAngioedema ? "font-bold text-[var(--base-brand-navy)]" : "font-medium text-gray-900"}`}>
                            Không có đợt phù mạch
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">0 điểm</div>
                        </div>
                      </div>

                      <div
                        onClick={() => setHasAngioedema(true)}
                        className={`base-selection-card rounded-2xl ${hasAngioedema ? "is-selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="angioedema"
                          checked={hasAngioedema}
                          onChange={() => setHasAngioedema(true)}
                          className="mt-0.5 h-3.5 w-3.5 text-[var(--base-brand-navy)] shrink-0"
                        />
                        <div className="min-w-0">
                          <div className={`text-xs ${hasAngioedema ? "font-bold text-[var(--base-brand-navy)]" : "font-medium text-gray-900"}`}>
                            Có sưng phù mô sâu
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">Môi, mí mắt, tay chân</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {hasAngioedema && (
                    <div className="space-y-3.5 pt-2 border-t border-gray-100">
                      {[
                        {
                          label: "1. Mức độ khó chịu vật lý do sưng phù",
                          val: aasDiscomfort,
                          setter: setAasDiscomfort,
                        },
                        {
                          label: "2. Hạn chế hoạt động sinh hoạt hàng ngày",
                          val: aasActivity,
                          setter: setAasActivity,
                        },
                        {
                          label: "3. Ảnh hưởng thẩm mỹ / ngoại hình giao tiếp",
                          val: aasAppearance,
                          setter: setAasAppearance,
                        },
                        {
                          label: "4. Đánh giá độ nặng tổng thể của đợt phù",
                          val: aasOverall,
                          setter: setAasOverall,
                        },
                      ].map((q, idx) => (
                        <div key={idx}>
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-semibold text-gray-800">{q.label}</span>
                            <span className="font-mono text-xs font-semibold text-gray-500">
                              <strong className="text-[var(--base-brand-navy)] font-bold">{q.val}</strong> / 3 điểm
                            </span>
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            {[
                              { v: 0, t: "0 - Không" },
                              { v: 1, t: "1 - Nhẹ" },
                              { v: 2, t: "2 - Vừa" },
                              { v: 3, t: "3 - Nặng" },
                            ].map((opt) => (
                              <button
                                key={opt.v}
                                type="button"
                                onClick={() => q.setter(opt.v)}
                                className={`py-1.5 px-2 rounded-md border text-xs transition-colors cursor-pointer ${
                                  q.val === opt.v
                                    ? "bg-[var(--base-brand-primary-50)] border-[var(--base-brand-navy)] text-[var(--base-brand-navy)] font-bold"
                                    : "bg-white border-[var(--base-border-opaque)] text-gray-600 hover:bg-gray-50 font-medium"
                                }`}
                              >
                                {opt.t}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="p-4 rounded-lg bg-gray-50/80 border border-[var(--base-border-opaque)] flex items-center justify-between mt-3">
                    <div>
                      <span className="text-xs text-gray-500 block">Tổng điểm AAS ngày:</span>
                      <div className="flex items-baseline gap-1 mt-0.5">
                        <span className="text-2xl font-mono font-extrabold text-[var(--base-brand-navy)]">
                          {dailyAasScore}
                        </span>
                        <span className="text-xs font-medium text-gray-500">/ 12 điểm</span>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={savingAas || !eligible}
                      className="base-btn base-btn-primary base-btn-md font-semibold cursor-pointer"
                    >
                      <span className="isax icon-tick-circle text-base"></span>
                      <span>{savingAas ? "Đang lưu..." : "Lưu kết quả"}</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Lịch sử AAS */}
              <div className="lg:col-span-5">
                <div className="base-card p-5 space-y-3 rounded-lg">
                  <div className="flex items-center justify-between pb-3 border-b border-[var(--base-border-opaque)]">
                    <h3 className="text-sm font-semibold text-gray-900">
                      Lịch sử phù mạch ({aasScores.length})
                    </h3>
                  </div>
                  {aasScores.length === 0 ? (
                    <p className="text-xs text-gray-500 italic py-4 text-center">
                      Chưa ghi nhận đợt phù nề mô sâu nào trong 7 ngày qua.
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--base-border-opaque)]">
                      {aasScores.map((item) => (
                        <div key={item.date} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-mono font-semibold text-gray-900">{item.date}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {item.has_swelling ? "Có đợt sưng phù mạch" : "Không có phù mạch"}
                            </div>
                          </div>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-mono text-xs font-bold ${
                              item.has_swelling
                                ? "bg-amber-50 text-amber-800 border border-amber-200"
                                : "bg-emerald-50 text-emerald-800 border border-emerald-200"
                            }`}
                          >
                            {item.daily_score} / 12 điểm
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
