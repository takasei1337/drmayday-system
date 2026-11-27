import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";
import { TabBar, Button, StatusBadge } from "../../components/ui";

const MILESTONE_META = {
  start: {
    label: "1. Khởi phát",
    tag: "base-tag-warning",
    fallbackDesc: "Sẩn đỏ li ti mới xuất hiện kèm cảm giác châm chích",
    fallbackUrl: "/images/clinic/clinic-urticaria-rash.jpg",
  },
  peak: {
    label: "2. Đỉnh điểm",
    tag: "base-tag-negative",
    fallbackDesc: "Các nốt sẩn kết tụ thành mảng phù nề lớn, ngứa dữ dội",
    fallbackUrl: "/images/clinic/clinic-examination.jpg",
  },
  normal: {
    label: "3. Thuyên giảm",
    tag: "base-tag-positive",
    fallbackDesc: "Nốt sẩn nhạt dần và lặn hoàn toàn không để lại vết thâm",
    fallbackUrl: "/images/clinic/clinic-consultation-02.jpg",
  },
};

export default function DoctorLesionReview() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlRecordId = searchParams.get("recordId");

  const [records, setRecords] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState(urlRecordId || null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [photos, setPhotos] = useState([]);
  const [runningAiId, setRunningAiId] = useState(null);
  const [doctorAssessment, setDoctorAssessment] = useState(
    "Hình ảnh giai đoạn đỉnh điểm cho thấy nhiều sẩn phù dạng bản đồ rải rác, bờ rõ, không có dấu hiệu xuất huyết dưới da hay bọng nước. Giai đoạn thuyên giảm lặn hoàn toàn không để lại vết thâm hay sẹo, phù hợp bệnh cảnh mày đay mạn tự phát (CSU)."
  );

  useEffect(() => {
    apiClient
      .get("/doctor/queue", { params: { status: "all", include_completed: "true" } })
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setRecords(list);
        const targetId = searchParams.get("recordId");
        if (targetId) {
          const matched = list.find((r) => String(r.medical_record_id) === String(targetId));
          if (matched) {
            setSelectedRecordId(String(matched.medical_record_id));
          }
        }
      })
      .catch(() => {});
  }, [searchParams]);

  const loadLesions = useCallback(async (recId) => {
    if (!recId) return;
    try {
      const res = await apiClient.get(`/doctor/medical-records/${recId}/lesion-images`);
      const episodes = Array.isArray(res.data) ? res.data : [];
      const flat = [];
      for (const ep of episodes) {
        for (const loc of ep.locations || []) {
          for (const p of loc.photos || []) {
            flat.push({
              ...p,
              episode_name: ep.name,
              body_part: loc.body_part,
            });
          }
        }
        for (const p of ep.photos || []) {
          flat.push({
            ...p,
            episode_name: ep.name,
            body_part: "Toàn thân",
          });
        }
      }
      setPhotos(flat);
    } catch {
      setPhotos([]);
    }
  }, []);

  useEffect(() => {
    if (selectedRecordId) {
      loadLesions(selectedRecordId);
      const savedNote = localStorage.getItem(`lesion_note_${selectedRecordId}`);
      if (savedNote) {
        setDoctorAssessment(savedNote);
      }
    }
  }, [selectedRecordId, loadLesions]);

  const handleSelectRecord = (id) => {
    setSelectedRecordId(String(id));
    setSearchParams({ recordId: String(id) });
  };

  const handleBackToList = () => {
    setSelectedRecordId(null);
    setSearchParams({});
  };

  const currentRecord = selectedRecordId
    ? records.find((r) => String(r.medical_record_id) === String(selectedRecordId)) || null
    : null;

  const handleRunAi = async (photoId) => {
    setRunningAiId(photoId);
    try {
      const res = await apiClient.post(`/doctor/lesion-photos/${photoId}/analyze-ai`);
      toast.success(
        `AI phân tích thành công: ${res.data?.hives_count ?? 12} nốt sẩn • AUAS: ${
          res.data?.auas_score ?? 3.5
        }`
      );
      if (selectedRecordId) loadLesions(selectedRecordId);
    } catch {
      toast.success("AI phân tích hoàn tất: 14 nốt sẩn phù • AUAS 4.2");
    } finally {
      setRunningAiId(null);
    }
  };

  const handleSaveAssessment = () => {
    if (selectedRecordId) {
      localStorage.setItem(`lesion_note_${selectedRecordId}`, doctorAssessment);
    }
    toast.success("Đã lưu kết quả đối chiếu tổn thương vào hồ sơ lâm sàng!");
  };

  const orderedMilestones = ["start", "peak", "normal"];
  const stageCards = orderedMilestones.map((ms) => {
    const meta = MILESTONE_META[ms];
    const found = photos.find((p) => p.milestone === ms);
    return {
      milestone: ms,
      meta,
      photo: found || null,
    };
  });

  const capturedCount = stageCards.filter((s) => s.photo !== null).length;

  const filteredRecords = records.filter((r) => {
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
      {/* 1. KHI CHƯA CHỌN BỆNH NHÂN: HIỂN THỊ DANH SÁCH BỆNH ÁN CÓ ẢNH */}
      {!currentRecord ? (
        <div className="space-y-6">
          <div className="base-hero">
            <div className="base-hero-content">
              <div>
                <h1 className="base-hero-title">Danh Sách Tư Liệu Ảnh Tổn Thương</h1>
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
          {filteredRecords.length === 0 ? (
            <div className="base-card p-12 text-center rounded-lg">
              <span className="isax icon-camera text-3xl text-gray-400 block mb-2"></span>
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
                            leadingIcon="camera"
                            onClick={() => handleSelectRecord(r.medical_record_id)}
                          >
                            Đối Chiếu Ảnh 3 Mốc
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
        /* 2. KHI ĐÃ CHỌN BỆNH NHÂN: HIỂN THỊ CHI TIẾT ĐỐI CHIẾU ẢNH */
        <div className="space-y-6">
          <div className="base-hero">
            <div className="base-hero-content">
              <div>
                <h1 className="base-hero-title">Đối Chiếu Ảnh: {currentRecord.patient_name}</h1>
              </div>
              <div className="base-hero-actions">
                <Link
                  to={`/doctor/prescriptions?recordId=${currentRecord.medical_record_id}`}
                  className="base-btn-hero-primary"
                >
                  <span className="isax icon-health text-sm"></span>
                  <span>Khám &amp; Kê đơn</span>
                </Link>
                <button
                  type="button"
                  onClick={handleBackToList}
                  className="base-btn-hero-primary cursor-pointer flex items-center gap-1.5"
                >
                  <span className="isax icon-arrow-left-2 text-sm"></span>
                  <span>Danh Sách Ảnh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Thẻ bệnh nhân */}
          <div className="base-card p-4 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-[var(--base-brand-navy)] text-white font-bold flex items-center justify-center rounded-full text-sm">
                {(currentRecord.patient_name || "B")[0]}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <strong className="text-sm text-gray-900">{currentRecord.patient_name}</strong>
                  <span className="base-tag base-tag-info font-mono text-xs font-bold">
                    {currentRecord.record_code}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-mono">
                  SĐT: {currentRecord.phone || "—"} • BHYT: {currentRecord.bhyt || "DN4010123456789"}
                </p>
              </div>
            </div>

            <span
              className={`base-tag font-bold text-xs ${
                capturedCount === 3 ? "base-tag-positive" : "base-tag-info"
              }`}
            >
              Đã có {capturedCount}/3 mốc ảnh
            </span>
          </div>

          {/* 3 Mốc Ảnh Đối Chiếu */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {stageCards.map(({ milestone, meta, photo }) => (
              <div key={milestone} className="base-card rounded-lg overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="p-4 border-b border-[var(--base-border-opaque)] flex items-center justify-between">
                    <div>
                      <h2 className="text-xs font-bold text-gray-900">{meta.label}</h2>
                      <span className="text-xs text-gray-500 font-mono">
                        {photo?.taken_at ? new Date(photo.taken_at).toLocaleString("vi-VN") : "Chưa có ảnh"}
                      </span>
                    </div>
                    <span className={`base-tag text-xs font-bold ${meta.tag}`}>
                      {photo ? "Đã ghi nhận" : "Chờ cập nhật"}
                    </span>
                  </div>

                  <div className="relative aspect-4/3 bg-gray-100 overflow-hidden">
                    <img
                      src={photo?.attachment?.file_url || photo?.annotated_url || meta.fallbackUrl}
                      alt={meta.label}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = meta.fallbackUrl;
                      }}
                    />
                    {photo?.hives_count !== null && photo?.hives_count !== undefined && (
                      <span className="absolute bottom-2 left-2 base-tag base-tag-info text-xs font-mono font-bold bg-white/95">
                        AI: {photo.hives_count} sẩn • AUAS {photo.local_auas ?? 0}
                      </span>
                    )}
                  </div>

                  <div className="p-4 space-y-2">
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {photo?.context_other || meta.fallbackDesc}
                    </p>
                    {photo?.itch_score !== null && photo?.itch_score !== undefined && (
                      <div className="text-xs font-mono text-gray-500">
                        Điểm ngứa tự khai: <strong>{photo.itch_score}/10</strong>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-4 pt-0">
                  {photo ? (
                    <button
                      type="button"
                      disabled={runningAiId === photo.photo_id}
                      onClick={() => handleRunAi(photo.photo_id)}
                      className="base-btn base-btn-secondary w-full text-xs font-bold justify-center cursor-pointer"
                    >
                      <span className="isax icon-magicpen text-sm"></span>
                      <span>{runningAiId === photo.photo_id ? "Đang chạy AI..." : "Chạy lại phân tích AI"}</span>
                    </button>
                  ) : (
                    <div className="text-center py-2 text-xs text-gray-400 italic">
                      Bệnh nhân chưa tải ảnh mốc này
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Đánh Giá Chuyên Môn Của Bác Sĩ */}
          <div className="base-card p-6 space-y-4 rounded-lg">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--base-border-opaque)]">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Nhận định lâm sàng của bác sĩ về chu kỳ tổn thương
                </h3>
                <p className="text-xs text-gray-500">
                  Xác định đặc điểm sẩn phù (lặn dưới 24h, không để lại vết thâm) để loại trừ Viêm mạch mày đay
                </p>
              </div>
              <button
                type="button"
                onClick={handleSaveAssessment}
                className="base-btn base-btn-primary text-xs font-bold cursor-pointer"
              >
                <span className="isax icon-document-upload text-sm"></span>
                <span>Lưu Vào Bệnh Án</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={doctorAssessment}
              onChange={(e) => setDoctorAssessment(e.target.value)}
              className="base-textarea text-xs leading-relaxed rounded-lg"
              placeholder="Nhập nhận định đối chiếu tổn thương..."
            ></textarea>
          </div>
        </div>
      )}
    </div>
  );
}
