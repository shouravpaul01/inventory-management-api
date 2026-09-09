/**
 * Safely parses and validates a 24-character hexadecimal MongoDB ObjectId string.
 * Returns the valid string if valid, otherwise undefined.
 */
export const toValidObjectId = (id?: string | null): string | undefined => {
  if (id && /^[0-9a-fA-F]{24}$/.test(id)) {
    return id;
  }
  return undefined;
};

export const NotificationUtils = {
  toValidObjectId,
};
