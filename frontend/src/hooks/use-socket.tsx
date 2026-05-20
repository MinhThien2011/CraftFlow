"use client";

import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Notification } from "@/api/notification.api";
import { queryKeys } from "@/lib/query-keys";

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
});

export const useSocket = () => useContext(SocketContext);

const resolveSocketUrl = () => {
    if (process.env.NEXT_PUBLIC_SOCKET_URL) {
        return process.env.NEXT_PUBLIC_SOCKET_URL;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
    return apiUrl.replace(/\/api\/?$/, "");
};

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const queryClient = useQueryClient();
    const router = useRouter();
    const lastConnectErrorRef = useRef<{ message: string; at: number } | null>(null);

    const invalidateRealtimeDomains = (domains: string[] = []) => {
        const domainSet = new Set(domains);
        const invalidateAll = domainSet.size === 0 || domainSet.has("all");

        if (invalidateAll || domainSet.has("notifications")) {
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });
        }
        if (invalidateAll || domainSet.has("production") || domainSet.has("alerts")) {
            queryClient.invalidateQueries({ queryKey: queryKeys.production.all });
        }
        if (invalidateAll || domainSet.has("purchaseOrders")) {
            queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
        }
        if (invalidateAll || domainSet.has("inventory")) {
            queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
        }
        if (invalidateAll || domainSet.has("materials") || domainSet.has("alerts")) {
            queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
        }
        if (invalidateAll || domainSet.has("products")) {
            queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
        }
        if (invalidateAll || domainSet.has("slips")) {
            queryClient.invalidateQueries({ queryKey: queryKeys.slips.all });
        }
        if (invalidateAll || domainSet.has("requisitions")) {
            queryClient.invalidateQueries({ queryKey: queryKeys.requisitions.all });
        }

        queryClient.invalidateQueries({
            predicate: (query) => {
                const root = String(query.queryKey[0] || "");
                return invalidateAll || domains.includes(root) || (
                    domainSet.has("requisitions") && root === "requisitions"
                ) || (
                    domainSet.has("slips") && root === "receiving-slips"
                ) || (
                    (domainSet.has("inventory") || domainSet.has("materials") || domainSet.has("products") || domainSet.has("production") || domainSet.has("requisitions") || domainSet.has("slips")) &&
                    (root === "dashboard" || root === "warehouse-dashboard")
                ) || (
                    domainSet.has("dashboard") && root === "dashboard"
                );
            },
        });
    };

    useEffect(() => {
        if (!isAuthenticated || !user?._id) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        const socketUrl = resolveSocketUrl();

        const newSocket = io(socketUrl, {
            transports: ["polling", "websocket"],
            upgrade: true,
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            withCredentials: true,
        });

        newSocket.on("connect", () => {
            console.log(`[Socket] Connected successfully | User: ${user._id}`);
            setIsConnected(true);
            lastConnectErrorRef.current = null;
        });

        newSocket.on("connect_error", (err) => {
            setIsConnected(false);
            const now = Date.now();
            const previous = lastConnectErrorRef.current;
            const shouldReport = !previous || previous.message !== err.message || now - previous.at > 15000;

            if (shouldReport) {
                console.warn(`[Socket] Connection issue (${socketUrl}): ${err.message}`);
                lastConnectErrorRef.current = { message: err.message, at: now };
            }

            if (shouldReport && (err.message === "Authentication required" || err.message === "Invalid token")) {
                toast.error("Phien socket het han, dang reconnect...");
            }
        });

        newSocket.on("disconnect", (reason) => {
            console.log(`[Socket] Disconnected | Reason: ${reason}`);
            setIsConnected(false);
        });

        newSocket.on("auth_error", (error) => {
            console.warn("[Socket] Auth error:", error?.message || error);
            setIsConnected(false);
        });

        newSocket.on("notification", (notification: Notification) => {
            console.log("[Socket] New notification received:", notification);
            // Invalidate the notification list so the bell badge updates immediately
            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

            // Show a toast with role-aware action
            const isTaskNotif = notification.type === "TASK"
            toast.info(notification.title, {
                description: notification.message,
                duration: 7000,
                action: isTaskNotif
                    ? { label: "Xem ngay", onClick: () => router.push("/staff/tasks") }
                    : undefined,
            });
        });

        newSocket.on("data_changed", (event: any) => {
            console.log("[Socket] Data changed:", event);
            // Only invalidate domains that are relevant — avoid thrashing unrelated caches
            invalidateRealtimeDomains(event?.domains || []);
        });

        newSocket.on("material_shortage_created", (data: any) => {
            console.log("[Socket] Material shortage created:", data);
            invalidateRealtimeDomains(["production", "materials", "inventory", "alerts"]);
            toast.warning("Canh bao thieu vat tu", {
                description: data.message,
                duration: 8000,
                action: {
                    label: "Xem",
                    onClick: () => router.push("/alerts?tab=orders"),
                },
            });
        });

        newSocket.on("purchase_order_created", (data: any) => {
            console.log("[Socket] Purchase order created:", data);
            invalidateRealtimeDomains(["purchaseOrders", "alerts", "production"]);
            toast.info("Yeu cau mua hang moi", {
                description: data.message,
                duration: 8000,
                action: {
                    label: "Xem",
                    onClick: () => router.push("/production-management/purchase-orders"),
                },
            });
        });

        newSocket.on("production_order_created", (data: any) => {
            console.log("[Socket] Production order created:", data);
            invalidateRealtimeDomains(["production", "materials", "inventory", "alerts", "requisitions"]);
            toast.success("Don san xuat moi", {
                description: data.message,
                duration: 8000,
                action: {
                    label: "Xem ngay",
                    onClick: () => router.push(`/production-management/orders`),
                },
            });
        });

        newSocket.on("production_order_status_updated", (data: any) => {
            console.log("[Socket] Production order status updated:", data);
            invalidateRealtimeDomains(["production", "inventory", "products"]);
            toast.info("Cap nhat don san xuat", {
                description: data.message,
                duration: 8000,
            });
        });

        newSocket.on("purchase_order_status_updated", (data: any) => {
            console.log("[Socket] Purchase order status updated:", data);
            invalidateRealtimeDomains(["purchaseOrders", "slips", "inventory", "materials", "alerts"]);
            toast.info("Cap nhat don mua hang", {
                description: data.message,
                duration: 8000,
            });
        });

        newSocket.on("inventory_slip_updated", (data: any) => {
            console.log("[Socket] Inventory slip updated:", data);
            invalidateRealtimeDomains(["slips", "inventory", "materials", "products", "production", "requisitions", "alerts"]);
            toast.info("Cap nhat kho", {
                description: data.message,
                duration: 6000,
            });
        });

        newSocket.on("error", (error) => {
            console.error("[Socket] Server error:", error);
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
            setSocket(null);
            setIsConnected(false);
        };
    }, [isAuthenticated, user?._id, queryClient, router]);

    return <SocketContext.Provider value={{ socket, isConnected }}>{children}</SocketContext.Provider>;
};

