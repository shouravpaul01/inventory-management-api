import { Types } from "mongoose";

export type TEventHistory = {
  eventType: "created" | "updated" | "approved" | "activated" | "deactivated" | "distributed";
  performedBy: Types.ObjectId;
  performedAt?: Date;
  comments?: string;
};



export type TRoom = {
  _id?: Types.ObjectId;
  roomNo: string;
  building?: string;
  floor: string;
  roomType:
    | "Classroom"
    | "Teacher Room"
    | "Lecture Hall"
    | "Laboratory"
    | "Office"
    | "Conference"
    | "Storage"
    | "Server Room"
    | "Library"
    | "Workshop"
    | "Other";
  capacity?: number;
  images?: string[];
  department?: string;
  assignedRoom?: Types.ObjectId;
  description?: string;
  features: (
    | "Projector"
    | "Whiteboard"
    | "Smart Board"
    | "Sound System"
    | "AC"
    | "Heating"
    | "WiFi"
    | "Disabled Access"
    | "Video Conferencing"
    | "Furniture"
  )[];
  distributedAccessoriesDetails:string[];
  
  isActive?: boolean;
  isApproved?: boolean;
  isDeleted?:boolean;
  eventsHistory?: TEventHistory[];
  createdAt?: Date;
  updatedAt?: Date;
};
