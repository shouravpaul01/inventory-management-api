import { Types } from "mongoose";

export type TEventHistory = {
  eventType: "created" | "updated" | "approved" | "blocked" | "unblocked" ;
  performedBy?: Types.ObjectId | string;
  performedAt: Date;
  comments?: string;
};

export type TPublication = {
  title: string;
  journal: string;
  year: number;
  authors: string[];
  doi?: string;
};

export type TFaculty = {
  _id:Types.ObjectId;
  userId: string;
  name: string;
  image?: string;
  designation: string;
  department?: string;
  roomNo: number;
  email: string;
  phone?: string;
  researchInterests?: string[];
  coursesTaught?: string[];
  publications?: TPublication[];
  isBlocked?: boolean;
  isDeleted?: boolean;
  eventshistory?: TEventHistory[];
};