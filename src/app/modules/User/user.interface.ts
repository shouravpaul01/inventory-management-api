import { PermissionEffect, UserStatus } from "@prisma/client";

export interface ICreateUserPayload {
  employeeId: string;
  username: string;
  email: string;
  firstName: string;
  lastName?: string;
  phone?: string;
  departmentId: string;
  password: string;
  roleIds?: string[];
}

export interface IUpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  departmentId?: string;
}

export type UserStatusType = "ACTIVE" | "INACTIVE" | "SUSPENDED" | UserStatus;

export interface IPermissionOverrideItem {
  permissionId: string;
  effect: "GRANT" | "REVOKE" | PermissionEffect;
}
