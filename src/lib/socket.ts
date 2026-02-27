import { Server as SocketIOServer } from "socket.io";
import type { Server as HTTPServer } from "http";

let io: SocketIOServer | null = null;

export function initSocket(server: HTTPServer) {
  if (io) return io;

  io = new SocketIOServer(server, {
    path: "/api/socket",
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join org room
    socket.on("join:org", (orgId: string) => {
      socket.join(`org:${orgId}`);
    });

    // Join personal room
    socket.on("join:user", (userId: string) => {
      socket.join(`user:${userId}`);
    });

    // Join branch room
    socket.on("join:branch", (branchId: string) => {
      socket.join(`branch:${branchId}`);
    });

    socket.on("disconnect", () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
}

// ── Emit Helpers ─────────────────────────────────────────────

export function emitToUser(userId: string, event: string, data: unknown) {
  getIO().to(`user:${userId}`).emit(event, data);
}

export function emitToOrg(orgId: string, event: string, data: unknown) {
  getIO().to(`org:${orgId}`).emit(event, data);
}

export function emitToBranch(branchId: string, event: string, data: unknown) {
  getIO().to(`branch:${branchId}`).emit(event, data);
}

// ── Socket Events ─────────────────────────────────────────────
export const SOCKET_EVENTS = {
  NOTIFICATION:        "notification:new",
  ANNOUNCEMENT:        "announcement:new",
  LEAVE_STATUS_CHANGE: "leave:status_changed",
  PAYSLIP_READY:       "payslip:ready",
  ATTENDANCE_ALERT:    "attendance:alert",
  TICKET_UPDATE:       "ticket:updated",
} as const;
