import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";
import { TabBar, Button, StatusBadge } from "../../components/ui";

function computeAge(dob) {
  if (!dob) return "—";
  const birthYear = new Date(dob).getFullYear();
  if (Number.isNaN(birthYear)) return "—";
  return Math.max(0, new Date().getFullYear() - birthYear);
}

export default function DoctorPrescription() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlRecordId = searchParams.get("recordId");

  const [queueRecords, setQueueRecords] = useState([]);
  const [selectedId, setSelectedId] = useState(urlRecordId || null);
  const [loading, setLoading] = useState(true);
  const [savingRx, setSavingRx] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Bộ lọc danh sách
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const [activeTab, setActiveTab] = useState("examination"); // 'examination' | 'history'
  const [diagnosis, setDiagnosis] = useState("");
  const [clinicalType, setClinicalType] = useState("chronic");
  const [doctorNotes, setDoctorNotes] = useState(
    "Bệnh nhân đáp ứng một phần với kháng histamine liều chuẩn. Cần theo dõi nhật ký UAS7 hàng ngày và tuân thủ phác đồ EAACI/GA2LEN."
  );

  const [prescriptions, setPrescriptions] = useState([]);
  const [rxSavedOnce, setRxSavedOnce] = useState(false);
  const [pastRecords, setPastRecords] = useState([]);

  const [newDrug, setNewDrug] = useState({
    name: "",
    dosage: "",
    quantity: "",
    instructions: "",
  });
  const [showAddDrug, setShowAddDrug] = useState(false);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/doctor/queue?status=all&include_completed=true");
      const list = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setQueueRecords(list);

      const targetId = searchParams.get("recordId");
      if (targetId) {
        const matched = list.find((r) => String(r.medical_record_id) === String(targetId));
        if (matched) {
          setSelectedId(String(matched.medical_record_id));
        }
      }
    } catch (err) {
      toast.error(err.message || "Không thể tải danh sách bệnh án");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const handleSelectRecord = (id) => {
    setSelectedId(String(id));
    setSearchParams({ recordId: String(id) });
  };

  const handleBackToList = () => {
    setSelectedId(null);
    setSearchParams({});
  };

  const record = selectedId
    ? queueRecords.find((r) => String(r.medical_record_id) === String(selectedId)) || null
    : null;

  // Load record details, prescriptions, and patient history whenever active record changes
  useEffect(() => {
    if (!record) return;

    setDiagnosis(
      record.diagnosis ||
        (record.clinical_type === "chronic" || record.loai_benh_an === "MAN"
          ? "Mày đay mạn tính tự phát (CSU)"
          : "Mày đay cấp tính")
    );
    setClinicalType(
      record.clinical_type === "acute" || record.loai_benh_an === "CAP" ? "acute" : "chronic"
    );

    let cancelled = false;

    async function loadClinicalDetails() {
      try {
        const [rxRes, histRes] = await Promise.all([
          apiClient.get(`/prescriptions/${record.medical_record_id}`).catch(() => ({ data: [] })),
          apiClient
            .get(`/doctor/patients/${record.patient_id}/history`)
            .catch(() => ({ data: [] })),
        ]);

        if (cancelled) return;

        const rxHeaders = Array.isArray(rxRes.data) ? rxRes.data : [];
        const flatItems = [];
        for (const header of rxHeaders) {
          if (header.notes) {
            setDoctorNotes(header.notes);
          }
          const items = Array.isArray(header.items) ? header.items : [];
          for (const it of items) {
            flatItems.push({
              drug_name: it.ten_thuoc || it.ten_thuoc_bo_sung || "Thuốc điều trị",
              dosage: it.lieu_dung || "Theo chỉ dẫn bác sĩ",
              quantity: it.thoi_gian_dung || "14 ngày",
              instructions: header.notes || "Uống sau ăn theo đơn",
            });
          }
        }

        if (flatItems.length > 0) {
          setPrescriptions(flatItems);
          setRxSavedOnce(true);
        } else {
          setPrescriptions([
            {
              drug_name: "Fexofenadine 180mg (Telfast)",
              dosage: "Uống 1 viên vào buổi sáng sau ăn",
              quantity: "14 ngày",
              instructions: "Kháng H1 thế hệ 2 không gây buồn ngủ",
            },
          ]);
          setRxSavedOnce(false);
        }

        const rawHistory = Array.isArray(histRes.data) ? histRes.data : [];
        setPastRecords(rawHistory);
      } catch {
        // Ignore non-fatal fetch errors
      }
    }

    loadClinicalDetails();
    return () => {
      cancelled = true;
    };
  }, [record?.medical_record_id, record?.patient_id]);

  const handleAcceptRecord = async () => {
    if (!record) return;
    try {
      await apiClient.post(`/doctor/medical-records/${record.medical_record_id}/accept`);
      toast.success(`Đã tiếp nhận bệnh án ${record.record_code}`);
      await loadQueue();
    } catch (err) {
      toast.error(err.message || "Không thể tiếp nhận bệnh án");
    }
  };

  const handleAddDrug = (e) => {
    e.preventDefault();
    if (!newDrug.name.trim()) return;
    setPrescriptions([
      ...prescriptions,
      {
        drug_name: newDrug.name.trim(),
        dosage: newDrug.dosage.trim() || "Theo chỉ dẫn",
        quantity: newDrug.quantity.trim() || "14 ngày",
        instructions: newDrug.instructions.trim() || "Uống sau ăn",
      },
    ]);
    setRxSavedOnce(false);
    setNewDrug({ name: "", dosage: "", quantity: "", instructions: "" });
    setShowAddDrug(false);
    toast.success("Đã thêm thuốc vào danh mục kê đơn");
  };

  const handleRemoveDrug = (index) => {
    setPrescriptions(prescriptions.filter((_, i) => i !== index));
    setRxSavedOnce(false);
  };

  const handleSavePrescription = async () => {
    if (!record) return;
    if (record.status === "completed") {
      toast.error("Bệnh án này đã chốt, không thể chỉnh sửa đơn thuốc.");
      return;
    }
    if (prescriptions.length === 0) {
      toast.error("Vui lòng thêm ít nhất 1 thuốc vào đơn điện tử.");
      return;
    }

    setSavingRx(true);
    try {
      if (record.status === "pending") {
        await apiClient.post(`/doctor/medical-records/${record.medical_record_id}/accept`);
      }

      await apiClient.post(`/doctor/medical-records/${record.medical_record_id}/prescriptions`, {
        diagnosis: diagnosis.trim() || "Mày đay mạn tính tự phát (CSU)",
        treatment_note: doctorNotes.trim(),
        items: prescriptions.map((p) => ({
          drug_name: p.drug_name,
          dosage: p.dosage,
          duration: p.quantity || "14 ngày",
        })),
      });

      setRxSavedOnce(true);
      toast.success("Đã lưu đơn thuốc điện tử vào hệ thống!");
      await loadQueue();
    } catch (err) {
      toast.error(err.message || "Không thể lưu đơn thuốc");
    } finally {
      setSavingRx(false);
    }
  };

  const handleCompleteRecord = async () => {
    if (!record) return;
    if (record.status === "completed") {
      toast("Bệnh án này đã được chốt trước đó.");
      return;
    }
    if (!diagnosis.trim()) {
      toast.error("Vui lòng nhập kết luận chẩn đoán trước khi chốt bệnh án.");
      return;
    }

    setCompleting(true);
    try {
      if (record.status === "pending") {
        await apiClient.post(`/doctor/medical-records/${record.medical_record_id}/accept`);
      }

      if (prescriptions.length > 0 && !rxSavedOnce) {
        await apiClient.post(`/doctor/medical-records/${record.medical_record_id}/prescriptions`, {
          diagnosis: diagnosis.trim(),
          treatment_note: doctorNotes.trim(),
          items: prescriptions.map((p) => ({
            drug_name: p.drug_name,
            dosage: p.dosage,
            duration: p.quantity || "14 ngày",
          })),
        });
      }

      await apiClient.post(`/doctor/medical-records/${record.medical_record_id}/complete`, {
        diagnosis: diagnosis.trim(),
        summary: doctorNotes.trim(),
        instructions: doctorNotes.trim(),
        plan:
          clinicalType === "chronic"
            ? "Theo dõi UAS7 hàng ngày và tái khám sau 4 tuần"
            : "Theo dõi đáp ứng kháng Histamine H1 và tái khám khi cần",
      });

      toast.success(`Đã hoàn tất khám và chốt bệnh án điện tử cho ${record.patient_name}!`);
      navigate("/doctor");
    } catch (err) {
      toast.error(err.message || "Không thể chốt bệnh án");
    } finally {
      setCompleting(false);
    }
  };

  const filteredRecords = queueRecords.filter((r) => {
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "in_progress" && r.status === "in_progress") ||
      (statusFilter === "pending" && r.status === "pending") ||
      (statusFilter === "completed" && r.status === "completed");

    const query = searchQuery.trim().toLowerCase();
    const matchQuery =
      !query ||
      (r.patient_name && r.patient_name.toLowerCase().includes(query)) ||
      (r.record_code && r.record_code.toLowerCase().includes(query)) ||
      (r.phone && r.phone.includes(query));

    return matchStatus && matchQuery;
  });

  return (
    <div className="space-y-6">
      {/* 1. MÀN HÌNH DANH SÁCH (KHI CHƯA CHỌN HỒ SƠ CỤ THỂ) */}
      {!record ? (
        <div className="space-y-6">
          <div className="base-hero">
            <div className="base-hero-content">
              <div>
                <h1 className="base-hero-title">Danh Sách Hồ Sơ Khám &amp; Kê Đơn</h1>
              </div>
              <div className="base-hero-actions">
                <Link to="/doctor" className="base-btn-hero-primary">
                  <span className="isax icon-clock text-sm"></span>
                  <span>Hàng Đợi Tiếp Nhận</span>
                </Link>
              </div>
            </div>
          </div>

          {/* Bộ lọc & Tìm kiếm */}
          <div className="bg-white p-4 rounded-lg border border-[var(--base-border-opaque)] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <TabBar
              tabs={[
                { id: "all", label: "Tất cả", icon: "document-text" },
                { id: "pending", label: "Chờ khám", icon: "clock" },
                { id: "in_progress", label: "Đang khám", icon: "health" },
                { id: "completed", label: "Đã khám", icon: "tick-circle" },
              ]}
              activeTab={statusFilter}
              onChange={setStatusFilter}
              variant="underline"
            />

            <div className="relative w-full lg:w-64">
              <span className="isax icon-search-normal-1 text-xs absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm mã hồ sơ, tên bệnh nhân, SĐT..."
                style={{ paddingLeft: 36 }}
                className="base-input !pl-9 text-xs w-full"
              />
            </div>
          </div>

          {/* Bảng danh sách */}
          {loading ? (
            <div className="base-card p-8 text-center text-xs text-gray-500 rounded-lg">
              Đang tải danh sách hồ sơ khám...
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="base-card p-12 text-center rounded-lg">
              <span className="isax icon-document-text text-3xl text-gray-400 block mb-2"></span>
              <p className="text-xs font-bold text-gray-700">Không tìm thấy hồ sơ bệnh án phù hợp</p>
            </div>
          ) : (
            <div className="base-card rounded-lg overflow-hidden">
              <div className="overflow-x-auto base-table-container">
                <table className="base-table w-full">
                  <thead>
                    <tr>
                      <th className="hidden md:table-cell whitespace-nowrap">Mã hồ sơ</th>
                      <th className="whitespace-nowrap">Bệnh nhân</th>
                      <th className="hidden lg:table-cell whitespace-nowrap">Số điện thoại</th>
                      <th className="hidden xl:table-cell whitespace-nowrap">Giới tính</th>
                      <th className="hidden md:table-cell whitespace-nowrap">Thể mày đay</th>
                      <th className="whitespace-nowrap">UAS7 tuần</th>
                      <th className="whitespace-nowrap">Trạng thái</th>
                      <th className="text-right whitespace-nowrap sticky-action-col">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRecords.map((r) => (
                      <tr key={r.medical_record_id}>
                        <td className="hidden md:table-cell font-mono font-bold text-xs text-[var(--base-brand-navy)] whitespace-nowrap">
                          {r.record_code}
                        </td>
                        <td className="font-bold text-xs text-gray-900 whitespace-nowrap">
                          <div>{r.patient_name}</div>
                          <div className="md:hidden font-mono text-[11px] font-medium text-slate-500">{r.record_code}</div>
                        </td>
                        <td className="hidden lg:table-cell text-xs text-gray-600 font-mono whitespace-nowrap">
                          {r.phone || "—"}
                        </td>
                        <td className="hidden xl:table-cell text-xs text-gray-700 whitespace-nowrap">
                          {r.gender === "female" || r.raw_gender === "Nu" ? "Nữ" : "Nam"}
                        </td>
                        <td className="hidden md:table-cell whitespace-nowrap">
                          <span
                            className={`base-tag text-xs font-bold ${
                              r.clinical_type === "chronic" || r.loai_benh_an === "MAN"
                                ? "base-tag-info"
                                : "base-tag-warning"
                            }`}
                          >
                            {r.clinical_type === "chronic" || r.loai_benh_an === "MAN"
                              ? "Mạn tính"
                              : "Cấp tính"}
                          </span>
                        </td>
                        <td className="font-mono font-bold text-xs text-gray-800 whitespace-nowrap">
                          {r.uas7_total !== undefined && r.uas7_total !== null
                            ? `${r.uas7_total} / 42`
                            : "—"}
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
                        <td className="text-right sticky-action-col">
                          <Button
                            variant="primary"
                            size="sm"
                            tableAction
                            leadingIcon="health"
                            onClick={() => handleSelectRecord(r.medical_record_id)}
                          >
                            Vào khám &amp; kê đơn
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* 2. MÀN HÌNH CHI TIẾT (KHI ĐÃ CHỌN HỒ SƠ) */
        <div className="space-y-6">
          <div className="base-hero">
            <div className="base-hero-content">
              <div>
                <h1 className="base-hero-title">Khám &amp; Kê Đơn: {record.patient_name}</h1>
              </div>
              <div className="base-hero-actions">
                <Link
                  to={`/doctor/lab-requests?recordId=${record.medical_record_id}`}
                  className="base-btn-hero-primary"
                >
                  <span className="isax icon-flask text-sm"></span>
                  <span>Chỉ Định Xét Nghiệm</span>
                </Link>
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="base-btn-hero-primary cursor-pointer flex items-center gap-1.5"
                >
                  <span className="isax icon-arrow-left-2 text-sm"></span>
                  <span>Danh Sách Hồ Sơ</span>
                </button>
              </div>
            </div>
          </div>

          <div className="base-card p-5 space-y-4 rounded-lg">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-full bg-[var(--base-brand-navy)] text-white flex items-center justify-center font-bold text-xl shrink-0">
                  {(record.patient_name || "B")[0]}
                </div>
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-lg font-bold text-gray-900">{record.patient_name}</h2>
                    <span className="base-tag base-tag-info font-mono text-xs font-bold">
                      {record.record_code}
                    </span>
                    <span className="base-tag base-tag-info font-bold text-xs">
                      {record.gender === "female" || record.raw_gender === "Nu" ? "Nữ" : "Nam"} •{" "}
                      {computeAge(record.date_of_birth)} tuổi
                    </span>
                    <span
                      className={`base-tag text-xs font-bold ${
                        record.status === "completed"
                          ? "base-tag-positive"
                          : record.status === "in_progress"
                          ? "base-tag-info"
                          : "base-tag-warning"
                      }`}
                    >
                      {record.status === "completed"
                        ? "Đã chốt"
                        : record.status === "in_progress"
                        ? "Đang khám"
                        : "Chờ khám"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 flex items-center gap-3 flex-wrap">
                    <span>
                      SĐT:{" "}
                      <strong className="text-gray-800 font-mono">{record.phone || "—"}</strong>
                    </span>
                    <span>•</span>
                    <span>
                      BHYT:{" "}
                      <strong className="text-gray-800 font-mono">
                        {record.bhyt || "DN4010123456789"}
                      </strong>
                    </span>
                    <span>•</span>
                    <span>
                      Phòng:{" "}
                      <strong className="text-gray-800">
                        {record.room_name || "Phòng Khám Chuyên Đề Mày Đay"}
                      </strong>
                    </span>
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs font-medium text-gray-500">
                  Tổng UAS7 tuần
                </div>
                <div className="text-2xl font-bold font-mono text-[var(--base-brand-navy)]">
                  {record.uas7_total !== undefined && record.uas7_total !== null
                    ? record.uas7_total
                    : 24}{" "}
                  <span className="text-xs text-gray-400 font-normal">/ 42 điểm</span>
                </div>
              </div>
            </div>

            {/* Persistent Clinical Allergy Strip */}
            <div className="px-4 py-2.5 rounded-lg bg-[#FEE2E2] border border-[#FCA5A5] flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-[#991B1B] font-semibold">
                <span className="isax-b icon-warning-2 text-base shrink-0"></span>
                <span>
                  Tiền sử dị ứng thuốc &amp; phản vệ:{" "}
                  <strong>{record.allergies || "Cần đối chiếu tiền sử dị ứng NSAIDs / Kháng sinh trước khi kê đơn"}</strong>
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-white/80 text-[#991B1B] font-bold border border-[#FCA5A5]">
                Luôn kiểm tra trước kê đơn
              </span>
            </div>
          </div>

          {/* Line Tab Navigation: Examination vs Past History */}
          <TabBar
            tabs={[
              { id: "examination", label: "Khám & kê đơn hiện tại", icon: "clipboard-text" },
              { id: "history", label: "Lịch sử bệnh án cũ", icon: "archive-book", badge: pastRecords.length },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            variant="underline"
          />

          {/* Tab 1: Khám & Kê Đơn Hiện Tại */}
          {activeTab === "examination" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Chẩn đoán & Ghi chú lâm sàng (6 cols) */}
              <div className="lg:col-span-6 space-y-6">
                <div className="base-card p-6 space-y-5 rounded-lg">
                  <div className="pb-3 border-b border-[var(--base-border-opaque)]">
                    <h3 className="text-sm font-bold text-gray-900">
                      1. Chẩn đoán xác định
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Phân tầng mức độ bệnh theo hướng dẫn Bộ Y Tế &amp; EAACI/GA2LEN
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1.5">
                      Phân loại thể mày đay lâm sàng *
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setClinicalType("chronic")}
                        className={`py-2 px-3 rounded-full border text-xs font-bold text-center transition-all cursor-pointer ${
                          clinicalType === "chronic"
                            ? "border-[var(--base-brand-blue)] bg-blue-50 text-[var(--base-brand-navy)]"
                            : "border-[var(--base-border-opaque)] text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        Mạn tính
                      </button>

                      <button
                        type="button"
                        onClick={() => setClinicalType("acute")}
                        className={`py-2 px-3 rounded-full border text-xs font-bold text-center transition-all cursor-pointer ${
                          clinicalType === "acute"
                            ? "border-[var(--base-brand-blue)] bg-blue-50 text-[var(--base-brand-navy)]"
                            : "border-[var(--base-border-opaque)] text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        Cấp tính
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Kết luận chẩn đoán bệnh án *
                    </label>
                    <input
                      type="text"
                      value={diagnosis}
                      onChange={(e) => setDiagnosis(e.target.value)}
                      disabled={record.status === "completed"}
                      className="base-input text-xs font-bold text-gray-900 rounded-lg"
                      placeholder="Nhập chẩn đoán lâm sàng..."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">
                      Chỉ dẫn điều trị &amp; Ghi chú lâm sàng
                    </label>
                    <textarea
                      rows={4}
                      value={doctorNotes}
                      onChange={(e) => setDoctorNotes(e.target.value)}
                      disabled={record.status === "completed"}
                      className="base-textarea text-xs leading-relaxed rounded-lg"
                      placeholder="Nhập ghi chú diễn biến lâm sàng, hẹn tái khám..."
                    />
                  </div>

                  {/* Lab Request Quick Link */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 text-[var(--base-brand-navy)]">
                      <span className="isax icon-flask text-base"></span>
                      <span className="font-semibold">
                        Chỉ định xét nghiệm IgE hoặc test da dị ứng
                      </span>
                    </div>
                    <Link
                      to={`/doctor/lab-requests?recordId=${record.medical_record_id}`}
                      className="font-bold text-[var(--base-brand-blue)] hover:underline flex items-center gap-1"
                    >
                      <span>Chỉ định ngay</span>
                      <span className="isax icon-arrow-right-1 text-xs"></span>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Right Column: Đơn thuốc điện tử (6 cols) */}
              <div className="lg:col-span-6 space-y-6">
                <div className="base-card p-6 space-y-4 rounded-lg">
                  <div className="pb-3 border-b border-[var(--base-border-opaque)] flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-900">
                      2. Đơn thuốc điện tử
                    </h3>
                    {record.status !== "completed" && (
                      <button
                        type="button"
                        onClick={() => setShowAddDrug(true)}
                        className="base-btn base-btn-primary base-btn-sm text-xs cursor-pointer font-bold"
                      >
                        <span className="isax icon-add text-xs"></span>
                        <span>Thêm Thuốc</span>
                      </button>
                    )}
                  </div>

                  {/* Danh mục thuốc */}
                  <div className="space-y-3">
                    {prescriptions.map((p, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 border border-[var(--base-border-opaque)] bg-[var(--base-bg-surface-alt)] rounded-lg flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-bold text-gray-900 flex items-center gap-2">
                            <span>
                              {idx + 1}. {p.drug_name}
                            </span>
                            <span className="font-mono text-[var(--base-brand-blue)] font-bold">
                              ({p.quantity})
                            </span>
                          </div>
                          <div className="text-gray-700">Liều dùng: {p.dosage}</div>
                          <div className="text-xs text-gray-500 italic">{p.instructions}</div>
                        </div>
                        {record.status !== "completed" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveDrug(idx)}
                            className="text-gray-400 hover:text-rose-600 cursor-pointer p-1 rounded-full"
                            title="Xóa thuốc"
                          >
                            <span className="isax icon-trash text-sm"></span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Nút Lưu Đơn & Chốt Bệnh Án */}
                  {record.status !== "completed" ? (
                    <div className="pt-4 border-t border-[var(--base-border-opaque)] grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        disabled={savingRx}
                        onClick={handleSavePrescription}
                        className="base-btn base-btn-secondary w-full py-2.5 font-bold justify-center cursor-pointer text-xs"
                      >
                        <span className="isax icon-document-text text-base"></span>
                        <span>{savingRx ? "Đang lưu..." : "Lưu Đơn Thuốc"}</span>
                      </button>
                      <button
                        type="button"
                        disabled={completing}
                        onClick={handleCompleteRecord}
                        className="base-btn base-btn-primary w-full py-2.5 font-bold justify-center cursor-pointer text-xs"
                      >
                        <span className="isax icon-shield-tick text-base"></span>
                        <span>{completing ? "Đang chốt..." : "Chốt bệnh án"}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold text-center rounded-lg">
                      Bệnh án đã hoàn tất và khóa chỉnh sửa theo quy chuẩn lưu trữ y khoa.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Lịch Sử Bệnh Án Cũ */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-900">
                  Hồ Sơ Tiền Sử &amp; Bệnh Án Các Đợt Trước
                </h2>
                <span className="base-tag base-tag-info text-xs font-mono">
                  Tổng số ca: {pastRecords.length}
                </span>
              </div>

              <div className="space-y-4">
                {pastRecords.map((item) => (
                  <div key={item.medical_record_id} className="base-card p-5 space-y-3 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[var(--base-border-opaque)] gap-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="font-mono font-bold text-sm text-[var(--base-brand-navy)]">
                          {item.record_code}
                        </span>
                        <span className="text-xs text-gray-400">|</span>
                        <span className="text-xs text-gray-600 flex items-center gap-1">
                          <span className="isax icon-calendar text-xs"></span>
                          <span>
                            Ngày khám:{" "}
                            {item.created_at
                              ? new Date(item.created_at).toLocaleDateString("vi-VN")
                              : "—"}
                          </span>
                        </span>
                        <span className="text-xs text-gray-600">
                          Bác sĩ:{" "}
                          <strong>{item.assigned_doctor_name || "BS. Chuyên khoa"}</strong>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="base-tag base-tag-info text-xs font-bold">
                          {item.loai_benh_an === "MAN" || item.clinical_type === "chronic"
                            ? "Mạn tính"
                            : "Cấp tính"}
                        </span>
                        <span
                          className={`base-tag text-xs font-bold ${
                            item.status === "completed"
                              ? "base-tag-positive"
                              : item.status === "in_progress"
                              ? "base-tag-info"
                              : "base-tag-warning"
                          }`}
                        >
                          {item.status === "completed"
                            ? "Đã chốt"
                            : item.status === "in_progress"
                            ? "Đang khám"
                            : "Chờ khám"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="font-bold text-gray-700 block mb-1">Chẩn đoán:</span>
                        <p className="text-gray-900 font-medium">
                          {item.diagnosis || "Theo dõi mày đay"}
                        </p>
                      </div>
                      <div>
                        <span className="font-bold text-gray-700 block mb-1">
                          Tóm tắt &amp; Hướng điều trị:
                        </span>
                        <p className="text-gray-600 leading-relaxed bg-gray-50 p-2.5 border border-gray-200 rounded-lg">
                          {item.visit_summary ||
                            item.instructions ||
                            item.visit_plan ||
                            "Chưa có ghi chú tóm tắt diễn biến."}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Thêm Thuốc */}
      {showAddDrug && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-md w-full rounded-lg">
            <div className="base-modal-header">
              <h3 className="base-modal-title">Thêm Thuốc Mới</h3>
              <button
                type="button"
                onClick={() => setShowAddDrug(false)}
                className="base-modal-close"
              >
                <span className="isax icon-close-circle text-lg"></span>
              </button>
            </div>

            <form onSubmit={handleAddDrug}>
              <div className="base-modal-body space-y-3">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Tên biệt dược &amp; Hàm lượng *
                  </label>
                  <input
                    type="text"
                    value={newDrug.name}
                    onChange={(e) => setNewDrug({ ...newDrug, name: e.target.value })}
                    placeholder="VD: Levocetirizine 5mg (Xyzal)"
                    className="base-input text-xs rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Liều lượng &amp; Thời điểm uống *
                  </label>
                  <input
                    type="text"
                    value={newDrug.dosage}
                    onChange={(e) => setNewDrug({ ...newDrug, dosage: e.target.value })}
                    placeholder="VD: Uống 1 viên vào buổi tối sau ăn"
                    className="base-input text-xs rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Thời gian / Số lượng cấp phát *
                  </label>
                  <input
                    type="text"
                    value={newDrug.quantity}
                    onChange={(e) => setNewDrug({ ...newDrug, quantity: e.target.value })}
                    placeholder="VD: 14 ngày (30 viên)"
                    className="base-input text-xs font-mono rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">
                    Ghi chú lâm sàng cho người bệnh
                  </label>
                  <input
                    type="text"
                    value={newDrug.instructions}
                    onChange={(e) => setNewDrug({ ...newDrug, instructions: e.target.value })}
                    placeholder="VD: Uống đều hàng ngày, không tự ý ngưng thuốc"
                    className="base-input text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="base-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowAddDrug(false)}
                  className="base-btn base-btn-secondary base-btn-compact"
                >
                  Hủy
                </button>
                <button type="submit" className="base-btn base-btn-primary base-btn-compact font-bold">
                  Thêm Vào Đơn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
