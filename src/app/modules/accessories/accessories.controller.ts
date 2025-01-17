import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AccessoryServices } from "./accessories.service";

const createAccessoryInto = catchAsync(async (req, res) => {
  const result = await AccessoryServices.createAccessoryIntoDB(
    (req as any).file,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Accessory created successfully.",
    data: result,
  });
});
const getAllAccessories = catchAsync(async (req, res) => {
  const result = await AccessoryServices.getAllAccessoriesDB(req.query);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "All accessories retrieved successfully.",
    data: result,
  });
});
const getSingleAccessory = catchAsync(async (req, res) => {
  const { accessoryId } = req.params;
  const result = await AccessoryServices.getSingleAccessoryDB(accessoryId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully retrieved the Accessory.",
    data: result,
  });
});
const updateAccessory = catchAsync(async (req, res) => {
  const { accessoryId } = req.params;

  const result = await AccessoryServices.updateAccessoryDB(
    accessoryId,
    (req as any).file,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Accessory updated successfully.",
    data: result,
  });
});

const updateAccessoryStatus = catchAsync(async (req, res) => {
  const { accessoryId } = req.params;
  const { isActive } = req.query;
  const result = await AccessoryServices.updateAccessoryStatusDB(
    accessoryId,
    isActive as unknown as boolean
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${
      result?.isActive
        ? "Accessory inactivation was successful."
        : "Accessory activation was successful."
    }`,
    data: result,
  });
});
const updateAccessoryApprovedStatus = catchAsync(async (req, res) => {
  const { accessoryId } = req.params;

  const result = await AccessoryServices.updateAccessoryApprovedStatusDB(req.user,
    accessoryId
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Accessory approval successful.",
    data: result,
  });
});
export const AccessoryControllers = {
  createAccessoryInto,
  getAllAccessories,
  getSingleAccessory,
  updateAccessory,
  
  updateAccessoryStatus,
  updateAccessoryApprovedStatus,
};
