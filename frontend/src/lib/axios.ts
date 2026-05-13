import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 seconds timeout
});

// Request interceptor
axiosInstance.interceptors.request.use(
    (config) => {
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor
axiosInstance.interceptors.response.use(
    (response) => {
        return response.data;
    },
    (error) => {
        let message = 'Đã xảy ra lỗi không xác định';

        if (error.code === 'ECONNABORTED') {
            message = 'Kết nối quá hạn, vui lòng kiểm tra mạng';
        } else if (error.message === 'Network Error') {
            message = 'Không thể kết nối đến server. Vui lòng kiểm tra lại backend';
        } else if (error.response) {
            // Server trả về response với error code
            message = error.response.data?.message || error.response.data?.data?.message || `Lỗi hệ thống: ${error.response.status}`;

            // Tự động xử lý lỗi 401 Unauthorized nếu cần
            if (error.response.status === 401 && !window.location.pathname.includes('/login') && window.location.pathname !== '/') {
                // Xóa cache auth-user của React Query
                // Chú ý: Vì không có cách trực tiếp truy cập queryClient ở đây mà không qua hook, 
                // chúng ta sẽ dùng window.location để force redirect về login, 
                // điều này sẽ làm reset state của ứng dụng
                console.warn('Unauthorized access, please login again');
                window.location.href = '/';
            }
        }

        // Show toast notification
        toast.error(message, {
            id: 'api-error', // Tránh show nhiều toast cùng lúc cho 1 lỗi
        });

        return Promise.reject({
            message,
            status: error.response?.status,
            data: error.response?.data,
        });
    }
);

export default axiosInstance;
