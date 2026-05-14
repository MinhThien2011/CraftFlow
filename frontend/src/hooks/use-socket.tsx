"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Notification } from "@/api/notification.api";

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
            query: { userId: user._id },
            transports: ['websocket'],
            withCredentials: true
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected to server');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('[Socket] Disconnected from server');
            setIsConnected(false);
        });

        newSocket.on('notification', (notification: Notification) => {
            console.log('[Socket] New notification received:', notification);
            
            // Invalidate notification queries to refresh list
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            
            // Show toast notification
            toast.info(notification.title, {
                description: notification.message,
                duration: 5000,
            });
        });

        setSocket(newSocket);

        return () => {
            newSocket.disconnect();
        };
    }, [isAuthenticated, user?._id, queryClient]);

    return (
        <SocketContext.Provider value={{ socket, isConnected }}>
            {children}
        </SocketContext.Provider>
    );
};
