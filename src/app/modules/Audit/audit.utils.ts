/**
 * Sensitive field patterns to strip or redact from audit snapshots.
 */
const SENSITIVE_KEYS = [
  "password",
  "token",
  "refreshtoken",
  "secret",
  "authorization",
  "creditcard",
  "cvv",
  "pin",
  "apikey",
  "privatekey",
];

/**
 * Deeply strips sensitive keys (like passwords, secret tokens) before storing
 * or displaying audit snapshot data. Handles nested objects and arrays safely.
 */
export const sanitizeAuditSnapshot = (
  data?: unknown,
  seen: WeakSet<object> = new WeakSet()
): any => {
  if (data === null || data === undefined) return null;

  if (typeof data !== "object") {
    return data as any;
  }

  // Preserve Date instances as ISO strings
  if (data instanceof Date) {
    return data.toISOString() as any;
  }

  // Prevent infinite loops on circular structures
  if (seen.has(data)) {
    return "[CIRCULAR]";
  }
  seen.add(data);

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => {
      if (item !== null && typeof item === "object") {
        return sanitizeAuditSnapshot(item, seen);
      }
      return item;
    });
  }

  // Handle plain objects
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const isSensitive = SENSITIVE_KEYS.some((sensitive) =>
      key.toLowerCase().includes(sensitive)
    );

    if (isSensitive) {
      sanitized[key] = "[REDACTED]";
    } else if (value !== null && typeof value === "object") {
      sanitized[key] = sanitizeAuditSnapshot(value, seen);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

export const AuditUtils = {
  sanitizeAuditSnapshot,
};
