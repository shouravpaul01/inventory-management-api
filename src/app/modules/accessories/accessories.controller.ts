import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { AccessoryServices } from "./accessories.service";

const createAccessoryInto = catchAsync(async (req, res) => {
    const result = await AccessoryServices.createAccessoryIntoDB((req as any).file,req.body);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Accessory created successfully.",
      data: result,
    });
  });

  export const AccessoryControllers={
    createAccessoryInto
  }