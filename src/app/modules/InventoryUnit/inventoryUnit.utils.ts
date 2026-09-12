import { env } from "../../../config/env.config";

/**
 * Builds the public QR code URL for an asset.
 */
export const generateQrValue = (uniqueCode: string): string => {
  const baseUrl = env.FRONTEND_URL || "https://inventory.university.edu";
  return `${baseUrl}/assets/${uniqueCode}`;
};

/**
 * Derives a sequential asset prefix from an item code.
 */
export const getAssetPrefix = (itemCode: string, fallback = "ASSET"): string => {
  return itemCode.split("-")[0] || fallback;
};

export const InventoryUnitUtils = {
  generateQrValue,
  getAssetPrefix,
};
