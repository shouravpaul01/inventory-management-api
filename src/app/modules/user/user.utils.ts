import { User } from "./user.model";

export const findLastFacultyId = async () => {
    const lastFaculty = await User.findOne(
      {},
      {
        userId: 1,
        _id: 0,
      },
    )
      .sort({
        createdAt: -1,
      })
      .lean();
  
    return lastFaculty?.userId ? lastFaculty.userId : undefined;
  };
  
  export const generateFacultyId = async () => {
    const lastFacultyId = await findLastFacultyId();

    // Extract the numeric part of the last Faculty ID, or start from 0 if no ID exists
    const currentIdNumber = lastFacultyId
      ? parseInt(lastFacultyId.split("F")[1], 10)
      : 0;

    // Increment the ID
    const newIdNumber = currentIdNumber + 1;

    // Generate the new Faculty ID
    const newFacultyId = `CSE${new Date().getFullYear()}F${newIdNumber.toString().padStart(3, "0")}`;

    return newFacultyId;
  };