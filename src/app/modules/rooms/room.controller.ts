import httpStatus from "http-status";
import { catchAsync } from "../../utils/catchAsync";
import { RoomServices } from "./room.services";
import sendResponse from "../../utils/sendResponse";

const createRoomInto = catchAsync(async (req, res) => {
  console.log(req,"req")
    const result = await RoomServices.createRoomIntoDB(req.body,req.user,(req as any).files);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Room created successfully.",
      data: result,
    });
  });
  const getAllRooms = catchAsync(async (req, res) => { 
    const result = await RoomServices.getAllRoomsDB(req.query);
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Successfully retrived all Roooms.",
      data: result,
    });
  });
  const getSingleRoom = catchAsync(async (req, res) => {
      
      const { roomId } = req.params;
      const result = await RoomServices.getSingleRoomDB(roomId);
      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Successfully retrieved the Room details.",
        data: result,
      });
    });
    const updateRoomInto = catchAsync(async (req, res) => {
      const { roomId } = req.params;
     
      const result = await RoomServices.updateRoomIntoDB(roomId, req.body);
      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Room details updated successfully.",
        data: result,
      });
    });
    const updateRoomStatus = catchAsync(async (req, res) => {
      const { roomId } = req.params;
      const { isActive } = req.query;
      const result = await RoomServices.updateRoomStatusDB(
        roomId,
        isActive as unknown as boolean
      );
      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: `${result?.isActive?"Room inactivation was successful.":"Room activation was successful."}`,
        data: result,
      });
    });
    const updateRoomApprovedStatus = catchAsync(async (req, res) => {
      const { roomId } = req.params;
   
      const result = await RoomServices.updateRoomApprovedStatusDB(req.user,
        roomId,
      );
      sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: "Room approval successful.",
        data: result,
      });
    });
  export const RoomControllers={
    createRoomInto,
    getAllRooms,
    getSingleRoom,
    updateRoomInto,
    updateRoomStatus,
    updateRoomApprovedStatus
  }