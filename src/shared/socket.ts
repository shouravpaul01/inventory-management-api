import { Server, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { env } from "../config/env.config";
import { jwtHelpers } from "../helpers/jwtHelpers";

let io: Server | null = null;

// Strongly type the decoded token
export interface DecodedToken {
  id: string;
  email?: string;
  role?: string;
  roles?: string[];
  departmentId?: string;
  isSuperAdmin?: boolean;
}

// Extend the base Socket interface to include your custom 'user' property
export interface AuthenticatedSocket extends Socket {
  user?: DecodedToken;
}

/**
 * Parses raw Cookie header string into key-value map.
 */
const parseCookies = (cookieString?: string): Record<string, string> => {
  if (!cookieString) return {};
  return cookieString.split(";").reduce((acc, cookie) => {
    const [name, val] = cookie.trim().split("=");
    if (name && val) acc[name] = decodeURIComponent(val);
    return acc;
  }, {} as Record<string, string>);
};

// Middleware for socket authentication supporting Auth object, Query param, Bearer header, and HTTP-only cookie
const socketAuthMiddleware = (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  try {
    const cookies = parseCookies(socket.handshake.headers?.cookie);
    const authHeader = socket.handshake.headers?.authorization;

    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      (authHeader?.startsWith("Bearer ") ? authHeader.split(" ")[1] : authHeader) ||
      cookies["accessToken"];

    if (!token) {
      return next(new Error("Unauthorized: No token provided"));
    }

    // Verify token
    const decoded = jwtHelpers.verifyToken(token, env.JWT_SECRET) as DecodedToken;

    // Attach user to socket
    socket.user = decoded;

    next();
  } catch (error) {
    next(new Error("Unauthorized: Invalid token"));
  }
};

export const initializeSocket = (server: HTTPServer): Server => {
  io = new Server(server, {
    cors: {
      origin: env.FRONTEND_URL,
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Apply middleware
  io.use(socketAuthMiddleware as any);

  io.on("connection", (socket: AuthenticatedSocket) => {
    if (!socket.user) {
      socket.disconnect();
      return;
    }

    const user = socket.user;
    const userRoom = `user:${user.id}`;

    console.log(`[Socket] User connected: ${user.id} (Socket ID: ${socket.id})`);

    // Auto join personal user room
    socket.join(userRoom);

    // Auto join role-based rooms
    if (Array.isArray(user.roles)) {
      user.roles.forEach((role) => {
        socket.join(`role:${role}`);
      });
    } else if (user.role) {
      socket.join(`role:${user.role}`);
    }

    // Auto join department room
    if (user.departmentId) {
      socket.join(`dept:${user.departmentId}`);
    }

    // Manual join/leave handlers
    socket.on("join", (customRoom?: string) => {
      if (customRoom) {
        socket.join(customRoom);
      } else {
        socket.join(userRoom);
      }
    });

    socket.on("leave", (customRoom?: string) => {
      if (customRoom) {
        socket.leave(customRoom);
      } else {
        socket.leave(userRoom);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] User disconnected: ${user.id} (Socket ID: ${socket.id}). Reason: ${reason}`);
    });
  });

  return io;
};

export const getIO = (): Server | null => {
  return io;
};

/**
 * Emits an event to a single user room.
 */
export const emitToUser = (userId: string, event: string, data: any): void => {
  try {
    if (io) {
      io.to(`user:${userId}`).emit(event, data);
    }
  } catch (error) {
    console.error(`[Socket] Failed to emit '${event}' to user:${userId}`, error);
  }
};

/**
 * Emits an event to multiple user rooms simultaneously.
 */
export const emitToUsers = (userIds: string[], event: string, data: any): void => {
  try {
    if (io && userIds.length > 0) {
      const rooms = userIds.map((id) => `user:${id}`);
      io.to(rooms).emit(event, data);
    }
  } catch (error) {
    console.error(`[Socket] Failed to emit '${event}' to users`, error);
  }
};

/**
 * Emits an event to all users in a specific role.
 */
export const emitToRole = (role: string, event: string, data: any): void => {
  try {
    if (io) {
      io.to(`role:${role}`).emit(event, data);
    }
  } catch (error) {
    console.error(`[Socket] Failed to emit '${event}' to role:${role}`, error);
  }
};

/**
 * Emits an event to all users in a specific department.
 */
export const emitToDepartment = (departmentId: string, event: string, data: any): void => {
  try {
    if (io) {
      io.to(`dept:${departmentId}`).emit(event, data);
    }
  } catch (error) {
    console.error(`[Socket] Failed to emit '${event}' to dept:${departmentId}`, error);
  }
};

/**
 * Broadcasts an event to all connected sockets.
 */
export const emitToAll = (event: string, data: any): void => {
  try {
    if (io) {
      io.emit(event, data);
    }
  } catch (error) {
    console.error(`[Socket] Failed to broadcast '${event}'`, error);
  }
};