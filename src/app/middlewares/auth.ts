import { NextFunction, Request, Response } from "express";
import { Secret } from "jsonwebtoken";
import httpStatus from "http-status";
import ApiError from "../../errors/ApiErrors";
import { jwtHelpers } from "../../helpers/jwtHelpers";
import prisma from "../../shared/prisma";
import { env } from "../../config/env.config";
import { calculateEffectivePermissions } from "../../helpers/permissionHelpers";
import { IAuthUser } from "../../interfaces";

const auth = (...roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      let token = req.headers.authorization;

      if (!token && req.cookies?.accessToken) {
        token = req.cookies.accessToken;
      }

      if (!token) {
        throw new ApiError(httpStatus.UNAUTHORIZED, "You are not authorized!");
      }

      if (token.startsWith("Bearer ")) {
        token = token.slice(7).trim();
      }

      const verifiedUser = jwtHelpers.verifyToken(
        token,
        env.JWT_SECRET as Secret
      );

      const user = await prisma.user.findUnique({
        where: {
          id: (verifiedUser as any).id || (verifiedUser as any).userId,
        },
        include: {
          department: true,
          roles: {
            include: {
              role: {
                include: {
                  permissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      });

      if (!user) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found or deleted!");
      }

      if (user.status !== "ACTIVE") {
        throw new ApiError(
          httpStatus.FORBIDDEN,
          `Account is ${user.status.toLowerCase()}! Please contact your administrator.`
        );
      }

      const userRoleCodes = user.roles.map((ur) => ur.role.code);
      const effectivePermissions = calculateEffectivePermissions(user as any);

      // Super Admin automatically bypasses role restrictions
      if (roles.length > 0 && !user.isSuperAdmin) {
        const hasMatchingRole = roles.some((r) => userRoleCodes.includes(r));
        if (!hasMatchingRole) {
          throw new ApiError(
            httpStatus.FORBIDDEN,
            `Forbidden! Your assigned roles do not have access to this resource.`
          );
        }
      }

      req.user = {
        id: user.id,
        employeeId: user.employeeId,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isSuperAdmin: user.isSuperAdmin,
        departmentId: user.departmentId,
        roles: userRoleCodes,
        permissions: effectivePermissions,
      };

      next();
    } catch (err) {
      next(err);
    }
  };
};

export default auth;
