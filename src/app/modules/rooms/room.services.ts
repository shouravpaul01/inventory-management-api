import { JwtPayload } from "jsonwebtoken";
import { TRoom } from "./room.interface";
import { Room } from "./room.modal";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import httpStatus from "http-status";
import { deleteFileFromCloudinary } from "../../utils/deleteFileFromCloudinary";

const createRoomIntoDB = async (
  payload: TRoom,
  user: JwtPayload,
  files: any
) => {
  const imagesUrls = files?.map((file: any) => file.path);
  if (imagesUrls?.length > 0) {
    payload.images = imagesUrls;
  }else{
    throw new AppError(httpStatus.NOT_FOUND,"images","Images are required.")
  }
  payload.createdBy = user._id;

  const result = await Room.create(payload);
  return result;
};
const getAllRoomsDB = async (query: Record<string, unknown>) => {
  const searchableFields = ["roomNo", "building","floor"];
  const mainQuery = new QueryBuilder(Room.find({}), query)
    .filter()
    .search(searchableFields);

  const totalPages = (await mainQuery.totalPages()).totalQuery;
  const categoryQuery = mainQuery.paginate();
  const categories = await categoryQuery.modelQuery;

  const result = { data: categories, totalPages: totalPages };
  return result;
};
const getSingleRoomDB = async (roomId: string) => {
  const result = await Room.findById(roomId);
  return result;
};
const deleteSingleImageDB = async (roomId: string,imageUrl:string) => {
  const isRoomExists=await Room.findById(roomId)
  const isDeleteImage=await deleteFileFromCloudinary(imageUrl)
  if (!isRoomExists && !imageUrl) {
    throw new AppError(httpStatus.NOT_FOUND,"roomError","Room does not exist.")
  }
  if (!isDeleteImage) {
    throw new AppError(httpStatus.NOT_FOUND,"roomError","Room does not exist.")
  }
  const result=await Room.findByIdAndUpdate(roomId,{$pull:{images:imageUrl}},{new:true})
  return result;
};
const updateRoomIntoDB = async (
  categoryId: string,
  payload: Partial<TRoom>
) => {
  const result = await Room.findByIdAndUpdate(categoryId, payload, {
    new: true,
  });
  return result;
};
const updateRoomStatusDB = async (
  roomId: string,
  isActive: boolean
) => {
  const isCategoryExists = await Room.findById(roomId);
  if (!isCategoryExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "roomError",
      "Category does not exist."
    );
  }
  const result = await Room.findByIdAndUpdate(
    roomId,
    { isActive: isActive },
    { new: true }
  );
  return result;
};
const updateRoomApprovedStatusDB = async (
  user: JwtPayload,
  categoryId: string
) => {
  const isRoomExists = await Room.findById(categoryId);
  if (!isRoomExists) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "roomError",
      "Room details does not exist."
    );
  }
  const result = await Room.findByIdAndUpdate(
    categoryId,
    {
      "approvalDetails.isApproved": true,
      "approvalDetails.approvedBy": user._id,
      "approvalDetails.approvedDate": new Date(),
      isActive: true,
    },
    { new: true }
  );
  return result;
};
export const RoomServices = {
  createRoomIntoDB,
  getAllRoomsDB,
  getSingleRoomDB,
  deleteSingleImageDB,
  updateRoomIntoDB,
  updateRoomStatusDB,
  updateRoomApprovedStatusDB
};
