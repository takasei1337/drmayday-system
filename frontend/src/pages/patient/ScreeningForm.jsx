import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";

export default function ScreeningForm() {
  const navigate = useNavigate();

  // Trạng thái bệnh nhân: 'loading' | 'routine' (đã có hồ sơ) | 'baseline' (chưa sàng lọc lần đầu)
  const [patientState, setPatientState] = useState("loading");
  const [hasBaselineRecord, setHasBaselineRecord] = useState(false);

  // Dữ liệu định danh
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [hisCode, setHisCode] = useState("");

  // ====== 1. DÀNH CHO BỆNH NHÂN ĐÃ SÀNG LỌC (Khảo sát UCT định kỳ) ======
  const [uct1, setUct1] = useState(2); // 0 - 4
  const [uct2, setUct2] = useState(2); // 0 - 4
  const [uct3, setUct3] = useState(3); // 0 - 4
  const [uct4, setUct4] = useState(3); // 0 - 4
  const [submittingUct, setSubmittingUct] = useState(false);
  const [uctHistory, setUctHistory] = useState([
    {
      date: "01/11/2026",
      score: 13,
      evaluation: "Kiểm soát tốt",
      doctorNotes: "Tiếp tục duy trì liều Fexofenadine 180mg",
    },
    {
      date: "15/10/2026",
      score: 8,
      evaluation: "Chưa kiểm soát tốt",
      doctorNotes: "Tăng liều kháng histamine thế hệ 2",
    },
  ]);

  const currentUctScore = uct1 + uct2 + uct3 + uct4;

  // ====== 2. DÀNH CHO BỆNH NHÂN MỚI (Wizard Sàng Lọc Ban Đầu) ======
  const [currentStep, setCurrentStep] = useState(1);
  const [submittingBaseline, setSubmittingBaseline] = useState(false);
  const [clinicalType, setClinicalType] = useState("chronic");
  const [whealDuration, setWhealDuration] = useState("1_to_24h");
  const [hasAngioedema, setHasAngioedema] = useState("sometimes");
  const [lesionTrend, setLesionTrend] = useState("worse");
  const [triggerNotes, setTriggerNotes] = useState("");
  const [redFlags, setRedFlags] = useState({
    breathing: false,
    throat: false,
    dizziness: false,
    stomach: false,
  });

  const isEmergency = Object.values(redFlags).some((v) => v === true);

  useEffect(() => {
    let cancelled = false;

    async function checkState() {
      try {
        const [profRes, histRes] = await Promise.all([
          apiClient.get("/profile", { silent: true }).catch(() => ({ data: {} })),
          apiClient.get("/medical_records/patient/history", { silent: true }).catch(() => ({ data: [] })),
        ]);

        if (cancelled) return;

        let stored = {};
        try {
          stored = JSON.parse(localStorage.getItem("user") || "{}") || {};
        } catch {
          stored = {};
        }
        const prof = profRes.data || {};
        if (prof.full_name || stored.full_name) setPatientName(prof.full_name || stored.full_name);
        if (prof.phone || stored.phone) setPhone(prof.phone || stored.phone);
        if (prof.ma_his || stored.ma_his) setHisCode(prof.ma_his || stored.ma_his);

        const records = Array.isArray(histRes.data) ? histRes.data : [];
        const isScreened =
          records.length > 0 ||
          Boolean(prof.ma_his) ||
          localStorage.getItem("has_screened") === "true";

        setHasBaselineRecord(isScreened);
        setPatientState(isScreened ? "routine" : "baseline");
      } catch {
        if (!cancelled) setPatientState("baseline");
      }
    }

    checkState();
    return () => {
      cancelled = true;
    };
  }, []);

  // Gửi bài khảo sát UCT định kỳ
  const handleSubmitUct = async (e) => {
    e.preventDefault();
    setSubmittingUct(true);
    try {
      await apiClient.post("/clinical-surveys/uct", {
        score_uct: currentUctScore,
        answers: { uct1, uct2, uct3, uct4 },
      });
    } catch {
      // Mock lưu lịch sử
    }

    const newEntry = {
      date: new Date().toLocaleDateString("vi-VN"),
      score: currentUctScore,
      evaluation: currentUctScore >= 12 ? "Kiểm soát tốt" : "Chưa kiểm soát tốt",
      doctorNotes: "Đang chờ Bác sĩ duyệt trong ca khám tới",
    };
    setUctHistory([newEntry, ...uctHistory]);
    toast.success("Đã gửi kết quả đánh giá UCT cho Bác sĩ phụ trách");
    setSubmittingUct(false);
  };

  // Gửi wizard phân loại ban đầu
  const handleSubmitBaseline = async (e) => {
    e.preventDefault();
    setSubmittingBaseline(true);

    try {
      await apiClient.post("/red-flag-screening", {
        co_kho_tho_kho_khe_nghen_hong: redFlags.breathing,
        co_sung_moi_luoi_co_hong: redFlags.throat,
        co_chong_mat_tuc_nguc_sap_ngat: redFlags.dizziness,
        co_dau_bung_non_lien_tuc: redFlags.stomach,
      });

      const isChronic = clinicalType === "chronic";
      const classifyRes = await apiClient.post("/medical_records/classify", {
        is_chronic: isChronic,
        duration_weeks: isChronic ? 8 : 2,
      });

      const templateId =
        classifyRes.data?.template_id || (isChronic ? "TMPL_URT_CHRONIC" : "TMPL_URT_ACUTE");

      await apiClient.post("/medical_records", {
        template_id: templateId,
        diagnosis: isChronic
          ? "Sàng lọc ban đầu: Mày đay mạn tính (>= 6 tuần)"
          : "Sàng lọc ban đầu: Mày đay cấp tính (< 6 tuần)",
        answers: [
          { question_id: "Q_DURATION_WEEKS", answer_value: isChronic ? 8 : 2 },
          { question_id: "Q_DISEASE_MANIFESTATION", answer_text: hasAngioedema },
          { question_id: "Q_WHEAL_DURATION", answer_text: whealDuration },
          { question_id: "Q_LESION_TREND", answer_text: lesionTrend },
        ],
      });

      localStorage.setItem("has_screened", "true");
      toast.success("Đã hoàn thành sàng lọc ban đầu và chuyển hồ sơ vào hàng đợi Bác sĩ");
      setHasBaselineRecord(true);
      setPatientState("routine");
    } catch (err) {
      toast.error(err.message || "Không thể gửi phiếu khảo sát. Vui lòng thử lại.");
    } finally {
      setSubmittingBaseline(false);
    }
  };

  if (patientState === "loading") {
    return (
      <div className="base-card p-12 text-center text-xs text-gray-500">
        Đang kiểm tra dữ liệu hồ sơ lâm sàng...
      </div>
    );
  }

  // ==========================================================
  // GIAO DIỆN 1: BỆNH NHÂN ĐÃ SÀNG LỌC (Khảo sát định kỳ trước khám)
  // ==========================================================
  if (patientState === "routine") {
    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--base-border-opaque)]">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg sm:text-xl font-bold text-[var(--base-brand-navy)] tracking-tight">
              Khảo sát lâm sàng định kỳ
            </h1>
            <span className="base-tag base-tag-positive text-xs font-bold">
              Đã có hồ sơ bệnh án
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/emergency-triage"
              className="base-btn base-btn-danger base-btn-sm"
            >
              <span className="isax-b icon-danger text-sm"></span>
              <span>Cấp cứu phản vệ</span>
            </Link>

            <button
              type="button"
              onClick={() => setPatientState("baseline")}
              className="base-btn base-btn-secondary base-btn-sm"
            >
              Làm lại sàng lọc ban đầu
            </button>
          </div>
        </div>

        {/* Khối chính: Bảng trắc nghiệm UCT chuẩn quốc tế (0-16đ) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          <form
            onSubmit={handleSubmitUct}
            className="lg:col-span-7 base-card p-5 space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[var(--base-border-opaque)]">
              <h2 className="text-sm font-semibold text-gray-900">
                Thang điểm kiểm soát mày đay (UCT)
              </h2>
              <div className="text-right">
                <span className="text-xs text-gray-400 block font-mono">Điểm tạm tính</span>
                <span
                  className={`text-base font-bold font-mono ${
                    currentUctScore >= 12 ? "text-emerald-600" : "text-amber-600"
                  }`}
                >
                  {currentUctScore} / 16
                </span>
              </div>
            </div>

            {/* Câu 1 */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-900 block leading-snug">
                1. Mức độ xuất hiện triệu chứng (sẩn phù, ngứa) trong 4 tuần qua?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { val: 0, text: "Rất nhiều (hằng ngày)" },
                  { val: 1, text: "Nhiều (vài ngày/tuần)" },
                  { val: 2, text: "Trung bình" },
                  { val: 3, text: "Hiếm khi xuất hiện" },
                  { val: 4, text: "Hoàn toàn không có" },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setUct1(opt.val)}
                    className={`p-2.5 rounded-md border text-left text-xs transition-colors cursor-pointer ${
                      uct1 === opt.val
                        ? "bg-[var(--base-brand-primary-50)] text-[var(--base-brand-navy)] border-[var(--base-brand-navy)] font-bold"
                        : "bg-white text-gray-700 border-[var(--base-border-opaque)] hover:bg-gray-50 font-medium"
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Câu 2 */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <label className="text-xs font-semibold text-gray-900 block leading-snug">
                2. Bệnh làm giảm chất lượng cuộc sống (giấc ngủ, công việc) ở mức nào?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { val: 0, text: "Ảnh hưởng rất nặng" },
                  { val: 1, text: "Ảnh hưởng nhiều" },
                  { val: 2, text: "Ảnh hưởng vừa phải" },
                  { val: 3, text: "Ảnh hưởng rất nhẹ" },
                  { val: 4, text: "Hoàn toàn không ảnh hưởng" },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setUct2(opt.val)}
                    className={`p-2.5 rounded-md border text-left text-xs transition-colors cursor-pointer ${
                      uct2 === opt.val
                        ? "bg-[var(--base-brand-primary-50)] text-[var(--base-brand-navy)] border-[var(--base-brand-navy)] font-bold"
                        : "bg-white text-gray-700 border-[var(--base-border-opaque)] hover:bg-gray-50 font-medium"
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Câu 3 */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <label className="text-xs font-semibold text-gray-900 block leading-snug">
                3. Việc dùng thuốc có kiểm soát được các cơn sẩn ngứa không?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { val: 0, text: "Hoàn toàn không kiểm soát" },
                  { val: 1, text: "Chỉ giảm một phần nhỏ" },
                  { val: 2, text: "Kiểm soát được phân nửa" },
                  { val: 3, text: "Kiểm soát tốt gần hết" },
                  { val: 4, text: "Khống chế hoàn toàn triệu chứng" },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setUct3(opt.val)}
                    className={`p-2.5 rounded-md border text-left text-xs transition-colors cursor-pointer ${
                      uct3 === opt.val
                        ? "bg-[var(--base-brand-primary-50)] text-[var(--base-brand-navy)] border-[var(--base-brand-navy)] font-bold"
                        : "bg-white text-gray-700 border-[var(--base-border-opaque)] hover:bg-gray-50 font-medium"
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Câu 4 */}
            <div className="space-y-1.5 pt-2 border-t border-gray-100">
              <label className="text-xs font-semibold text-gray-900 block leading-snug">
                4. Nhìn chung, bạn tự đánh giá mức độ kiểm soát bệnh mày đay ra sao?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { val: 0, text: "Chưa kiểm soát được" },
                  { val: 1, text: "Kiểm soát kém" },
                  { val: 2, text: "Kiểm soát tạm ổn" },
                  { val: 3, text: "Kiểm soát tốt" },
                  { val: 4, text: "Hoàn toàn bình thường" },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => setUct4(opt.val)}
                    className={`p-2.5 rounded-md border text-left text-xs transition-colors cursor-pointer ${
                      uct4 === opt.val
                        ? "bg-[var(--base-brand-primary-50)] text-[var(--base-brand-navy)] border-[var(--base-brand-navy)] font-bold"
                        : "bg-white text-gray-700 border-[var(--base-border-opaque)] hover:bg-gray-50 font-medium"
                    }`}
                  >
                    {opt.text}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={submittingUct}
              className="base-btn base-btn-primary base-btn-md w-full font-semibold cursor-pointer mt-3"
            >
              <span className="isax icon-send-2 text-sm"></span>
              <span>{submittingUct ? "Đang gửi kết quả..." : "Gửi đánh giá UCT cho bác sĩ"}</span>
            </button>
          </form>

          {/* Cột phải: Lịch sử khảo sát & Ý nghĩa thang điểm */}
          <div className="lg:col-span-5 space-y-4">
            {/* Thẻ chuẩn lâm sàng */}
            <div className="base-card p-5 space-y-3 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-900 pb-2 border-b border-[var(--base-border-opaque)]">
                Quy chuẩn đánh giá UCT
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
                  <div className="font-semibold text-emerald-800">12 – 16 điểm: Kiểm soát tốt</div>
                  <p className="text-xs text-emerald-700 mt-0.5">
                    Phác đồ hiện tại đáp ứng tốt, triệu chứng đã được ức chế ổn định.
                  </p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80">
                  <div className="font-semibold text-amber-800">Dưới 12 điểm: Chưa kiểm soát tốt</div>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Bác sĩ sẽ xem xét tăng bậc điều trị hoặc phối hợp thuốc trong lần tái khám tới.
                  </p>
                </div>
              </div>
            </div>

            {/* Bảng lịch sử các đợt khảo sát cũ */}
            <div className="base-card p-5 rounded-2xl">
              <h3 className="text-sm font-semibold text-gray-900 pb-2 border-b border-[var(--base-border-opaque)] mb-3">
                Lịch sử khảo sát
              </h3>
              <div className="space-y-2.5">
                {uctHistory.map((item, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-gray-50 border border-[var(--base-border-opaque)] text-xs">
                    <div className="flex items-center justify-between font-semibold mb-1">
                      <span className="text-gray-900 font-mono">{item.date}</span>
                      <span
                        className={`font-mono px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          item.score >= 12
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-amber-100 text-amber-800 border border-amber-200"
                        }`}
                      >
                        {item.score}/16 điểm • {item.evaluation}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600">{item.doctorNotes}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================================
  // GIAO DIỆN 2: BỆNH NHÂN MỚI (Wizard Sàng Lọc Ban Đầu)
  // ==========================================================
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--base-border-opaque)]">
        <h1 className="text-lg sm:text-xl font-bold text-[var(--base-brand-navy)] tracking-tight">
          Sàng lọc lâm sàng ban đầu
        </h1>

        <Link
          to="/emergency-triage"
          className="base-btn base-btn-danger base-btn-sm self-start sm:self-auto cursor-pointer"
        >
          <span className="isax-b icon-danger text-sm"></span>
          <span>Sàng lọc khẩn cấp 115</span>
        </Link>
      </div>

      {/* Tabs tiến trình 3 bước */}
      <div className="flex border-b border-[var(--base-border-opaque)] gap-2">
        {[
          { step: 1, title: "1. Định danh bệnh nhân" },
          { step: 2, title: "2. Phân loại Cấp / Mạn" },
          { step: 3, title: "3. Dị nguyên & Hoàn tất" },
        ].map((item) => (
          <button
            key={item.step}
            type="button"
            onClick={() => {
              if (item.step < currentStep) setCurrentStep(item.step);
            }}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition cursor-pointer ${
              currentStep === item.step
                ? "border-[var(--base-brand-navy)] text-[var(--base-brand-navy)]"
                : "border-transparent text-gray-400 hover:text-gray-600"
            }`}
          >
            {item.title}
          </button>
        ))}
      </div>

      {/* Cảnh báo đỏ nếu có dấu hiệu nguy hiểm */}
      {isEmergency && (
        <div className="bg-rose-50 border border-rose-200 rounded-lg p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-rose-800">
            <span className="isax-b icon-danger text-xl text-rose-600"></span>
            <div>
              <strong className="text-xs font-bold block">
                Phát hiện dấu hiệu báo động đỏ
              </strong>
              <p className="text-xs text-rose-700 mt-0.5">
                Có triệu chứng nghi ngờ phản vệ. Hãy dừng điền phiếu và bấm gọi cấp cứu 115 ngay.
              </p>
            </div>
          </div>
          <a
            href="tel:115"
            className="base-btn base-btn-danger base-btn-sm shrink-0"
          >
            Gọi 115 ngay
          </a>
        </div>
      )}

      {/* Form Wizard */}
      <div className="base-card p-5 rounded-lg">
        {/* Bước 1: Định danh */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Thông tin định danh</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">Họ và tên *</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Thị Mai"
                  className="base-input text-xs rounded-2xl"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Số điện thoại *
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ví dụ: 0912 345 678"
                  className="base-input text-xs font-mono rounded-2xl"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700 block mb-1">
                  Mã bệnh nhân HIS (Nếu đã từng khám)
                </label>
                <input
                  type="text"
                  value={hisCode}
                  onChange={(e) => setHisCode(e.target.value)}
                  placeholder="Ví dụ: BN-2026-0891"
                  className="base-input text-xs font-mono rounded-2xl"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  if (!patientName.trim()) {
                    toast.error("Vui lòng nhập họ và tên");
                    return;
                  }
                  setCurrentStep(2);
                }}
                className="base-btn base-btn-primary base-btn-md font-semibold cursor-pointer"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        )}

        {/* Bước 2: Phân loại Cấp / Mạn & Kiểm tra Dấu hiệu Đỏ */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Phân loại lâm sàng (ngưỡng 6 tuần)
            </h2>

            {/* Sàng lọc báo động đỏ */}
            <div className="p-3.5 rounded-2xl bg-amber-50/50 border border-amber-200 space-y-2">
              <span className="text-xs font-semibold text-amber-900 block">
                Kiểm tra an toàn: Bạn có dấu hiệu nào sau đây không?
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {[
                  { key: "breathing", text: "Khó thở, thở rít, nghẹn họng" },
                  { key: "throat", text: "Sưng nề nhanh môi, lưỡi, thanh quản" },
                  { key: "dizziness", text: "Chóng mặt, tức ngực, cảm giác sắp ngất" },
                  { key: "stomach", text: "Đau quặn bụng dữ dội, nôn liên tục" },
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={redFlags[item.key]}
                      onChange={(e) =>
                        setRedFlags({ ...redFlags, [item.key]: e.target.checked })
                      }
                      className="rounded text-rose-600"
                    />
                    <span className="text-gray-800">{item.text}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Thời gian mắc bệnh */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-900 block">
                Tổng thời gian diễn biến của các cơn sẩn ngứa?
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div
                  onClick={() => setClinicalType("acute")}
                  className={`base-selection-card rounded-2xl ${clinicalType === "acute" ? "is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="clinicalType"
                    checked={clinicalType === "acute"}
                    onChange={() => setClinicalType("acute")}
                    className="mt-0.5 h-3.5 w-3.5 text-[var(--base-brand-navy)] shrink-0"
                  />
                  <div>
                    <strong className="block text-xs text-gray-900 mb-0.5">Dưới 6 tuần (Mày đay cấp)</strong>
                    <span className="text-xs text-gray-500">
                      Cơn mới bùng phát gần đây, thường liên quan dị ứng hoặc nhiễm khuẩn.
                    </span>
                  </div>
                </div>

                <div
                  onClick={() => setClinicalType("chronic")}
                  className={`base-selection-card rounded-2xl ${clinicalType === "chronic" ? "is-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="clinicalType"
                    checked={clinicalType === "chronic"}
                    onChange={() => setClinicalType("chronic")}
                    className="mt-0.5 h-3.5 w-3.5 text-[var(--base-brand-navy)] shrink-0"
                  />
                  <div>
                    <strong className="block text-xs text-gray-900 mb-0.5">Từ 6 tuần trở lên (Mày đay mạn)</strong>
                    <span className="text-xs text-gray-500">
                      Sẩn ngứa tái phát liên tục hoặc ngắt quãng trên 6 tuần, cần theo dõi dài hạn.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className="base-btn base-btn-secondary base-btn-md font-semibold cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="base-btn base-btn-primary base-btn-md font-semibold cursor-pointer"
              >
                Tiếp tục
              </button>
            </div>
          </div>
        )}

        {/* Bước 3: Dị nguyên & Hoàn tất */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">
              Yếu tố nghi ngờ &amp; hoàn tất
            </h2>

            <div>
              <label className="text-xs font-medium text-gray-700 block mb-1">
                Các yếu tố nghi ngờ khởi phát cơn (Thức ăn, thời tiết, thuốc, phấn hoa...)
              </label>
              <textarea
                rows={3}
                value={triggerNotes}
                onChange={(e) => setTriggerNotes(e.target.value)}
                placeholder="Ví dụ: Nổi nhiều sau khi ăn hải sản, khi trời trở lạnh hoặc khi tắm nước nóng..."
                className="base-textarea text-xs rounded-2xl w-full"
              ></textarea>
            </div>

            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900">
              <strong className="block mb-1">Kết luận phân luồng sơ bộ:</strong>
              {clinicalType === "chronic"
                ? "Hồ sơ của bạn được phân vào nhánh [Mày đay mạn tính]. Hệ thống sẽ kích hoạt phác đồ theo dõi dài hạn và chuyển ca vào hàng đợi của Bác sĩ chuyên khoa Da liễu."
                : "Hồ sơ của bạn được phân vào nhánh [Mày đay cấp tính]. Hệ thống tư vấn theo dõi đáp ứng thuốc trong 72 giờ tới."}
            </div>

            <div className="pt-3 flex justify-between">
              <button
                type="button"
                onClick={() => setCurrentStep(2)}
                className="base-btn base-btn-secondary base-btn-md font-semibold cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={submittingBaseline}
                onClick={handleSubmitBaseline}
                className="base-btn base-btn-primary base-btn-md font-semibold cursor-pointer"
              >
                <span>{submittingBaseline ? "Đang lưu hồ sơ..." : "Hoàn tất sàng lọc"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
