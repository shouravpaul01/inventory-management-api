import { Request, Response, NextFunction } from "express";
import httpStatus from "http-status";
import ApiError from "../../errors/ApiErrors";
import redis from "../../shared/redis";

// ─────────────────────────────────────────────────────────────────────────────
// Token Bucket Rate Limiter (Redis-backed, Lua-atomic)
//
// WHY Token Bucket over Fixed Window?
// ─────────────────────────────────────
// Fixed Window (express-rate-limit default):
//   - Allows "thundering herd": 30 req at 0:59 + 30 req at 1:00 = 60 in 1 sec
//   - Hard cliff: users get blocked abruptly at window boundary
//
// Token Bucket:
//   - 🪣 Each IP has a "bucket" with a max capacity of tokens
//   - Each request consumes 1 token
//   - Tokens refill at a steady rate (e.g. 1 token every 2 seconds)
//   - Allows natural bursts (up to bucket capacity) while blocking abuse
//   - Used by: AWS API Gateway, Stripe, GitHub, Cloudflare
//
// WHY Lua script?
// ─────────────────
// Redis is single-threaded. A Lua script runs atomically — no race conditions
// between "read token count" and "write new token count" under concurrent requests.
// Without Lua, two simultaneous requests could both read "1 token left"
// and both pass, effectively bypassing the limit.
// ─────────────────────────────────────────────────────────────────────────────

// Lua script — runs atomically inside Redis
// Returns: [allowed (0|1), tokensRemaining, retryAfterMs]
const TOKEN_BUCKET_SCRIPT = `
  local key            = KEYS[1]
  local capacity       = tonumber(ARGV[1])  -- max tokens in bucket
  local refillRate     = tonumber(ARGV[2])  -- tokens added per second
  local now            = tonumber(ARGV[3])  -- current time in ms
  local ttl            = tonumber(ARGV[4])  -- key expiry in seconds

  -- Read existing bucket state from Redis hash
  local bucket = redis.call("HMGET", key, "tokens", "lastRefill")
  local tokens     = tonumber(bucket[1]) or capacity
  local lastRefill = tonumber(bucket[2]) or now

  -- Calculate how many tokens to add based on elapsed time
  local elapsed      = math.max(0, now - lastRefill)
  local newTokens    = elapsed / 1000 * refillRate
  tokens = math.min(capacity, tokens + newTokens)

  local allowed = 0
  local retryAfterMs = 0

  if tokens >= 1 then
    -- Consume one token and allow the request
    tokens = tokens - 1
    allowed = 1
  else
    -- Calculate ms until 1 token is available
    retryAfterMs = math.ceil((1 - tokens) / refillRate * 1000)
  end

  -- Persist updated bucket state with TTL
  redis.call("HMSET", key, "tokens", tokens, "lastRefill", now)
  redis.call("EXPIRE", key, ttl)

  return {allowed, math.floor(tokens), retryAfterMs}
`;

export interface TokenBucketOptions {
  /** Max tokens in the bucket (= max burst size). Default: 10 */
  capacity?: number;
  /** Tokens refilled per second. Default: 0.5 (1 token every 2s) */
  refillRate?: number;
  /** Key prefix in Redis — use different prefixes for different limiters */
  keyPrefix?: string;
  /** Human-readable error message */
  message?: string;
}

/**
 * Creates an Express middleware that enforces a token bucket rate limit.
 *
 * Usage:
 *   router.post("/login", tokenBucketLimiter({ capacity: 5, refillRate: 0.1 }), handler)
 *
 * @param options - Token bucket configuration
 */
export function tokenBucketLimiter(options: TokenBucketOptions = {}) {
  const {
    capacity = 10,
    refillRate = 0.5,             // 1 token per 2 seconds
    keyPrefix = "tb_global",
    message = "Too many requests. Please slow down.",
  } = options;

  // TTL = time to refill empty bucket from 0 → capacity (in seconds)
  const ttl = Math.ceil(capacity / refillRate) + 10;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Build a unique Redis key per IP + limiter type
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.socket.remoteAddress ||
      "unknown";

    const key = `${keyPrefix}:${ip}`;
    const now = Date.now();

    try {
      // Run atomic Lua script
      const result = (await redis.eval(
        TOKEN_BUCKET_SCRIPT,
        1,            // number of KEYS
        key,          // KEYS[1]
        String(capacity),
        String(refillRate),
        String(now),
        String(ttl),
      )) as [number, number, number];

      const [allowed, tokensRemaining, retryAfterMs] = result;

      // Expose token info in response headers (good for API clients)
      res.setHeader("X-RateLimit-Limit", capacity);
      res.setHeader("X-RateLimit-Remaining", tokensRemaining);

      if (!allowed) {
        const retryAfterSec = Math.ceil(retryAfterMs / 1000);
        res.setHeader("Retry-After", retryAfterSec);
        return next(new ApiError(httpStatus.TOO_MANY_REQUESTS, message));
      }

      return next();
    } catch (err) {
      // If Redis is down, FAIL OPEN (allow request) so the app stays up.
      // In high-security apps, change this to FAIL CLOSED (block request).
      console.error("[TokenBucketLimiter] Redis error — failing open:", err);
      return next();
    }
  };
}

// ─── Pre-configured limiters for common use cases ─────────────────────────────

/**
 * Global API limiter — relaxed burst, steady refill.
 * Allows up to 30 requests burst, refills 1 token/2s.
 */
export const globalTokenLimiter = tokenBucketLimiter({
  capacity: 30,
  refillRate: 0.5,       // 1 token per 2 seconds
  keyPrefix: "tb_global",
  message: "Too many requests from this IP. Please try again later.",
});

/**
 * Auth limiter — tight bucket for login/register/forgot-password.
 * Allows max 5 burst attempts, refills 1 token per 3 minutes.
 * A brute-force attacker gets max 5 tries, then waits 3 min per try.
 */
export const authTokenLimiter = tokenBucketLimiter({
  capacity: 5,
  refillRate: 1 / 180,   // 1 token per 180 seconds (3 minutes)
  keyPrefix: "tb_auth",
  message: "Too many failed attempts. Please wait a few minutes before trying again.",
});

/**
 * OTP limiter — strictest bucket.
 * Allows max 3 burst attempts, refills 1 token per 10 minutes.
 */
export const otpTokenLimiter = tokenBucketLimiter({
  capacity: 3,
  refillRate: 1 / 600,   // 1 token per 600 seconds (10 minutes)
  keyPrefix: "tb_otp",
  message: "Too many OTP attempts. Please wait 10 minutes before trying again.",
});
