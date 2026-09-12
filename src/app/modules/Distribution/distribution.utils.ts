import { FulfillmentStatus, RequestLineStatus, RequestStatus } from "@prisma/client";

/**
 * Aggregates line distribution quantities by source location
 */
export const aggregateLocationQuantities = (
  lines: Array<{ locationId: string; quantity: number }>
): Record<string, number> => {
  const map: Record<string, number> = {};
  for (const line of lines) {
    map[line.locationId] = (map[line.locationId] || 0) + line.quantity;
  }
  return map;
};

/**
 * Determines updated requisition line status based on issued vs approved quantities
 */
export const calculateLineFulfillmentStatus = (
  newIssuedQty: number,
  approvedQty: number
): RequestLineStatus => {
  return newIssuedQty >= approvedQty
    ? RequestLineStatus.ISSUED
    : RequestLineStatus.PARTIALLY_ISSUED;
};

/**
 * Determines requisition overall fulfillment status based on line quantities
 */
export const calculateRequisitionFulfillment = (
  lines: Array<{ issuedQty: number; approvedQty: number }>
): { fulfillmentStatus: FulfillmentStatus; status: RequestStatus } => {
  const allFulfilled = lines.every((l) => l.issuedQty >= l.approvedQty);
  return {
    fulfillmentStatus: allFulfilled
      ? FulfillmentStatus.FULFILLED
      : FulfillmentStatus.PARTIALLY_FULFILLED,
    status: allFulfilled ? RequestStatus.FULFILLED : RequestStatus.PARTIALLY_FULFILLED,
  };
};

export const DistributionUtils = {
  aggregateLocationQuantities,
  calculateLineFulfillmentStatus,
  calculateRequisitionFulfillment,
};
