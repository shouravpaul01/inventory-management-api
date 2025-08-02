import { JwtPayload } from "jsonwebtoken";
import { TRoom } from "./room.interface";
import { Room } from "./room.modal";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import { deleteFileFromCloudinary } from "../../utils/deleteFileFromCloudinary";
import { TFileUpload } from "../../interfaces";
import { Types } from "mongoose";


const logEvent = (
  
  type:
    | "created"
    | "updated"
    | "approved"
    | "activated"
    | "deactivated"
    | "distributed",
  userId: Types.ObjectId,
  comments?: string
) => ({
  eventType: type,
  performedBy: userId,
  performedAt: new Date(),
  comments,
});

const createRoomIntoDB = async (
  payload: TRoom,
  user: JwtPayload,
  
) => {
  


  payload.eventsHistory = [logEvent("created", user.faculty, "Room created")];

  const result = await Room.create(payload);
  return result;
};

const getAllRoomsDB = async (query: Record<string, unknown>) => {
  const searchableFields = ["roomNo", "building", "floor"];

  const mainQuery = new QueryBuilder(Room.find({}), query)
    .filter()
    .search(searchableFields);

  const totalPages = (await mainQuery.totalPages()).totalQuery;
  const rooms = await mainQuery.paginate().modelQuery;

  return { data: rooms, totalPages };
};

const getSingleRoomDB = async (roomId: string) => {
  const room = await Room.findById(roomId).populate('eventsHistory.performedBy');
  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "roomError", "Room not found.");
  }
  return room;
};

const deleteSingleImageDB = async (roomId: string, imageUrl: string) => {
  const room = await Room.findById(roomId);
  if (!room || !imageUrl) {
    throw new AppError(httpStatus.NOT_FOUND, "roomError", "Room does not exist.");
  }

  const deleted = await deleteFileFromCloudinary(imageUrl);
  if (!deleted) {
    throw new AppError(httpStatus.NOT_FOUND, "imageError", "Failed to delete image.");
  }

  const updatedRoom = await Room.findByIdAndUpdate(
    roomId,
    { $pull: { images: imageUrl } },
    { new: true }
  );

  return updatedRoom;
};

const updateRoomIntoDB = async (
  roomId: string,
  payload: Partial<TRoom>,
  files: TFileUpload[],
  user: JwtPayload
) => {
  const room = await Room.findById(roomId);
  if (!room) {
    throw new AppError(httpStatus.NOT_FOUND, "roomError", "Room not found.");
  }

  if (room.images!.length === 0 && (!files || files.length === 0)) {
    throw new AppError(httpStatus.BAD_REQUEST, "images", "Images field is required.");
  }

  if (files && files.length > 0) {
    const imageUrls = files.map((file) => file.path);
    payload.images = [...room.images!, ...imageUrls];
  } else {
    delete payload.images;
  }

  const updateWithEvent = {
    ...payload,
    $push: {
      eventsHistory: logEvent("updated", new Types.ObjectId(user.faculty), "Room updated"),
    },
  };

  const updatedRoom = await Room.findByIdAndUpdate(roomId, updateWithEvent, {
    new: true,
  });

  return updatedRoom;
};

const updateRoomStatusDB = async (
  roomId: string,
  isActive: string,
  user: JwtPayload
) => {
  try {
    const room = await Room.findById(roomId);
    if (!room) {
      throw new AppError(httpStatus.NOT_FOUND, "roomError", "Room not found.");
    }
    
    const statusType = isActive === "true" ? "activated" : "deactivated";
    const result = await Room.findByIdAndUpdate(
      roomId,
      {
        isActive,
        $push: {
          eventsHistory: logEvent(statusType, user.faculty, `Room ${statusType}`),
        },
      },
      { new: true }
    );
   
    return result;
  } catch (error) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "roomError", "Failed to update room status.");
  }
};

const updateRoomApprovedStatusDB = async (user: JwtPayload, roomId: string) => {
  try {
    const room = await Room.findById(roomId);
    if (!room) {
      throw new AppError(httpStatus.NOT_FOUND, "roomError", "Room not found.");
    }
  
    const updatedRoom = await Room.findByIdAndUpdate(
      roomId,
      {
        isApproved: true,
        isActive: true,
        $push: {
          eventsHistory: logEvent( "approved", user.faculty, "Room approved"),
        },
      },
      { new: true }
    );
  
    return updatedRoom; 
  } catch (error) {
    throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "roomError", "Failed to update approval status.");
  }
};

export const RoomServices = {
  createRoomIntoDB,
  getAllRoomsDB,
  getSingleRoomDB,
  deleteSingleImageDB,
  updateRoomIntoDB,
  updateRoomStatusDB,
  updateRoomApprovedStatusDB,
};
