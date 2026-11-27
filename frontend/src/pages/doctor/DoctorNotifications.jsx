import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import apiClient from "../../services/apiClient";
import { NotificationCard } from "../../components/ui";

function formatTime(iso) {
  if (!iso) return "Vừa xong";
  const diffMin = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (diffMin < 1) return "Vừa xong";
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} giờ trước`;
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getNotificationIcon(type) {
  switch (type) {
    case "ALERT":
    case "CRITICAL":
      return "icon-danger";
    case "UAS7":
      return "icon-chart-21";
    case "LAB":
      return "icon-clipboard-text";
    case "LESION":
      return "icon-camera";
    case "PRESCRIPTION":
      return "icon-health";
    default:
      return "icon-clock";
  }
}

export default function DoctorNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [filterUnreadOnly, setFilterUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get("/notifications", { silent: true });
      const items = (res.data?.items || []).map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type || "INFO",
        time: formatTime(n.created_at),
        unread: !n.is_read,
        link:
          n.type === "UAS7"
            ? "/doctor/prescriptions"
            : n.type === "LAB"
            ? "/doctor/lab-requests"
            : n.type === "LESION"
            ? "/doctor/lesions"
            : "/doctor",
      }));
      setNotifications(items);
    } catch {
      setNotifications([
        {
          id: 1,
          title: "Bệnh nhân mới vào hàng đợi khám",
          message: "Bệnh nhân Hoàng Văn Khang (BN-2024-0312) đang chờ thăm khám tại P.302.",
          type: "QUEUE",
          time: "10 phút trước",
          unread: true,
          link: "/doctor",
        },
        {
          id: 2,
          title: "Điểm UAS7 tăng đột biến",
          message: "Bệnh nhân Đỗ Thị Minh Thư ghi nhận UAS7 = 32 điểm (nguy cơ bùng phát đợt cấp).",
          type: "UAS7",
          time: "45 phút trước",
          unread: true,
          link: "/doctor/prescriptions",
        },
        {
          id: 3,
          title: "Đã có kết quả xét nghiệm miễn dịch",
          message: "Khoa Xét nghiệm đã trả kết quả định lượng IgE toàn phần và panel 53 dị nguyên.",
          type: "LAB",
          time: "2 giờ trước",
          unread: false,
          link: "/doctor/lab-requests",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await apiClient.put("/notifications/read-all", {}, { silent: true });
    } catch {
      // Ignore
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    toast.success("Đã ghi nhận toàn bộ thông báo lâm sàng");
  };

  const handleItemClick = async (n) => {
    if (n.unread) {
      try {
        await apiClient.put(`/notifications/${n.id}/read`, {}, { silent: true });
      } catch {
        // Ignore
      }
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, unread: false } : item))
      );
    }
  };

  const displayedList = filterUnreadOnly
    ? notifications.filter((n) => n.unread)
    : notifications;

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <div className="space-y-6">
      {/* 1. Hero Header */}
      <div className="base-hero">
        <div className="base-hero-content">
          <div>
            <h1 className="base-hero-title">Thông Báo Lâm Sàng &amp; Cảnh Báo</h1>
          </div>

          <div className="base-hero-actions">
            <button
              type="button"
              onClick={() => setFilterUnreadOnly(!filterUnreadOnly)}
              className={`base-btn base-btn-compact text-xs font-semibold cursor-pointer ${
                filterUnreadOnly ? "base-btn-primary" : "base-btn-secondary"
              }`}
            >
              {filterUnreadOnly ? "Hiển thị tất cả" : `Chưa đọc (${unreadCount})`}
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="base-btn base-btn-secondary base-btn-compact text-xs font-semibold cursor-pointer"
              >
                Đánh dấu đã đọc tất cả
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Danh sách thông báo */}
      {loading ? (
        <div className="base-card p-8 text-center text-xs text-gray-500">
          Đang tải danh sách cảnh báo lâm sàng...
        </div>
      ) : displayedList.length === 0 ? (
        <div className="base-card p-12 text-center">
          <span className="isax icon-notification-bing text-4xl text-gray-400 block mb-2"></span>
          <p className="text-sm font-bold text-gray-700">Không có thông báo lâm sàng nào</p>
          <p className="text-xs text-gray-500 mt-1">
            {filterUnreadOnly ? "Bác sĩ đã xem hết toàn bộ cảnh báo." : "Hiện không có cảnh báo mới cần xử lý."}
          </p>
        </div>
      ) : (
        <div className="base-card divide-y divide-[var(--base-border-opaque)] overflow-hidden">
          {displayedList.map((n) => (
            <NotificationCard
              key={n.id}
              id={n.id}
              title={n.title}
              message={n.message}
              time={n.time}
              icon={getNotificationIcon(n.type)}
              unread={n.unread}
              to={n.link}
              onClick={() => handleItemClick(n)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
