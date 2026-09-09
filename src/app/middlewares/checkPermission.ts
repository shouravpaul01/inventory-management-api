import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import ApiError from "../../errors/ApiErrors";

/**
 * Middleware to enforce granular permissions.
 *
 * Checks if the authenticated user has ANY or ALL required permissions.
 * By default requires at least one of the provided permissions.
 */
export const checkPermission = (...requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user;

      if (!user) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "User not authenticated!");
      }

      // Super Admin has all capabilities
      if (user.isSuperAdmin) {
        return next();
      }

      const userPermissions = user.permissions || [];

      // Check if user has at least one of the required permissions
      const hasPermission = requiredPermissions.some((perm) =>
        userPermissions.includes(perm)
      );

      if (!hasPermission) {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          `Forbidden! You lack the required permission: [${requiredPermissions.join(", ")}]`
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default checkPermission;
