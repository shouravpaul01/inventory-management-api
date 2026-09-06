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
}

// Extend the base Socket interface to include your custom 'user' property
export interface AuthenticatedSocket extends Socket {
  user?: DecodedToken;
}

// Middleware for socket authentication
const socketAuthMiddleware = (socket: AuthenticatedSocket, next: (err?: Error) => void) => {
  try {
    const token =
      socket.handshake.auth?.token ||
      socket.handshake.query?.token ||
      socket.handshake.headers?.authorization?.split(" ")[1];

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

  // Apply middleware (type assertion needed here due to how Socket.io types its middleware)
  io.use(socketAuthMiddleware as any);

  io.on("connection", (socket: AuthenticatedSocket) => {
    // Safety check in case middleware didn't attach user for some reason
    if (!socket.user) {
      socket.disconnect();
      return;
    }

    const user = socket.user;
    const userRoom = `user:${user.id}`;

    // Better logging with socket.id
    console.log(`[Socket] User connected: ${user.id} (Socket ID: ${socket.id})`);

    // Auto join user room
    socket.join(userRoom);

    // Optional manual join/leave
    socket.on("join", () => {
      socket.join(userRoom);
    });

    socket.on("leave", () => {
      socket.leave(userRoom);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[Socket] User disconnected: ${user.id} (Socket ID: ${socket.id}). Reason: ${reason}`);
    });
  });

  return io;
};

export const getIO = (): Server => {
  if (!io) {
    throw new Error("Socket.io has not been initialized. Please call initializeSocket first.");
  }
  return io;
};