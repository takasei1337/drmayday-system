import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";
import { TabBar } from "../../components/ui";

const LOCATION_LABELS = {
  arms: "Cánh tay / Cẳng tay",
  legs: "Đùi / Cẳng chân",
  trunk: "Thân mình / Bụng lưng",
  face: "Vùng mặt / Cổ",
  general: "Rải rác toàn thân",
};

const MILESTONE_MAP = {
  onset: { db: "start", label: "1. Khởi phát" },
  peak: { db: "peak", label: "2. Đỉnh điểm" },
  remission: { db: "normal", label: "3. Thuyên giảm" },
};

function dbMilestoneToLabel(m) {
  if (m === "start") return "1. Khởi phát";
  if (m === "peak") return "2. Đỉnh điểm";
  return "3. Thuyên giảm";
}

export default function LesionTracker({ embedded = false }) {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [phase, setPhase] = useState("onset"); // onset, peak, remission
  const [location, setLocation] = useState("arms");
  const [itchScore, setItchScore] = useState(5);
  const [notes, setNotes] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadGallery = useCallback(async () => {
    setLoading(true);
    try {
      const epRes = await apiClient.get("/lesion-episodes/my", { silent: true });
      const episodes = Array.isArray(epRes.data) ? epRes.data : [];

      const collected = [];
      for (const ep of episodes) {
        const locRes = await apiClient
          .get(`/lesion-locations/episode/${ep.episode_id}`, { silent: true })
          .catch(() => ({ data: [] }));
        const locs = Array.isArray(locRes.data) ? locRes.data : [];
        for (const loc of locs) {
          const pList = Array.isArray(loc.photos) ? loc.photos : [];
          for (const p of pList) {
            collected.push({
              id: p.photo_id,
              phase_label: dbMilestoneToLabel(p.milestone),
              date: p.taken_at
                ? new Date(p.taken_at).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—",
              location: loc.body_part || "Vùng da tổn thương",
              url:
                p.annotated_url ||
                p.attachment?.file_url ||
                "/images/clinic/clinic-urticaria-rash.jpg",
              notes:
                loc.context_other ||
                ep.description ||
                "Ảnh chụp đối chiếu tiến triển lâm sàng 3 mốc",
              hives_count: p.hives_count !== null && p.hives_count !== undefined ? Number(p.hives_count) : null,
              local_auas: p.local_auas !== null && p.local_auas !== undefined ? Number(p.local_auas) : null,
              itch_score: p.itch_score !== null && p.itch_score !== undefined ? Number(p.itch_score) : null,
            });
          }
        }
      }

      setPhotos(collected);
    } catch {
      // Keep empty list if patient has no active record yet
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGallery();
  }, [loadGallery]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleUseSampleImage = async () => {
    try {
      const samplePath =
        phase === "peak"
          ? "/images/clinic/clinic-examination.jpg"
          : "/images/clinic/clinic-urticaria-rash.jpg";
      const resp = await fetch(samplePath);
      const blob = await resp.blob();
      const file = new File([blob], `sample_${phase}_${Date.now()}.jpg`, {
        type: blob.type || "image/jpeg",
      });
      setSelectedFile(file);
      setPreviewUrl(samplePath);
      toast.success("Đã chọn ảnh mẫu lâm sàng để tải lên!");
    } catch {
      toast.error("Không thể nạp ảnh mẫu. Vui lòng chọn tệp từ máy.");
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error("Vui lòng chọn tệp ảnh tổn thương hoặc bấm 'Dùng ảnh mẫu lâm sàng'.");
      return;
    }

    setUploading(true);
    try {
      // 1. Upload file vào bảng `tepdinhkem`
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("purpose", "LESION_PHOTO");
      if (notes.trim()) {
        formData.append("description", notes.trim());
      }

      const upRes = await apiClient.post("/image-attachments/upload", formData);
      const attachmentId = upRes.data?.attachment_id;

      // 2. Lấy hoặc khởi tạo đợt tổn thương đang hoạt động (`dottonthuongda`)
      let episodeId = null;
      const myEpRes = await apiClient.get("/lesion-episodes/my").catch(() => ({ data: [] }));
      const epList = Array.isArray(myEpRes.data) ? myEpRes.data : [];
      if (epList.length > 0) {
        episodeId = epList[0].episode_id;
      } else {
        const createdEp = await apiClient.post("/lesion-episodes", {
          name: `Đợt tổn thương ngày ${new Date().toLocaleDateString("vi-VN")}`,
          description: notes.trim() || "Theo dõi tổn thương sẩn phù 3 mốc",
        });
        episodeId = createdEp.data?.episode_id;
      }

      // 3. Lấy hoặc tạo vị trí cơ thể (`vitritonthuong`)
      const bodyPartLabel = LOCATION_LABELS[location] || "Cánh tay / Cẳng tay";
      const locListRes = await apiClient
        .get(`/lesion-locations/episode/${episodeId}`)
        .catch(() => ({ data: [] }));
      const existingLoc = (Array.isArray(locListRes.data) ? locListRes.data : []).find(
        (l) => l.body_part === bodyPartLabel
      );

      let locationId = existingLoc?.location_id || null;
      if (!locationId) {
        const createdLoc = await apiClient.post("/lesion-locations", {
          episode_id: Number(episodeId),
          body_part: bodyPartLabel,
          context_other: notes.trim() || null,
        });
        locationId = createdLoc.data?.location_id;
      }

      // 4. Lưu bản ghi ảnh chụp 3 mốc (`anhchuptonthuong`)
      const milestoneDb = MILESTONE_MAP[phase]?.db || "start";
      const photoRes = await apiClient.post("/lesion-photos", {
        episode_id: Number(episodeId),
        location_id: Number(locationId),
        attachment_id: Number(attachmentId),
        milestone: milestoneDb,
        itch_score: itchScore,
      });
      const photoId = photoRes.data?.photo_id;

      // 5. Kích hoạt AI Wheal Counter tự động đếm nốt sẩn & tính AUAS cục bộ
      let aiMsg = "";
      if (photoId) {
        try {
          const aiRes = await apiClient.post("/ai/inference", { photo_id: Number(photoId) });
          if (aiRes.data?.hives_count !== undefined) {
            aiMsg = ` — AI phát hiện ${aiRes.data.hives_count} nốt sẩn (AUAS: ${aiRes.data.local_auas})`;
          }
        } catch {
          // Non-blocking AI inference
        }
      }

      toast.success(`Đã lưu ảnh tổn thương vào hồ sơ${aiMsg}!`);
      setNotes("");
      setSelectedFile(null);
      setPreviewUrl("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      await loadGallery();
    } catch (err) {
      toast.error(err.message || "Tải ảnh tổn thương thất bại");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header (Chỉ hiển thị khi mở trang độc lập) */}
      {!embedded && (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--base-border-opaque)]">
          <h1 className="text-lg sm:text-xl font-bold text-[var(--base-brand-navy)] tracking-tight">
            Kho ảnh tổn thương
          </h1>
          <Link
            to="/patient"
            className="base-btn base-btn-secondary base-btn-sm self-start sm:self-auto cursor-pointer"
          >
            <span className="isax icon-arrow-left-2 text-sm"></span>
            <span>Trang chủ</span>
          </Link>
        </div>
      )}

      {/* Module Grouped Sub-navigation (Chỉ hiển thị khi mở trang độc lập) */}
      {!embedded && (
        <TabBar
          tabs={[
            { id: "uas7", label: "Chấm điểm hoạt tính", icon: "task-square" },
            { id: "lesions", label: "Ảnh tổn thương", icon: "camera" },
          ]}
          activeTab="lesions"
          onChange={(tabId) => {
            if (tabId === "uas7") navigate("/patient/uas7");
          }}
          variant="underline"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Upload Form (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <form onSubmit={handleUpload} className="base-card p-5 space-y-4 rounded-2xl">
            <div className="pb-3 border-b border-[var(--base-border-opaque)]">
              <h2 className="text-sm font-semibold text-gray-900">Tải ảnh tổn thương mới</h2>
            </div>

            {/* Mốc giai đoạn */}
            <div>
              <label className="text-xs font-bold text-gray-900 block mb-1.5">Giai đoạn *</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "onset", label: "Khởi phát" },
                  { id: "peak", label: "Đỉnh điểm" },
                  { id: "remission", label: "Thuyên giảm" },
                ].map((p) => (
                  <button
                    type="button"
                    key={p.id}
                    onClick={() => setPhase(p.id)}
                    className={`py-2 px-1 text-xs font-bold rounded-lg border text-center transition-all cursor-pointer ${
                      phase === p.id
                        ? "bg-[rgba(59,99,168,0.12)] border-[var(--base-brand-blue)] text-[var(--base-brand-navy)]"
                        : "border-[var(--base-border-opaque)] text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Vị trí cơ thể */}
            <div>
              <label className="text-xs font-bold text-gray-900 block mb-1.5">
                Vị trí tổn thương xuất hiện *
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="base-input text-xs rounded-2xl"
              >
                <option value="arms">Cánh tay / Cẳng tay</option>
                <option value="legs">Đùi / Cẳng chân</option>
                <option value="trunk">Thân mình / Bụng lưng</option>
                <option value="face">Vùng mặt / Cổ</option>
                <option value="general">Rải rác toàn thân</option>
              </select>
            </div>

            {/* Điểm ngứa tại chỗ NRS (0-10) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-gray-900">
                  Mức độ ngứa tại vị trí chụp (NRS):
                </label>
                <span className="font-mono text-xs font-bold text-[var(--base-brand-blue)]">
                  {itchScore} / 10
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                value={itchScore}
                onChange={(e) => setItchScore(Number(e.target.value))}
                className="w-full accent-[var(--base-brand-blue)] cursor-pointer"
              />
            </div>

            {/* Upload Box */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-gray-900">Tệp ảnh tổn thương *</label>
                <button
                  type="button"
                  onClick={handleUseSampleImage}
                  className="text-xs font-bold text-[var(--base-brand-blue)] hover:underline cursor-pointer"
                >
                  + Dùng ảnh mẫu lâm sàng
                </button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[var(--base-border-opaque)] hover:border-[var(--base-brand-blue)] rounded-2xl p-5 text-center cursor-pointer transition-colors bg-[var(--base-bg-surface-alt)]"
              >
                {previewUrl ? (
                  <div className="space-y-2">
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="h-32 mx-auto rounded-2xl object-cover border border-gray-200"
                    />
                    <p className="text-xs font-bold text-[var(--base-brand-navy)] truncate">
                      {selectedFile?.name}
                    </p>
                  </div>
                ) : (
                  <>
                    <span className="isax icon-camera text-3xl text-[var(--base-brand-blue)] block mb-2"></span>
                    <p className="text-xs font-bold text-gray-800">
                      Bấm để chọn ảnh từ máy ảnh hoặc thư viện
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Định dạng JPG, PNG, WEBP (Dung lượng tối đa 5MB)
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Ghi chú */}
            <div>
              <label className="text-xs font-bold text-gray-900 block mb-1.5">
                Ghi chú thêm triệu chứng kèm theo
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ví dụ: Nóng rát, châm chích nhiều sau khi tắm nước ấm..."
                className="base-input text-xs rounded-2xl"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={uploading}
              className="base-btn base-btn-primary w-full py-2.5 font-bold justify-center cursor-pointer"
            >
              <span className="isax icon-document-upload text-sm"></span>
              <span>
                {uploading ? "Đang tải lên & chạy AI..." : "Lưu Ảnh Tổn Thương Vào Hồ Sơ"}
              </span>
            </button>
          </form>
        </div>

        {/* Gallery 3 Mốc (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--base-border-opaque)]">
            <h2 className="text-sm font-semibold text-gray-900">
              Kho ảnh tổn thương đã ghi nhận
            </h2>
            <span className="base-tag base-tag-info font-mono text-xs font-bold rounded">
              {photos.length} hình ảnh
            </span>
          </div>

          {loading ? (
            <div className="base-card p-6 text-xs text-gray-500 rounded-lg">Đang tải kho ảnh tổn thương...</div>
          ) : photos.length === 0 ? (
            <div className="base-card p-6 text-xs text-gray-500 text-center rounded-lg">
              Chưa có hình ảnh tổn thương nào được tải lên. Hãy chọn giai đoạn và tải ảnh bên trái!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {photos.map((item) => (
                <div key={item.id} className="base-card overflow-hidden group rounded-lg">
                  <div className="relative aspect-4/3 bg-gray-100 overflow-hidden">
                    <img
                      src={item.url}
                      alt={item.notes}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.src = "/images/clinic/clinic-urticaria-rash.jpg";
                      }}
                    />
                    <span className="absolute top-2 left-2 base-tag base-tag-neutral text-xs font-bold rounded bg-white/90">
                      {item.phase_label}
                    </span>
                    {item.hives_count !== null && (
                      <span className="absolute bottom-2 right-2 base-tag base-tag-info text-xs font-mono font-bold rounded bg-white">
                        AI: {item.hives_count} nốt • AUAS {item.local_auas ?? 0}
                      </span>
                    )}
                  </div>
                  <div className="p-3.5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-gray-900">{item.location}</span>
                      <span className="font-mono text-xs text-gray-500">{item.date}</span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2">{item.notes}</p>
                    {item.itch_score !== null && (
                      <div className="text-xs font-mono text-gray-500 pt-0.5">
                        Điểm ngứa NRS: <strong>{item.itch_score}/10</strong>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
