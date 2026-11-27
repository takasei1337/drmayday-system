import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";
import Pagination from "../../components/common/Pagination";
import { TabBar, Button, StatusBadge } from "../../components/ui";
import { UAS7_BANDS, getUas7Band } from "../../utils/uas7";

function mapQueueRow(r) {
  return {
    id: String(r.medical_record_id || r.patient_id),
    medical_record_id: r.medical_record_id ? String(r.medical_record_id) : null,
    record_code: r.record_code || `BN-${r.patient_id}`,
    patient_id: String(r.patient_id),
    patient_name: r.patient_name || "Bệnh nhân",
    patient_phone: r.phone || "",
    clinical_type: r.clinical_type || "acute",
    room_name: r.room_name || "Phòng Khám Tiếp Đón",
    assigned_doctor_name: r.assigned_doctor_name || "Chưa phân công",
    status: r.status || "pending",
    uas7_total: r.uas7_total,
  };
}

export default function DoctorQueue() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all', 'pending', 'in_progress', 'completed'
  const [uasFilter, setUasFilter] = useState("all");
  const [sortBy, setSortBy] = useState("uas7_desc");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    phone: "",
    gender: "female",
    age: 30,
    clinical_type: "chronic",
  });

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/doctor/queue", {
        params: { status: "all", include_completed: "true" },
      });
      const raw = Array.isArray(res.data) ? res.data : [];
      setRecords(raw.map(mapQueueRow));
    } catch {
      // Handled by interceptor
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const q = search.trim();
    if (q.length < 2) {
      setSearchResults(null);
      return;
    }
    const timer = setTimeout(() => {
      apiClient
        .get("/doctor/patients/search", { params: { q } })
        .then((res) => {
          const rows = Array.isArray(res.data) ? res.data : [];
          setSearchResults(rows.filter((x) => x.medical_record_id).map(mapQueueRow));
        })
        .catch(() => {
          setSearchResults(null);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const baseSource = searchResults !== null ? searchResults : records;
  const filtered = baseSource
    .filter((r) => {
      const matchFilter = filter === "all" ? true : r.status === filter;
      const band = getUas7Band(r.uas7_total);
      const matchUas = uasFilter === "all" ? true : band.key === uasFilter;
      if (searchResults !== null) return matchFilter && matchUas;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        r.patient_name.toLowerCase().includes(q) ||
        r.record_code.toLowerCase().includes(q) ||
        r.patient_phone.includes(q);
      return matchFilter && matchUas && matchSearch;
    })
    .sort((a, b) => {
      const sa = a.uas7_total !== null && a.uas7_total !== undefined ? Number(a.uas7_total) : -1;
      const sb = b.uas7_total !== null && b.uas7_total !== undefined ? Number(b.uas7_total) : -1;
      if (sortBy === "uas7_desc") {
        if (sb !== sa) return sb - sa;
      } else if (sortBy === "uas7_asc") {
        const va = sa < 0 ? 999 : sa;
        const vb = sb < 0 ? 999 : sb;
        if (va !== vb) return va - vb;
      }
      return String(a.patient_name).localeCompare(String(b.patient_name));
    });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedRecords = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleAssignToMe = async (record) => {
    if (!record.medical_record_id) return;
    try {
      await apiClient.post(`/doctor/medical-records/${record.medical_record_id}/accept`, {});
      sessionStorage.setItem("activeDoctorRecordId", String(record.medical_record_id));
      toast.success(`Đã tiếp nhận ca khám ${record.record_code}!`);
      navigate(`/doctor/prescriptions?recordId=${record.medical_record_id}`);
    } catch {
      // Handled by interceptor
    }
  };

  const handleOpenDetail = (record) => {
    if (record.medical_record_id) {
      sessionStorage.setItem("activeDoctorRecordId", String(record.medical_record_id));
      navigate(`/doctor/prescriptions?recordId=${record.medical_record_id}`);
    } else {
      navigate("/doctor/prescriptions");
    }
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    const cleanPhone = newPatient.phone.replace(/\s+/g, "").trim();
    if (!newPatient.name.trim() || !cleanPhone) {
      toast.error("Vui lòng nhập họ tên và số điện thoại 10 chữ số!");
      return;
    }
    const birthYear = Math.max(1920, new Date().getFullYear() - (Number(newPatient.age) || 30));
    try {
      const res = await apiClient.post("/doctor/patients", {
        full_name: newPatient.name.trim(),
        phone: cleanPhone,
        gender: newPatient.gender,
        date_of_birth: `${birthYear}-01-01`,
        clinical_type: newPatient.clinical_type,
      });
      setShowAddModal(false);
      setNewPatient({ name: "", phone: "", gender: "female", age: 30, clinical_type: "chronic" });
      toast.success(`Đã tiếp nhận bệnh nhân: ${res.data?.record_code || ""}`);
      await loadQueue();
    } catch {
      // Handled by interceptor
    }
  };

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Hàng Đợi Khám Bệnh</h1>
          </div>
          <div className="base-hero-actions">
            <button
              onClick={() => setShowAddModal(true)}
              className="base-btn-hero-accent cursor-pointer text-xs"
            >
              <span className="isax icon-user-add text-sm"></span>
              <span>Tiếp nhận BN</span>
            </button>
          </div>
        </div>
      </div>

      {/* Unified Filter & Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-[var(--base-border-opaque)] flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        <TabBar
          tabs={[
            { id: "all", label: "Tất cả", icon: "document-text" },
            { id: "pending", label: "Chờ khám", icon: "clock" },
            { id: "in_progress", label: "Đang khám", icon: "health" },
            { id: "completed", label: "Đã khám", icon: "tick-circle" },
          ]}
          activeTab={filter}
          onChange={handleFilterChange}
          variant="underline"
        />

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-56">
            <span className="isax icon-search-normal-1 text-xs absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"></span>
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Tìm tên, SĐT, HIS, BHYT..."
              style={{ paddingLeft: 36 }}
              className="base-input !pl-9 text-xs w-full"
            />
          </div>
          <select
            aria-label="Lọc theo mức độ UAS7"
            value={uasFilter}
            onChange={(e) => {
              setUasFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 py-0 leading-[34px] px-3 rounded-lg border border-[var(--base-border-opaque)] bg-white text-xs font-medium text-slate-700"
          >
            <option value="all">Mức UAS7: Tất cả</option>
            {UAS7_BANDS.slice().reverse().map((b) => (
              <option key={b.key} value={b.key}>
                {b.label} ({b.rangeLabel})
              </option>
            ))}
          </select>

          <select
            aria-label="Sắp xếp hàng đợi"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setCurrentPage(1);
            }}
            className="h-9 py-0 leading-[34px] px-3 rounded-lg border border-[var(--base-border-opaque)] bg-white text-xs font-medium text-slate-700"
          >
            <option value="uas7_desc">Ưu tiên: UAS7 giảm dần</option>
            <option value="uas7_asc">UAS7 tăng dần</option>
            <option value="name_asc">Tên A → Z</option>
          </select>
        </div>
      </div>

      {/* Bảng danh sách hàng đợi — Ưu tiên giữ Tên + UAS7 + Trạng thái + Thao tác khi hẹp */}
      <div className="base-card overflow-hidden">
        <div className="overflow-x-auto base-table-container">
          <table className="base-table w-full">
            <thead>
              <tr>
                <th className="hidden md:table-cell whitespace-nowrap">Mã BA</th>
                <th className="whitespace-nowrap">Bệnh nhân</th>
                <th className="whitespace-nowrap">UAS7 (0–42)</th>
                <th className="hidden lg:table-cell whitespace-nowrap">Số điện thoại</th>
                <th className="hidden xl:table-cell whitespace-nowrap">Thể bệnh</th>
                <th className="hidden xl:table-cell whitespace-nowrap">Phòng</th>
                <th className="hidden lg:table-cell whitespace-nowrap">Bác sĩ</th>
                <th className="whitespace-nowrap">Trạng thái</th>
                <th className="text-right w-[124px] whitespace-nowrap sticky-action-col">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-400 text-xs">
                    Đang đồng bộ hàng đợi khám bệnh từ máy chủ...
                  </td>
                </tr>
              ) : paginatedRecords.length > 0 ? (
                paginatedRecords.map((r) => {
                  const band = getUas7Band(r.uas7_total);
                  const hasScore = r.uas7_total !== null && r.uas7_total !== undefined;
                  return (
                  <tr key={r.id}>
                    <td className="hidden md:table-cell font-mono font-bold text-xs text-[var(--base-brand-navy)] whitespace-nowrap">
                      {r.record_code}
                    </td>
                    <td className="font-bold text-xs text-gray-900 whitespace-nowrap">
                      <div>{r.patient_name}</div>
                      <div className="md:hidden font-mono text-[11px] font-medium text-slate-500">{r.record_code}</div>
                    </td>
                    <td className="whitespace-nowrap">
                      <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold font-mono"
                        style={{ backgroundColor: band.bg, color: band.fg, border: `1px solid ${band.border}` }}
                      >
                        <span>{hasScore ? `${String(r.uas7_total).padStart(2, "0")}/42` : "—"}</span>
                        <span className="font-sans">· {band.label}</span>
                      </span>
                    </td>
                    <td className="hidden lg:table-cell font-mono text-xs text-gray-600 whitespace-nowrap">
                      {r.patient_phone || "—"}
                    </td>
                    <td className="hidden xl:table-cell whitespace-nowrap">
                      {r.clinical_type === "chronic" ? (
                        <span className="base-tag base-tag-info font-bold text-xs">
                          Mạn tính
                        </span>
                      ) : (
                        <span className="base-tag base-tag-warning font-bold text-xs">
                          Cấp tính
                        </span>
                      )}
                    </td>
                    <td className="hidden xl:table-cell text-xs text-gray-600 whitespace-nowrap">{r.room_name}</td>
                    <td className="hidden lg:table-cell text-xs font-semibold text-gray-800 whitespace-nowrap">
                      {r.assigned_doctor_name}
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
                    <td className="text-right whitespace-nowrap sticky-action-col">
                      {r.status === "pending" ? (
                        <Button
                          variant="primary"
                          size="sm"
                          tableAction
                          leadingIcon="user-tick"
                          onClick={() => handleAssignToMe(r)}
                        >
                          Khám
                        </Button>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          tableAction
                          leadingIcon="health"
                          onClick={() => handleOpenDetail(r)}
                        >
                          Chi tiết
                        </Button>
                      )}
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-gray-400 text-xs">
                    <span className="isax icon-document text-3xl block mb-2 text-gray-300"></span>
                    Không có ca khám nào phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filtered.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={(newSize) => {
            setPageSize(newSize);
            setCurrentPage(1);
          }}
          pageSizeOptions={[5, 10, 20]}
        />
      </div>

      {/* Modal Tiếp nhận BN mới */}
      {showAddModal && (
        <div className="base-modal-backdrop">
          <div className="base-modal-dialog max-w-md w-full">
            <div className="base-modal-header">
              <h3 className="base-modal-title">Tiếp nhận bệnh nhân tại quầy</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="base-modal-close cursor-pointer"
                aria-label="Đóng"
              >
                <span className="isax-b icon-close-circle text-xl"></span>
              </button>
            </div>

            <form onSubmit={handleCreatePatient}>
              <div className="base-modal-body space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                    placeholder="VD: Trần Văn Bình"
                    className="base-input text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Số điện thoại (10 số) *</label>
                  <input
                    type="tel"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({ ...newPatient, phone: e.target.value })}
                    placeholder="VD: 0987654321"
                    className="base-input text-xs font-mono"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Giới tính</label>
                    <select
                      value={newPatient.gender}
                      onChange={(e) => setNewPatient({ ...newPatient, gender: e.target.value })}
                      className="base-input text-xs"
                    >
                      <option value="female">Nữ</option>
                      <option value="male">Nam</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-700 block mb-1">Tuổi</label>
                    <input
                      type="number"
                      value={newPatient.age}
                      onChange={(e) => setNewPatient({ ...newPatient, age: e.target.value })}
                      className="base-input text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-700 block mb-1">Thể bệnh dự kiến</label>
                  <select
                    value={newPatient.clinical_type}
                    onChange={(e) => setNewPatient({ ...newPatient, clinical_type: e.target.value })}
                    className="base-input text-xs"
                  >
                    <option value="chronic">Mạn tính (≥ 6 tuần)</option>
                    <option value="acute">Cấp tính (&lt; 6 tuần)</option>
                  </select>
                </div>
              </div>

              <div className="base-modal-footer">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowAddModal(false)}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="submit"
                >
                  Tiếp nhận vào hàng đợi
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
