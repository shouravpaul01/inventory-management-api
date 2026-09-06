import Redis from "ioredis";
import { env } from "../config/env.config";

// BullMQ requires maxRetriesPerRequest: null to prevent side effects in queue processing
const bullmqRedis = new Redis(env.REDIS_URL || "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

bullmqRedis.on("connect", () => console.log("BullMQ Redis successfully connected"));
bullmqRedis.on("error", (err) => console.error("BullMQ Redis error:", err));

export default bullmqRedis;
