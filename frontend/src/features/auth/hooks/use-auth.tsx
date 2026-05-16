"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { authApi } from "../api/auth.api";
import { User } from "@/lib/types";
import { toast } from "sonner";
import { AUTH_UNAUTHORIZED_EVENT } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";

export type UserRole = "admin" | "kho_manager" | "production_manager" | "staff"

export function getRoleName(user: User | null): string {
    if (!user) return ""
    if (typeof user.role === "string") return user.role.toLowerCase()
    return (user.role as any)?.roleName?.toLowerCase() || ""
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    error: string | null;
    login: (identifier: string, password: string) => Promise<{ success: boolean; message: string; role?: string }>;
    logout: () => Promise<void>;
    isAuthenticated: boolean;
    isAdmin: boolean;
    isKhoManager: boolean;
    isProductionManager: boolean;
    isStaff: boolean;
    role: string;
    hasPermission: (allowedRoles: string[]) => boolean;
    refreshUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();
    const router = useRouter();
    const authRedirectInProgress = useRef(false);

    const clearSessionCache = useCallback(async () => {
        await queryClient.cancelQueries();
        queryClient.setQueryData(queryKeys.auth.user, null);
        queryClient.removeQueries({
            predicate: (query) =>
                query.queryKey[0] !== queryKeys.auth.user[0] &&
                query.getObserversCount() === 0,
        });
    }, [queryClient]);

    const {
        data: authResponse,
        isLoading: loading,
        error: queryError,
        refetch: refreshUser
    } = useQuery({
        queryKey: queryKeys.auth.user,
        queryFn: () => authApi.getMe(),
        retry: false,
        staleTime: 1000 * 60 * 5,
    });

    const user = authResponse?.success ? authResponse.data.user : null;
    const [loginError, setLoginError] = useState<string | null>(null);

    useEffect(() => {
        const handleUnauthorized = () => {
            if (authRedirectInProgress.current) return;
            authRedirectInProgress.current = true;
            void clearSessionCache();
            router.replace("/");
        };

        window.addEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
        return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, handleUnauthorized);
    }, [clearSessionCache, router]);

    const login = useCallback(async (identifier: string, password: string) => {
        if (!identifier.trim() || !password) {
            return { success: false, message: "Vui lòng nhập đầy đủ thông tin" };
        }

        setLoginError(null);
        try {
            const response = await authApi.login(identifier, password);
            if (response.success && response.data?.user) {
                authRedirectInProgress.current = false;
                queryClient.setQueryData(queryKeys.auth.user, response);
                return { success: true, message: "Đăng nhập thành công", role: getRoleName(response.data.user) };
            }
            return { success: false, message: response.message || "Đăng nhập thất bại" };
        } catch (err: any) {
            const errorMessage = err.message || "Đã xảy ra lỗi khi đăng nhập";
            setLoginError(errorMessage);
            return { success: false, message: errorMessage };
        }
    }, [queryClient]);

    const logout = useCallback(async () => {
        try {
            await authApi.logout();
            authRedirectInProgress.current = true;
            await clearSessionCache();
            toast.success("Đăng xuất thành công");
            router.replace("/");
        } catch (err) {
            console.log("Logout failed:", err);
            // Vẫn redirect về login kể cả khi API logout lỗi (ví dụ do session đã hết hạn)
            authRedirectInProgress.current = true;
            await clearSessionCache();
            router.replace("/");
        }
    }, [clearSessionCache, router]);

    const role = getRoleName(user)

    const hasPermission = useCallback((allowedRoles: string[]) => {
        return allowedRoles.includes(role);
    }, [role]);

    const value: AuthContextType = useMemo(() => ({
        user,
        loading,
        error: loginError || (queryError as any)?.message || null,
        login,
        logout,
        isAuthenticated: !!user,
        isAdmin: role === "admin",
        isKhoManager: role === "kho_manager",
        isProductionManager: role === "production_manager",
        isStaff: role === "staff",
        role,
        hasPermission,
        refreshUser,
    }), [user, loading, loginError, queryError, login, logout, role, hasPermission, refreshUser]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
};
