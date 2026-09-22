import {
  ApprovalDecision,
  ApprovalEntityType,
  ApprovalRequirement,
  ApprovalScope,
  ApprovalStatus,
} from "@prisma/client";
import { IAuthUser } from "../../../interfaces";

export type IApprovalActionType =
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "ADJUST"
  | "TRANSFER"
  | "SUBMIT"
  | "IN"
  | "OUT";

export interface IApprovalCheckResult {
  required: boolean;
  bypassed?: boolean;
  policy?: any;
  reason?: string;
}

export interface ICreateApprovalRequestParams {
  entityType: ApprovalEntityType;
  entityId: string;
  permissionCode: string;
  requestedBy: IAuthUser;
  policy?: any;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface IProcessApprovalDecisionPayload {
  decision: "APPROVE" | "REJECT" | "REQUEST_CHANGE";
  comments?: string;
}

export interface IResubmitApprovalRequestPayload {
  updatedPayload: Record<string, any>;
  resubmitReason?: string;
}

export interface IApprovalInterceptParams<T> {
  permissionCode: string;
  entityType: ApprovalEntityType;
  action: IApprovalActionType;
  entityId?: string;
  user: IAuthUser;
  payload: any;
  summary: string;
  executeDirectly: () => Promise<T>;
}

export interface IApprovalInterceptResult<T> {
  approvalRequired: boolean;
  bypassed?: boolean;
  data: T | any;
  message?: string;
}

export interface ICreatePolicyPayload {
  permissionCode?: string;
  permissionCodes?: string[];
  requirement?: "REQUIRED" | "NOT_REQUIRED";
  scope?: "ROLE" | "USER" | "SYSTEM";
  roleId?: string;
  userId?: string;
  condition?: any;
  approvalLevelCount?: number;
  allowSelfApproval?: boolean;
}

export interface IUpdatePolicyPayload {
  permissionCode?: string;
  permissionCodes?: string[];
  requirement?: "REQUIRED" | "NOT_REQUIRED";
  scope?: "ROLE" | "USER" | "SYSTEM";
  roleId?: string | null;
  userId?: string | null;
  condition?: any;
  approvalLevelCount?: number;
  allowSelfApproval?: boolean;
  isActive?: boolean;
}
