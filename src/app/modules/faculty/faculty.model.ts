import { Schema, model } from "mongoose";
import { TFaculty, TPublication } from "./faculty.interface";

const publicationSchema = new Schema<TPublication>({
  title: { type: String },
  journal: { type: String },
  year: { type: Number },
  authors: { type: [String] },
  doi: { type: String },
});
const facultySchema = new Schema<TFaculty>({
  userId: { type: String, required: true },
  name: { type: String, required: true,set: (name: string) => name.replace(/\b\w/g, (char) => char.toUpperCase()), },
  image: { type: String },
  designation: { type: String, required: true },
  department: {
    type: String,
  },
  roomNo: { type: Number, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  researchInterests: { type: [String] },
  coursesTaught: { type: [String] },
  publications: [publicationSchema],
});

export const Faculty = model<TFaculty>("Faculty", facultySchema);
