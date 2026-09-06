import { rateLimit, Options } from "express-rate-limit";
import { Request, Response } from "express";
import httpStatus from "http-status";
import ApiError from "../../errors/ApiErrors";

// ─── Factory Function ─────────────────────────────────────────────────────────
// Senior dev pattern: define shared defaults ONCE, each limiter only
// overrides what makes it different. No copy-paste, no drift between configs.
//
// Usage:
//   export const myLimiter = createLimiter({
//     windowMs: 5 * 60 * 1000,
//     limit: 10,
//     message: "Slow down!",
//   });
// ─────────────────────────────────────────────────────────────────────────────

interface LimiterOptions {
  windowMs: number;
  limit: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
}

function createLimiter(options: LimiterOptions) {
  const {
    windowMs,
    limit,
    message = "Too many requests. Please try again later.",
    skipSuccessfulRequests = false,
  } = options;

  // Shared defaults — every limiter inherits these automatically
  const sharedDefaults: Partial<Options> = {
    standardHeaders: "draft-8" as const,  // RFC-compliant rate-limit headers
    legacyHeaders: false,                 // disable old X-RateLimit-* headers
    ipv6Subnet: 56,                       // group /56 IPv6 subnets together
  };

  return rateLimit({
    ...sharedDefaults,
    windowMs,
    limit,
    skipSuccessfulRequests,
    handler: (_req: Request, _res: Response) => {
      throw new ApiError(httpStatus.TOO_MANY_REQUESTS, message);
    },
  });
}

// ─── Limiters ─────────────────────────────────────────────────────────────────
// Each limiter only declares what is UNIQUE to it.
// All shared config lives in createLimiter() above — one place to update.

/** Global — coarse shield for all routes (30 req/min) */
export const globalLimiter = createLimiter({
  windowMs: 1 * 60 * 1000,
  limit: 30,
  message: "Too many requests from this IP. Please try again later.",
});

/** Auth — brute-force protection for login / register / forgot-password (5 req/15 min) */
export const authLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true, // only failed attempts count — real users aren't penalised
  message: "Too many failed attempts. Please wait 15 minutes before trying again.",
});

/** OTP — enumeration protection for verify-otp / verify-reset-otp (3 req/10 min) */
export const otpLimiter = createLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 3,
  skipSuccessfulRequests: true,
  message: "Too many OTP attempts. Please wait 10 minutes before trying again.",
});
