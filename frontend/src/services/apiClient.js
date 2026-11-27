import axios from "axios";
import toast from "react-hot-toast";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Tự động đính kèm Bearer JWT Token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }
    return config;
  },
  (error) => Promise.reject(error)
);

function handleTokenInvalid(errorMessage, silent) {
  const publicPaths = ["/login", "/register", "/forgot-password", "/emergency-triage"];
  if (!publicPaths.includes(window.location.pathname)) {
    if (!silent) toast.error("Phiên đăng nhập đã hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại!");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  } else if (!silent) {
    toast.error(errorMessage);
  }
}

// Response Interceptor: Xử lý ApiResponse chuẩn Sheet & Bảng mã gộp Tab 3
apiClient.interceptors.response.use(
  (response) => {
    const resData = response.data;
    const silent = Boolean(response.config?.silent);

    if (resData && resData.code !== undefined) {
      const codeNum = Number(resData.code);
      // Bảng mã gộp Tab 3: CHỈ 1000 là thành công (1001 là Can not connect to DB!)
      if (codeNum === 1000) {
        return resData;
      }

      const msg = resData.message || "Thao tác không thành công";
      if (codeNum === 9998) {
        handleTokenInvalid(msg, silent);
      } else if (!silent) {
        toast.error(msg);
      }
      return Promise.reject(new Error(msg));
    }

    return response;
  },
  (error) => {
    const silent = Boolean(error.config?.silent);
    if (error.response) {
      const { status, data } = error.response;
      const codeNum = data?.code !== undefined ? Number(data.code) : null;
      const errorMessage = data?.message || "Đã xảy ra lỗi khi gọi máy chủ";

      const toastId = `api-err-${status}-${errorMessage}`;
      if (codeNum === 9998 || status === 401) {
        handleTokenInvalid(errorMessage, silent);
      } else if (codeNum === 1009 || status === 403) {
        if (!silent) toast.error(errorMessage || "Bạn không có quyền thực hiện chức năng này!", { id: toastId });
      } else if (codeNum === 9992 || status === 404) {
        if (!silent) toast.error(errorMessage || "Không tìm thấy tài nguyên yêu cầu!", { id: toastId });
      } else if (codeNum === 9996 || codeNum === 1010 || status === 409) {
        if (!silent) toast.error(errorMessage || "Dữ liệu trùng lặp hoặc thao tác đã thực hiện!", { id: toastId });
      } else if (!silent) {
        toast.error(errorMessage, { id: toastId });
      }
    } else if (error.request) {
      if (!silent) toast.error("Không thể kết nối đến máy chủ Backend (Network Error)!", { id: "api-err-network" });
    } else {
      if (!silent) toast.error(error.message || "Đã xảy ra lỗi không xác định!", { id: "api-err-unknown" });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
