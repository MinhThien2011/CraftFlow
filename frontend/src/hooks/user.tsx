"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { userApi } from "@/api/user.api";
import { User } from "@/lib/types";

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (identifier: string, password: string) => Promise<{ success: boolean; message: string }>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    /**
     * Initialize user from API (relying on cookies)
     */
    const initAuth = useCallback(async () => {
        try {
            const response = await userApi.getMe();
            if (response.success && response.data?.user) {
                setUser(response.data.user);
            }
        } catch (err) {
            // Don't log if it's just a 401
            // console.log("Failed to fetch user info:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        initAuth();
    }, [initAuth]);

    /**
     * Login function with client-side validation
     */
    const login = useCallback(async (identifier: string, password: string) => {
        // Client-side validation
        if (!identifier.trim()) {
            return { success: false, message: "Tên đăng nhập hoặc email không được để trống" };
        }
        if (!password) {
            return { success: false, message: "Mật khẩu không được để trống" };
        }

        // Password format validation
        const minLength = 8;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < minLength || !hasUpperCase || !hasLowerCase || !hasSpecialChar) {
            return { success: false, message: "Tên đăng nhập hoặc mật khẩu không đúng" };
        }

        setLoading(true);
        setError(null);
        try {
            const response = await userApi.login(identifier, password);
            if (response.success && response.data?.user) {
                const { user } = response.data;
                setUser(user);
                return { success: true, message: "Đăng nhập thành công" };
            }

            // Map common English errors from BE to Vietnamese
            let backendMessage = response.message || "Đăng nhập thất bại";
            if (backendMessage.includes("Incorrect username or password")) {
                backendMessage = "Tài khoản hoặc mật khẩu không chính xác";
            } else if (backendMessage.includes("User account has been banned")) {
                backendMessage = "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ admin";
            }

            return { success: false, message: backendMessage };
        } catch (err: any) {
            let errorMessage = err.message || "Đã xảy ra lỗi khi đăng nhập";

            // Map fetch errors or response errors to Vietnamese
            if (errorMessage.includes("Incorrect username or password")) {
                errorMessage = "Tài khoản hoặc mật khẩu không chính xác";
            } else if (
                errorMessage.includes("Password must be at least 8 characters long") ||
                errorMessage.includes("Password must contain uppercase")
            ) {
                errorMessage = "Mật khẩu không đúng định dạng";
            }

            setError(errorMessage);
            return { success: false, message: errorMessage };
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * Logout function
     */
    const logout = useCallback(async () => {
        try {
            await userApi.logout();
        } catch (err) {
            console.log("Logout failed:", err);
        } finally {
            setUser(null);
        }
    }, []);

    const value: AuthContextType = useMemo(() => ({
        user,
        loading,
        error,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role?.toLowerCase() === "admin",
    }), [user, loading, error, login, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
