import {
  ApprovalDecision,
  ApprovalEntityType,
  ApprovalRequirement,
  ApprovalScope,
} from "@prisma/client";
import { IAuthUser } from "../../../interfaces";

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
  policy: any;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface IProcessApprovalDecisionPayload {
  decision: "APPROVE" | "REJECT" | "REQUEST_CHANGE";
  comments?: string;
}

export interface ICreatePolicyPayload {
  permissionCode: string;
  requirement?: "REQUIRED" | "NOT_REQUIRED";
  scope?: "SYSTEM" | "ROLE" | "USER";
  roleId?: string;
  userId?: string;
  condition?: any;
  approvalLevelCount?: number;
  allowSelfApproval?: boolean;
}

export interface IUpdatePolicyPayload {
  requirement?: "REQUIRED" | "NOT_REQUIRED";
  condition?: any;
  approvalLevelCount?: number;
  allowSelfApproval?: boolean;
  isActive?: boolean;
}
