export interface IRoleDef {
  code: string;
  name: string;
  description: string;
  isSystemRole: boolean;
  permissionCodes: string[];
}

export const SYSTEM_ROLES: IRoleDef[] = [
  {
    code: "SUPER_ADMIN",
    name: "Super Administrator",
    description: "Full administrative access to entire university inventory system",
    isSystemRole: true,
    permissionCodes: ["*"], // Wildcard meaning all permissions
  },
  {
    code: "STORE_OFFICER",
    name: "Store Officer",
    description: "Manages catalog, physical stock, serialized tracking, distribution, and returns",
    isSystemRole: true,
    permissionCodes: [
      "category.view", "category.create", "category.update",
      "inventory.view", "inventory.create", "inventory.update",
      "inventory_unit.view", "inventory_unit.create", "inventory_unit.update", "inventory_unit.qr_lookup",
      "location.view", "location.create", "location.update",
      "stock.view", "stock.in", "stock.out", "stock.transfer", "stock.adjust",
      "requisition.view",
      "distribution.view", "distribution.create", "distribution.confirm_delivery",
      "return.view", "return.create", "return.process",
      "code_sequence.view",
      "notification.view", "notification.update",
      "report.view",
    ],
  },
  {
    code: "DEPT_HEAD",
    name: "Department Head",
    description: "Department leadership who reviews and approves requisitions, approvals, and audits",
    isSystemRole: true,
    permissionCodes: [
      "user.view",
      "department.view",
      "location.view",
      "category.view",
      "inventory.view",
      "inventory_unit.view", "inventory_unit.qr_lookup",
      "stock.view",
      "requisition.view", "requisition.approve",
      "approval.view", "approval.action",
      "distribution.view",
      "return.view",
      "audit.view",
      "notification.view", "notification.update",
      "report.view",
    ],
  },
  {
    code: "STAFF",
    name: "Faculty & Staff Member",
    description: "Can submit requisitions, accept asset handovers, and initiate returns",
    isSystemRole: true,
    permissionCodes: [
      "inventory.view",
      "inventory_unit.view", "inventory_unit.qr_lookup",
      "requisition.create", "requisition.view", "requisition.submit", "requisition.cancel",
      "distribution.view", "distribution.confirm_delivery",
      "return.create", "return.view",
      "notification.view", "notification.update",
    ],
  },
];
