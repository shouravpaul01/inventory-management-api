import { JwtPayload } from "jsonwebtoken";

export interface IAuthUser extends JwtPayload {
  id: string;
  employeeId: string;
  username: string;
  email: string;
  firstName: string;
  lastName?: string | null;
  isSuperAdmin: boolean;
  departmentId: string;
  roles: string[];
  permissions: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: IAuthUser;
    }
  }
}