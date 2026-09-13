/**
 * Sanitizes location and building codes to uppercase trimmed format.
 */
export const sanitizeLocationCode = (code?: string): string => {
  return code ? code.trim().toUpperCase() : "";
};

/**
 * Builds a readable breadcrumb/path for a location hierarchy.
 */
export const buildLocationPath = (parts: {
  buildingName?: string | null;
  floorName?: string | null;
  roomName?: string | null;
  locationName?: string | null;
}): string => {
  const segments = [
    parts.buildingName,
    parts.floorName,
    parts.roomName,
    parts.locationName,
  ].filter((p): p is string => Boolean(p && p.trim()));

  return segments.join(" > ");
};

export const LocationUtils = {
  sanitizeLocationCode,
  buildLocationPath,
};
