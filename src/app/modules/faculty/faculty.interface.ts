import { Types } from "mongoose";

export type TPublication = {
  title: string;
  journal: string;
  year: number;
  authors: string[];
  doi?: string;
};

export type TFaculty = {
  userId: string;

  name: string;
  image?: string;
  designation: string;
  department: string;
  roomNo: number;
  email: string;
  phone?: string;
  researchInterests?: string[];
  coursesTaught?: string[];
  publications?: TPublication[];
};
