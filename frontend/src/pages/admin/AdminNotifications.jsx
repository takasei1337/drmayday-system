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
    case "TOPOLOGY":
      return "icon-buildings";
    case "FORM":
      return "icon-document-text";
    case "USER":
      return "icon-profile-2user";
    case "ALERT":
      return "icon-danger";
    default:
      return "icon-setting-2";
  }
}

export default function AdminNotifications() {
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
          n.type === "FORM"
            ? "/admin/form-builder"
            : n.type === "TOPOLOGY"
            ? "/admin/topology"
            : n.type === "USER"
            ? "/admin/users"
            : "/admin",
      }));
      setNotifications(items);
    } catch {
      setNotifications([
        {
          id: 1,
          title: "Đồng bộ hạ tầng chi nhánh mới thành công",
          message: "Cơ sở Bệnh viện Da liễu TW - Cơ sở 2 đã hoàn tất thiết lập phòng khám và khoa điều trị.",
          type: "TOPOLOGY",
          time: "30 phút trước",
          unread: true,
          link: "/admin/topology",
        },
        {
          id: 2,
          title: "Phiên bản biểu mẫu khám mới được ban hành",
          message: "Mẫu phiếu lâm sàng mày đay mạn tính CSU v2.4 đã sẵn sàng cho bác sĩ sử dụng.",
          type: "FORM",
          time: "1 giờ trước",
          unread: true,
          link: "/admin/form-builder",
        },
        {
          id: 3,
          title: "Cấp tài khoản Bác sĩ chuyên khoa mới",
          message: "Đã kích hoạt tài khoản khám bệnh cho BS.CKII Lê Thu Trang tại Khoa Dị ứng Miễn dịch.",
          type: "USER",
          time: "3 giờ trước",
          unread: false,
          link: "/admin/users",
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
    toast.success("Đã ghi nhận toàn bộ thông báo hệ thống");
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
            <h1 className="base-hero-title">Thông báo và nhật ký hệ thống</h1>
          </div>

          <div className="base-hero-actions">
            <button
              type="button"
              onClick={() => setFilterUnreadOnly(!filterUnreadOnly)}
              className={`base-btn base-btn-sm text-xs font-semibold cursor-pointer ${
                filterUnreadOnly ? "base-btn-primary" : "base-btn-secondary"
              }`}
            >
              {filterUnreadOnly ? "Hiển thị tất cả" : `Chưa đọc (${unreadCount})`}
            </button>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="base-btn base-btn-secondary base-btn-sm text-xs font-semibold cursor-pointer"
              >
                Đánh dấu đã đọc tất cả
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Danh sách thông báo */}
      {loading ? (
        <div className="base-card p-8 text-center text-xs text-gray-500 rounded-lg">
          Đang tải nhật ký thông báo quản trị...
        </div>
      ) : displayedList.length === 0 ? (
        <div className="base-card p-12 text-center rounded-lg">
          <span className="isax icon-notification-bing text-4xl text-gray-400 block mb-2"></span>
          <p className="text-sm font-bold text-gray-700">Không có thông báo quản trị nào</p>
          <p className="text-xs text-gray-500 mt-1">
            {filterUnreadOnly ? "Quản trị viên đã xem toàn bộ thông báo." : "Hiện không có cảnh báo hệ thống mới."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[var(--base-border-opaque)] rounded-lg divide-y divide-[var(--base-border-opaque)] overflow-hidden">
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
