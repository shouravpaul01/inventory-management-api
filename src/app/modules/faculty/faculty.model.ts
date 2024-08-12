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
  id: { type: String, required: true },
  user:{type:Schema.Types.ObjectId,ref:"User",required:true},
  name: { type: String, required: true },
  image: { type: String },
  designation: { type: String, required: true },
  department: {
    type: String,
    default: "Computer Science and Engineering(CSE)",
  },
  roomNo: { type: Number, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  researchInterests: { type: [String] },
  coursesTaught: { type: [String] },
  publications: [publicationSchema],
});

export const Faculty = model<TFaculty>("Faculty", facultySchema);
