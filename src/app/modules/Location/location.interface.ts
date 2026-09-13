import { LocationType, RoomStatus } from "@prisma/client";

export interface ICreateBuildingPayload {
  name: string;
  code: string;
  description?: string;
  address?: string;
}

export interface IUpdateBuildingPayload {
  name?: string;
  description?: string;
  address?: string;
}

export interface ICreateFloorPayload {
  buildingId: string;
  name: string;
  code: string;
  floorNumber?: number;
}

export interface IUpdateFloorPayload {
  name?: string;
  code?: string;
  floorNumber?: number;
}

export interface ICreateRoomTypePayload {
  name: string;
  code: string;
  description?: string;
}

export interface IUpdateRoomTypePayload {
  name?: string;
  description?: string;
}

export interface ICreateRoomPayload {
  floorId: string;
  roomTypeId?: string;
  name: string;
  code: string;
  capacity?: number;
  description?: string;
  status?: "ACTIVE" | "MAINTENANCE" | "INACTIVE" | RoomStatus;
}

export interface IUpdateRoomPayload {
  floorId?: string;
  roomTypeId?: string;
  name?: string;
  capacity?: number;
  description?: string;
  status?: "ACTIVE" | "INACTIVE" | RoomStatus;
}

export interface ICreateStockLocationPayload {
  name: string;
  code: string;
  type: "STORE" | "ROOM" | "RACK" | "SHELF" | "CABINET" | "OTHER" | LocationType;
  description?: string;
  buildingId?: string;
  floorId?: string;
  roomId?: string;
}

export interface IUpdateStockLocationPayload {
  name?: string;
  type?: "STORE" | "ROOM" | "RACK" | "SHELF" | "CABINET" | "OTHER" | LocationType;
  description?: string;
  buildingId?: string;
  floorId?: string;
  roomId?: string;
}
