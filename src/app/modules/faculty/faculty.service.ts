import { QueryBuilder } from "../../builder/QueryBuilder";
import { TFaculty } from "./faculty.interface";
import { Faculty } from "./faculty.model";

const createFacultyIntoDB = async (payload: TFaculty) => {
  const result = await Faculty.create(payload);
  return result;
};
const getAllFacultyMembersDB = async (query: Record<string, undefined>) => {
  const searchableFields = ["name", "designation"];

  const mainQuery = new QueryBuilder(Faculty.find({}).populate("user"), query).search(
    searchableFields
  );

  const totalPages = (await mainQuery.totalPages()).totalQuery;
  const queryPaginated = mainQuery.paginate();
  const facultyMembers = await queryPaginated.modelQuery;

  const result = { data: facultyMembers, totalPages: totalPages };
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
  getAllFacultyMembersDB,
  getSingleFacultyDB,
  updateFacultyIntoDB,
};
