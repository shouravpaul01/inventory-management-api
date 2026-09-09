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

/**
 * Formats note text with an optional reference ID tag if not a standard ObjectId
 */
export const formatReferenceNote = (
  baseNote: string,
  referenceId?: string | null
): string => {
  if (referenceId && !toValidObjectId(referenceId)) {
    return `${baseNote} [Ref: ${referenceId}]`;
  }
  return baseNote;
};

export const StockUtils = {
  toValidObjectId,
  formatReferenceNote,
};
