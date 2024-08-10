import mongoose, { Schema, Document, model } from 'mongoose';
import { TFaculty, TPublication } from './faculty.interface';

const publicationSchema= new Schema<TPublication>({
    title: { type: String, required: true },
    journal: { type: String, required: true },
    year: { type: Number, required: true },
    authors: { type: [String], required: true },
    doi: { type: String },
  });
const facultySchema= new Schema<TFaculty>({
  _id: { type: String, required: true },
  name: { type: String, required: true },
  designation: { type: String, required: true },
  department: { type: String, required: true },
  roomNo: { type: Number, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  researchInterests: { type: [String] },
  coursesTaught: { type: [String] },
  publications: [publicationSchema],
});

export const Faculty = model<TFaculty>('Faculty', facultySchema);

