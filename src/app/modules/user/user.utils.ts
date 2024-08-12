import { User } from "./user.model";

export const findLastFacultyId = async () => {
    const lastFaculty = await User.findOne(
      {
        role: 'faculty',
      },
      {
        id: 1,
        _id: 0,
      },
    )
      .sort({
        createdAt: -1,
      })
      .lean();
  
    return lastFaculty?.id ? lastFaculty.id : undefined;
  };
  
  export const generateFacultyId = async () => {
    let currentId = (0).toString();
    const lastFacultyId = await findLastFacultyId();
  
    if (lastFacultyId) {
      currentId = lastFacultyId.split("-")[1] ;
    }
  
    let incrementId = (Number(currentId) + 1).toString();
  
    incrementId = `CSE${new Date().getFullYear()}F-${incrementId}`;
  
    return incrementId;
  };