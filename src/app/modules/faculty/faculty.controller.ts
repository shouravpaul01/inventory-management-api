import { catchAsync } from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { FacultyServices } from "./faculty.service";
import httpStatus from "http-status";

const createFacultyInto = catchAsync(async (req, res) => {
  const result = await FacultyServices.createFacultyIntoDB(req.body);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully Created.",
    data: result,
  });
});

const getSingleFaculty = catchAsync(async (req, res) => {
  const { facultyId } = req.params;
  const result = await FacultyServices.getSingleFacultyDB(facultyId);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully Created.",
    data: result,
  });
});
const updateFacultyInto = catchAsync(async (req, res) => {
  const { facultyId } = req.params;
  const result = await FacultyServices.updateFacultyIntoDB(facultyId, req.body);
  return sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Successfully Created.",
    data: result,
  });
});

export const FacultyControllers = {
  createFacultyInto,
  getSingleFaculty,
  updateFacultyInto,
};
