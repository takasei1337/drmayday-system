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
    case "PRESCRIPTION":
      return "icon-health";
    case "UAS7":
      return "icon-task-square";
    case "ALERT":
      return "icon-danger";
    case "DOCTOR":
      return "icon-message-text";
    default:
      return "icon-notification";
  }
}

export default function PatientNotifications() {
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
            ? "/patient/uas7"
            : n.type === "PRESCRIPTION"
            ? "/patient/profile"
            : n.type === "LESION"
            ? "/patient/uas7"
            : "/patient",
      }));
      setNotifications(items);
    } catch {
      // Mock fallback if api fails
      setNotifications([
        {
          id: 1,
          title: "Đã đến giờ uống thuốc buổi tối",
          message: "Fexofenadine 180mg x 01 viên sau ăn. Uống cùng nhiều nước.",
          type: "PRESCRIPTION",
          time: "15 phút trước",
          unread: true,
          link: "/patient/profile",
        },
        {
          id: 2,
          title: "Nhắc chấm điểm hoạt tính UAS7",
          message: "Vui lòng ghi nhận mức ngứa và số lượng sẩn phù xuất hiện trong 24 giờ qua.",
          type: "UAS7",
          time: "2 giờ trước",
          unread: true,
          link: "/patient/uas7",
        },
        {
          id: 3,
          title: "Bác sĩ phụ trách đã xem ảnh tổn thương",
          message: "TS.BS. Nguyễn Văn Hùng xác nhận tổn thương đang thuyên giảm tích cực.",
          type: "DOCTOR",
          time: "Hôm qua",
          unread: false,
          link: "/patient/uas7",
        },
        {
          id: 4,
          title: "Lịch hẹn tái khám chuyên khoa",
          message: "Hẹn tái khám lúc 09:00 ngày 25/11/2026 tại Phòng khám Da liễu 204.",
          type: "PRESCRIPTION",
          time: "2 ngày trước",
          unread: false,
          link: "/patient/profile",
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
    toast.success("Đã đánh dấu đã đọc tất cả");
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-[var(--base-border-opaque)]">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-[var(--base-brand-navy)] tracking-tight">
            Thông báo lâm sàng
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterUnreadOnly(!filterUnreadOnly)}
            className={`base-btn base-btn-sm ${
              filterUnreadOnly
                ? "base-btn-primary"
                : "base-btn-secondary"
            }`}
          >
            {filterUnreadOnly ? "Hiển thị tất cả" : `Chưa đọc (${unreadCount})`}
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="base-btn base-btn-secondary base-btn-sm"
            >
              Đánh dấu đã đọc tất cả
            </button>
          )}
        </div>
      </div>

      {/* Danh sách thông báo */}
      {loading ? (
        <div className="base-card p-8 text-center text-xs text-gray-500">
          Đang tải danh sách thông báo...
        </div>
      ) : displayedList.length === 0 ? (
        <div className="base-card p-12 text-center">
          <span className="isax icon-notification-bing text-3xl text-gray-400 block mb-2"></span>
          <p className="text-sm font-semibold text-gray-700">Không có thông báo nào</p>
          <p className="text-xs text-gray-500 mt-1">
            {filterUnreadOnly ? "Bạn đã đọc hết toàn bộ thông báo." : "Hiện chưa có thông báo mới từ hệ thống."}
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
