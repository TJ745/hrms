"use client";

import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "@/lib/socket";

let socketInstance: Socket | null = null;

export function useSocket(userId?: string, orgId?: string, branchId?: string) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io(process.env.NEXT_PUBLIC_APP_URL!, {
        path: "/api/socket",
        withCredentials: true,
      });
    }

    socketRef.current = socketInstance;
    const socket = socketRef.current;

    socket.on("connect", () => {
      if (userId)   socket.emit("join:user",   userId);
      if (orgId)    socket.emit("join:org",    orgId);
      if (branchId) socket.emit("join:branch", branchId);
    });

    // Re-join on reconnect
    if (socket.connected) {
      if (userId)   socket.emit("join:user",   userId);
      if (orgId)    socket.emit("join:org",    orgId);
      if (branchId) socket.emit("join:branch", branchId);
    }

    return () => {
      // Don't disconnect on unmount — keep shared instance alive
    };
  }, [userId, orgId, branchId]);

  return socketRef.current;
}

export { SOCKET_EVENTS };
