import express, { Application, NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import helmet from "helmet";
import hpp from "hpp";
import path from "path";
import router from "./app/routes";
import GlobalErrorHandler from "./app/middlewares/globalErrorHandler";
import { AppBodyTemplate } from "./utils/BodyTemplate";
import morgan from "morgan";
import { globalTokenLimiter } from "./app/middlewares/tokenBucketLimiter";
import { RequestContext } from "./helpers/requestContext";

const app: Application = express();

// ─── CORS Configuration ──────────────────────────────────────────────────────
// Origins are loaded from env so they work in both dev and production.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : ["http://localhost:3000"];

export const corsOptions = {
  origin: allowedOrigins,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
    "Origin",
  ],
  credentials: true,
};

// ─── Security Middleware ──────────────────────────────────────────────────────
// Order matters:
// 1. helmet      — sets secure HTTP headers (XSS, clickjacking, HSTS, CSP, …)
// 2. hpp         — sanitises HTTP Parameter Pollution (e.g. ?id=1&id=2)
// 3. cors        — restricts cross-origin access to allowed origins only
// 4. globalLimiter — coarse throttle for all IPs (30 req/min)
//
// Auth-specific stricter limits (authLimiter / otpLimiter) are applied
// directly inside auth.routes.ts — see that file for per-route config.
app.use(helmet());
app.use(hpp());
app.use(cors(corsOptions));
app.use(globalTokenLimiter);

// ─── Request Context (AsyncLocalStorage) ──────────────────────────────────────
// Captures client IP and userAgent across deep async call stacks automatically.
app.use((req: Request, _res: Response, next: NextFunction) => {
  const forwarded = req.headers["x-forwarded-for"];
  const ipAddress =
    typeof forwarded === "string"
      ? forwarded.split(",")[0].trim()
      : req.ip || req.socket.remoteAddress;
  const userAgent = (req.headers["user-agent"] as string) || undefined;

  RequestContext.run({ ipAddress: ipAddress || undefined, userAgent }, () => {
    next();
  });
});

// ─── General Middleware ───────────────────────────────────────────────────────
// cookieParser uses a secret for signed-cookie integrity.
app.use(cookieParser(process.env.COOKIE_SECRET || "changeme-in-production"));
app.use(express.json({ limit: "1mb" }));           // single, size-limited JSON parser
app.use(express.urlencoded({ extended: true, limit: "1mb" }));
app.use(compression());                             // gzip responses
app.use(express.static("public"));

// Morgan: verbose in dev, minimal in production
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// Route handler for the root endpoint
app.get("/", (req: Request, res: Response) => {
  res.send(
    AppBodyTemplate({
      message: "Welcome to  Project API 🚀sdfsgfsdfgsdfg",
      version: "1.0.1",
      status: "Active",
      repoUrl: "",
      docsUrl: "https://github.com/shouravpaul01",
      showButtons: true,
    }),
  );
});

// app.use("/uploads", express.static(path.join("/var/www/uploads")));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
// Setup API routes
app.use("/api/v1", router);

//Global Error handling middleware
app.use(GlobalErrorHandler);

// 404 Not Found handler
app.use((req: Request, res: Response, next: NextFunction) => {
  res.status(httpStatus.NOT_FOUND).json({
    success: false,
    message: "API NOT FOUND!",
    error: {
      path: req.originalUrl,
      message: "Your requested path is not found!",
    },
  });
});

export default app;
