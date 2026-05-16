"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
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

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user, isAuthenticated } = useAuth();
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const queryClient = useQueryClient();
    const router = useRouter();

    useEffect(() => {
        if (!isAuthenticated || !user?._id) {
            if (socket) {
                socket.disconnect();
                setSocket(null);
                setIsConnected(false);
            }
            return;
        }

        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

        const newSocket = io(socketUrl, {
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            withCredentials: true,
        });

        // ==================== EVENT HANDLERS ====================
        newSocket.on('connect', () => {
            console.log(`[Socket] ✅ Connected successfully | User: ${user._id}`);
            setIsConnected(true);
        });

        newSocket.on('connect_error', (err) => {
            console.error('[Socket] Connection error:', err.message);
            setIsConnected(false);

            if (err.message === "Authentication required" || err.message === "Invalid token") {
                toast.error("Phiên socket hết hạn, đang reconnect...");
            }
        });

        newSocket.on('disconnect', (reason) => {
            console.log(`[Socket] Disconnected | Reason: ${reason}`);
            setIsConnected(false);
        });

        newSocket.on('notification', (notification: Notification) => {
            console.log('[Socket] New notification received:', notification);

            queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all });

            toast.info(notification.title, {
                description: notification.message,
                duration: 6000,
            });
        });

        newSocket.on('production_order_created', (data: any) => {
            console.log('[Socket] Production order created:', data);
            queryClient.invalidateQueries({ queryKey: queryKeys.production.all });
            toast.success('Đơn sản xuất mới', {
                description: data.message,
                duration: 8000,
                action: {
                    label: 'Xem ngay',
                    onClick: () => router.push(`/production-management/orders`)
                }
            });
        });

        newSocket.on('production_order_status_updated', (data: any) => {
            console.log('[Socket] Production order status updated:', data);
            queryClient.invalidateQueries({ queryKey: queryKeys.production.all });
            toast.info('Cập nhật đơn sản xuất', {
                description: data.message,
                duration: 8000,
            });
        });

        newSocket.on('purchase_order_status_updated', (data: any) => {
            console.log('[Socket] Purchase order status updated:', data);
            queryClient.invalidateQueries({ queryKey: queryKeys.purchaseOrders.all });
            toast.info('Cập nhật đơn mua hàng', {
                description: data.message,
                duration: 8000,
            });
        });

        newSocket.on('inventory_slip_updated', (data: any) => {
            console.log('[Socket] Inventory slip updated:', data);
            queryClient.invalidateQueries({ queryKey: queryKeys.slips.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
            queryClient.invalidateQueries({ queryKey: queryKeys.products.all });
            toast.info('Cập nhật kho', {
                description: data.message,
                duration: 6000,
            });
        });

        newSocket.on('error', (error) => {
            console.error('[Socket] Server error:', error);
        });

        setSocket(newSocket);

        // Cleanup
        return () => {
            newSocket.disconnect();
        };
    }, [isAuthenticated, user?._id, queryClient, router]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
