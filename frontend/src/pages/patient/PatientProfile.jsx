import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";
import { StatusBadge } from "../../components/ui";

export default function PatientProfile() {
  const [profile, setProfile] = useState({
    user_id: null,
    full_name: "",
    phone: "",
    gender: "Nữ",
    dob: "",
    ma_his: "",
    bhyt: "",
    address: "",
    emergency_contact: "",
    emergency_phone: "",
  });

  const [records, setRecords] = useState([]);
  const [saving, setSaving] = useState(false);

  const [selectedRecord, setSelectedRecord] = useState(null);
  const [modalPrescriptions, setModalPrescriptions] = useState([]);
  const [modalLabResults, setModalLabResults] = useState([]);
  const [loadingModal, setLoadingModal] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchProfileAndHistory() {
      let stored = {};
      try {
        stored = JSON.parse(localStorage.getItem("user") || "{}") || {};
      } catch {
        stored = {};
      }
      try {
        const res = await apiClient.get("/profile", { silent: true });
        const p = res.data || {};
        if (cancelled) return;

        const addrParts = [p.hamlet_address, p.commune_address, p.city_address].filter(Boolean);
        setProfile({
          user_id: p.user_id ?? stored.user_id ?? null,
          full_name: p.full_name || stored.full_name || "",
          phone: p.phone || stored.phone || "",
          gender: p.gioi_tinh === "Nam" || p.gender === "Nam" ? "Nam" : "Nữ",
          dob: p.date_of_birth || "",
          ma_his: p.ma_his || stored.ma_his || "",
          bhyt: p.health_insurance_number || "",
          address: addrParts.join(", ") || p.city_address || "",
          emergency_contact: p.next_of_kin_name || "",
          emergency_phone: p.next_of_kin_phone || "",
        });

        const uid = p.user_id ?? stored.user_id;
        if (uid) {
          const histRes = await apiClient
            .get(`/medical_records/patients/${uid}/history`, { silent: true })
            .catch(() => ({ data: [] }));
          if (!cancelled) {
            setRecords(Array.isArray(histRes.data) ? histRes.data : []);
          }
        }
      } catch {
        if (!cancelled) {
          setProfile((prev) => ({
            ...prev,
            user_id: prev.user_id ?? stored.user_id ?? null,
            full_name: prev.full_name || stored.full_name || "",
            phone: prev.phone || stored.phone || "",
            ma_his: prev.ma_his || stored.ma_his || "",
          }));
        }
      }
    }

    fetchProfileAndHistory();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!profile.full_name.trim()) {
      toast.error("Họ và tên không được để trống");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        full_name: profile.full_name.trim(),
        gender: profile.gender === "Nam" ? "Nam" : "Nu",
        city_address: profile.address.trim() || null,
        next_of_kin_name: profile.emergency_contact.trim() || null,
      };

      if (profile.dob) {
        payload.date_of_birth = profile.dob;
      }
      if (profile.ma_his.trim()) {
        payload.ma_his = profile.ma_his.trim();
      }
      if (profile.bhyt.trim()) {
        payload.health_insurance_number = profile.bhyt.trim().toUpperCase();
      }
      const cleanKinPhone = profile.emergency_phone.replace(/\s+/g, "");
      if (/^[0-9]{10}$/.test(cleanKinPhone)) {
        payload.next_of_kin_phone = cleanKinPhone;
      }

      const res = await apiClient.put("/profile", payload);
      const updated = res.data || {};

      try {
        const stored = JSON.parse(localStorage.getItem("user") || "{}");
        stored.full_name = updated.full_name || profile.full_name.trim();
        localStorage.setItem("user", JSON.stringify(stored));
      } catch {
        // Ignore storage error
      }

      toast.success("Đã cập nhật thông tin hồ sơ y tế thành công!");
    } catch (err) {
      toast.error(err.message || "Cập nhật hồ sơ thất bại");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenRecordModal = async (rec) => {
    setSelectedRecord(rec);
    setModalPrescriptions([]);
    setModalLabResults([]);
    setLoadingModal(true);

    try {
      const [rxRes, labRes] = await Promise.all([
        apiClient.get(`/prescriptions/${rec.medical_record_id}`).catch(() => ({ data: [] })),
        apiClient.get(`/lab-results/${rec.medical_record_id}`).catch(() => ({ data: [] })),
      ]);

      const rxHeaders = Array.isArray(rxRes.data) ? rxRes.data : [];
      const flatRx = [];
      for (const h of rxHeaders) {
        const items = Array.isArray(h.items) ? h.items : [];
        for (const it of items) {
          flatRx.push({
            drug_name: it.ten_thuoc || it.ten_thuoc_bo_sung || "Thuốc điều trị",
            dosage: it.lieu_dung || "Theo chỉ dẫn bác sĩ",
            quantity: it.thoi_gian_dung || "Theo đơn",
            note: h.notes || "",
            stop_notice: h.stop_medication_next_visit ? h.medications_to_stop : null,
          });
        }
      }
      setModalPrescriptions(flatRx);
      const rawLabs = Array.isArray(labRes.data) ? labRes.data : [];
      const mappedLabs = rawLabs.map((row) => {
        const metrics = [];
        if (row.ige_toan_phan != null) metrics.push(`IgE: ${row.ige_toan_phan} IU/mL`);
        if (row.wbc != null) metrics.push(`WBC: ${row.wbc} G/L`);
        if (row.crp != null) metrics.push(`CRP: ${row.crp} mg/L`);
        if (row.anti_tpo != null) metrics.push(`Anti-TPO: ${row.anti_tpo} IU/mL`);
        if (row.tsh != null) metrics.push(`TSH: ${row.tsh} mIU/L`);
        return {
          lab_result_id: row.ma_ket_qua_can_lam_sang || row.lab_result_id,
          test_name: row.xet_nghiem_khac || "Xét nghiệm miễn dịch - huyết học",
          result_value: metrics.length > 0 ? metrics.join(" • ") : null,
          status: metrics.length > 0 ? "completed" : "ordered",
        };
      });
      setModalLabResults(mappedLabs);
    } finally {
      setLoadingModal(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--base-border-opaque)]">
        <h1 className="text-lg sm:text-xl font-bold text-[var(--base-brand-navy)] tracking-tight">
          Hồ sơ cá nhân &amp; BHYT
        </h1>
        <StatusBadge
          variant="active"
          label={profile.bhyt ? "BHYT hợp lệ" : "Hồ sơ xác thực"}
          dot
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Form Hồ sơ cá nhân (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <form onSubmit={handleSave} className="base-card p-5 space-y-4 rounded-lg">
            <div className="pb-3 border-b border-[var(--base-border-opaque)] flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900">
                Thông tin hành chính &amp; thẻ BHYT
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Họ và tên bệnh nhân *
                </label>
                <input
                  type="text"
                  value={profile.full_name}
                  onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  className="base-input font-semibold text-xs"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Số điện thoại đăng nhập
                </label>
                <input
                  type="text"
                  value={profile.phone}
                  disabled
                  className="base-input text-xs font-mono bg-gray-50 text-gray-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Ngày sinh</label>
                <input
                  type="date"
                  value={profile.dob}
                  onChange={(e) => setProfile({ ...profile, dob: e.target.value })}
                  className="base-input text-xs font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Giới tính</label>
                <select
                  value={profile.gender}
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                  className="base-select text-xs w-full"
                >
                  <option value="Nữ">Nữ</option>
                  <option value="Nam">Nam</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Số thẻ BHYT
                </label>
                <input
                  type="text"
                  value={profile.bhyt}
                  onChange={(e) => setProfile({ ...profile, bhyt: e.target.value })}
                  placeholder="VD: DN4010123456789"
                  className="base-input text-xs font-mono font-bold text-[var(--base-brand-navy)]"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-gray-700 block mb-1">
                  Mã bệnh nhân HIS
                </label>
                <input
                  type="text"
                  value={profile.ma_his}
                  onChange={(e) => setProfile({ ...profile, ma_his: e.target.value })}
                  placeholder="VD: HIS-BN-2026-001"
                  className="base-input text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-700 block mb-1">
                Địa chỉ thường trú
              </label>
              <input
                type="text"
                value={profile.address}
                onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                className="base-input text-xs"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Người thân liên hệ khẩn cấp
                </label>
                <input
                  type="text"
                  value={profile.emergency_contact}
                  onChange={(e) => setProfile({ ...profile, emergency_contact: e.target.value })}
                  placeholder="VD: Nguyễn Văn Tuấn (Chồng)"
                  className="base-input text-xs"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">
                  Số điện thoại người thân
                </label>
                <input
                  type="tel"
                  value={profile.emergency_phone}
                  onChange={(e) => setProfile({ ...profile, emergency_phone: e.target.value })}
                  placeholder="VD: 0987111222"
                  className="base-input text-xs font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="base-btn base-btn-primary w-full py-2.5 font-semibold justify-center cursor-pointer mt-2"
            >
              <span className="isax icon-tick-circle text-sm"></span>
              <span>{saving ? "Đang lưu..." : "Lưu thông tin hồ sơ"}</span>
            </button>
          </form>
        </div>

        {/* Lịch sử bệnh án & Đơn thuốc điện tử (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="base-card p-5 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 pb-3 border-b border-[var(--base-border-opaque)] mb-3">
              Lịch sử hồ sơ khám ({records.length})
            </h3>
            {records.length === 0 ? (
              <p className="text-xs text-gray-500 italic">
                Chưa có hồ sơ khám bệnh nào được ghi nhận.
              </p>
            ) : (
              <div className="space-y-3">
                {records.map((rec) => (
                  <div
                    key={rec.medical_record_id}
                    className="p-3.5 rounded-lg border border-[var(--base-border-opaque)] hover:bg-[var(--base-bg-surface-alt)] transition-colors cursor-pointer"
                    onClick={() => handleOpenRecordModal(rec)}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-[var(--base-brand-blue)]">
                        {rec.record_code}
                      </span>
                      <StatusBadge
                        variant={
                          rec.status === "completed"
                            ? "completed"
                            : rec.status === "in_progress"
                            ? "in_progress"
                            : "pending"
                        }
                        label={
                          rec.status === "completed"
                            ? "Đã chốt"
                            : rec.status === "in_progress"
                            ? "Đang khám"
                            : "Chờ khám"
                        }
                        dot
                      />
                    </div>
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {rec.diagnosis || "Theo dõi mày đay"}
                    </p>
                    <div className="flex items-center justify-between text-xs text-gray-500 mt-2 pt-2 border-t border-[var(--base-border-opaque)]">
                      <span>{rec.assigned_doctor_name || "Chờ phân công bác sĩ"}</span>
                      <span className="text-[var(--base-brand-blue)] font-bold flex items-center gap-1 text-xs">
                        Đơn thuốc &amp; XN{" "}
                        <span className="isax icon-arrow-right-1 text-xs"></span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal xem đơn thuốc & kết quả xét nghiệm */}
      {selectedRecord && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-xl w-full rounded-lg">
            <div className="base-modal-header">
              <div>
                <h3 className="base-modal-title">
                  Hồ Sơ Lâm Sàng — {selectedRecord.record_code}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {profile.full_name} • Bác sĩ:{" "}
                  {selectedRecord.assigned_doctor_name || "Chưa phân công"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="base-modal-close"
              >
                <span className="isax icon-close-circle text-lg"></span>
              </button>
            </div>

            <div className="base-modal-body space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-3 rounded-lg bg-[var(--base-bg-surface-alt)] border border-[var(--base-border-opaque)] text-xs space-y-1">
                <div>
                  <strong>Chẩn đoán:</strong> {selectedRecord.diagnosis || "Theo dõi mày đay"}
                </div>
                {selectedRecord.instructions && (
                  <div className="text-gray-600">
                    <strong>Lời dặn bác sĩ:</strong> {selectedRecord.instructions}
                  </div>
                )}
              </div>

              {loadingModal ? (
                <p className="text-xs text-gray-500">Đang tải đơn thuốc và cận lâm sàng...</p>
              ) : (
                <>
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-800">
                      Danh mục thuốc điều trị ({modalPrescriptions.length})
                    </h4>
                    {modalPrescriptions.length > 0 ? (
                      <div className="divide-y divide-[var(--base-border-opaque)] border border-[var(--base-border-opaque)] rounded-lg overflow-hidden">
                        {modalPrescriptions.map((p, idx) => (
                          <div key={idx} className="p-3 text-xs">
                            <div className="flex items-center justify-between font-bold text-gray-900">
                              <span>
                                {idx + 1}. {p.drug_name}
                              </span>
                              <span className="font-mono text-[var(--base-brand-blue)]">
                                {p.quantity}
                              </span>
                            </div>
                            <p className="text-gray-600 mt-0.5">Liều dùng: {p.dosage}</p>
                            {p.note && (
                              <p className="text-xs text-gray-500 mt-0.5 italic">{p.note}</p>
                            )}
                            {p.stop_notice && (
                              <p className="text-xs text-amber-700 font-semibold mt-1">
                                Lưu ý ngừng thuốc trước tái khám: {p.stop_notice}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        Chưa có đơn thuốc kê cho ca khám này.
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-gray-800">
                      Kết quả cận lâm sàng ({modalLabResults.length})
                    </h4>
                    {modalLabResults.length > 0 ? (
                      <div className="divide-y divide-[var(--base-border-opaque)] border border-[var(--base-border-opaque)] rounded-lg overflow-hidden">
                        {modalLabResults.map((lab) => (
                          <div
                            key={lab.lab_result_id}
                            className="p-3 text-xs flex items-center justify-between gap-2"
                          >
                            <div>
                              <div className="font-bold text-gray-900">{lab.test_name}</div>
                              <div className="text-xs text-gray-500">
                                Giá trị:{" "}
                                <strong className="font-mono text-gray-800">
                                  {lab.result_value || "Đang chờ kết quả"}{" "}
                                  {lab.unit || ""}
                                </strong>
                              </div>
                            </div>
                            <span
                              className={`base-tag rounded text-xs font-bold ${
                                lab.status === "completed"
                                    ? "base-tag-positive"
                                  : "base-tag-warning"
                              }`}
                            >
                              {lab.status === "completed" ? "Đã có KQ" : "Đang thực hiện"}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">
                        Không có chỉ định xét nghiệm cho ca khám này.
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="base-modal-footer">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="base-btn base-btn-secondary base-btn-compact"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
