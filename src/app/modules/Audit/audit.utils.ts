/**
 * Strips sensitive keys (like passwords, secret tokens) before storing or displaying audit snapshot data.
 */
export const sanitizeAuditSnapshot = (
  data?: Record<string, unknown> | null
): Record<string, unknown> | null => {
  if (!data || typeof data !== "object") return null;

  const SENSITIVE_KEYS = ["password", "token", "refreshToken", "secret", "authorization"];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_KEYS.some((sensitive) => key.toLowerCase().includes(sensitive))) {
      sanitized[key] = "[REDACTED]";
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

export const AuditUtils = {
  sanitizeAuditSnapshot,
};
