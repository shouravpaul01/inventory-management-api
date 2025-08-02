import { QueryBuilder } from "../../builder/QueryBuilder";
import { TFaculty } from "./faculty.interface";
import { Faculty } from "./faculty.model";

const createFacultyIntoDB = async (payload: TFaculty) => {
  const result = await Faculty.create(payload);
  return result;
};
const getAllFacultiesDB = async (query: Record<string, unknown>) => {
  const searchableFields = ["name", "email"];
  const mainQuery = new QueryBuilder(Faculty.find({}), query)
    .filter()
    .search(searchableFields);

  const totalPages = (await mainQuery.totalPages()).totalQuery;
  const facultyQuery = mainQuery.paginate();
  const faculties = await facultyQuery.modelQuery;

  const result = { data: faculties, totalPages: totalPages };
  return result;
};
const getSingleFacultyDB = async (facultyId: string) => {
  const result = await Faculty.findById(facultyId);
  return result;
};

const updateFacultyIntoDB = async (facultyId: string, payload: TFaculty) => {
  const result = await Faculty.findByIdAndUpdate(facultyId, payload, {
    new: true,
  });
  return result;
};

export const FacultyServices = {
  createFacultyIntoDB,
  getAllFacultiesDB,
  getSingleFacultyDB,
  updateFacultyIntoDB,
};
