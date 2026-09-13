export interface IPermissionDef {
  code: string;
  name: string;
  module: string;
  description: string;
}

export const SYSTEM_PERMISSIONS: IPermissionDef[] = [
  // User Management
  { code: "user.view", name: "View Users", module: "User", description: "View user profiles and list" },
  { code: "user.create", name: "Create User", module: "User", description: "Create new university department users" },
  { code: "user.update", name: "Update User", module: "User", description: "Update user profile details" },
  { code: "user.status", name: "Manage User Status", module: "User", description: "Activate, deactivate, or suspend users" },
  { code: "user.manage_roles", name: "Assign User Roles", module: "User", description: "Assign or remove user roles" },
  { code: "user.override_permission", name: "Override Permissions", module: "User", description: "Grant or revoke specific permissions for a user" },

  // Role & RBAC
  { code: "role.view", name: "View Roles", module: "RBAC", description: "View roles and role permissions" },
  { code: "role.create", name: "Create Role", module: "RBAC", description: "Create custom roles" },
  { code: "role.update", name: "Update Role", module: "RBAC", description: "Update role permissions and details" },
  { code: "role.delete", name: "Delete Role", module: "RBAC", description: "Delete non-system roles" },

  // Department
  { code: "department.view", name: "View Department", module: "Department", description: "View department details" },
  { code: "department.create", name: "Create Department", module: "Department", description: "Create new departments" },
  { code: "department.update", name: "Update Department", module: "Department", description: "Update department information" },
  { code: "department.delete", name: "Delete Department", module: "Department", description: "Delete departments" },

  // Location Hierarchy (Building, Floor, Room, RoomType, StockLocation)
  { code: "location.view", name: "View Locations", module: "Location", description: "View buildings, floors, rooms, and storage locations" },
  { code: "location.create", name: "Create Location", module: "Location", description: "Create buildings, floors, rooms, and storage locations" },
  { code: "location.update", name: "Update Location", module: "Location", description: "Update location entities" },
  { code: "location.delete", name: "Delete Location", module: "Location", description: "Delete location entities" },

  // Category & Inventory Catalog
  { code: "category.view", name: "View Categories", module: "Category", description: "View category hierarchy" },
  { code: "category.create", name: "Create Category", module: "Category", description: "Create inventory categories" },
  { code: "category.update", name: "Update Category", module: "Category", description: "Update inventory categories" },
  { code: "category.delete", name: "Delete Category", module: "Category", description: "Delete inventory categories" },

  { code: "inventory.view", name: "View Inventory Catalog", module: "Inventory", description: "View inventory items and specifications" },
  { code: "inventory.create", name: "Create Inventory Item", module: "Inventory", description: "Create inventory item catalog entries" },
  { code: "inventory.update", name: "Update Inventory Item", module: "Inventory", description: "Update inventory catalog entries" },
  { code: "inventory.delete", name: "Delete Inventory Item", module: "Inventory", description: "Delete inventory catalog entries" },

  // Serialized Units & QR Lookup
  { code: "inventory_unit.view", name: "View Serialized Units", module: "InventoryUnit", description: "View serialized physical units and holders" },
  { code: "inventory_unit.create", name: "Create Serialized Unit", module: "InventoryUnit", description: "Register physical units with unique codes" },
  { code: "inventory_unit.update", name: "Update Serialized Unit", module: "InventoryUnit", description: "Update unit status, condition, or notes" },
  { code: "inventory_unit.delete", name: "Delete Serialized Unit", module: "InventoryUnit", description: "Delete physical units" },
  { code: "inventory_unit.qr_lookup", name: "Scan & Lookup QR", module: "InventoryUnit", description: "Scan QR code and retrieve live asset status" },

  // Stock Management (Bulk balances, movements, transfers)
  { code: "stock.view", name: "View Stock Balances", module: "Stock", description: "View stock balances across locations" },
  { code: "stock.in", name: "Stock In / Purchase", module: "Stock", description: "Receive new stock into storage locations" },
  { code: "stock.out", name: "Stock Out", module: "Stock", description: "Issue stock out or write off" },
  { code: "stock.transfer", name: "Stock Transfer", module: "Stock", description: "Transfer stock between storage locations" },
  { code: "stock.adjust", name: "Stock Adjustment", module: "Stock", description: "Adjust stock quantities for reconciliation" },

  // Requisitions
  { code: "requisition.view", name: "View Requisitions", module: "Requisition", description: "View requisitions and request lines" },
  { code: "requisition.create", name: "Create Requisition", module: "Requisition", description: "Create and draft requisitions" },
  { code: "requisition.submit", name: "Submit Requisition", module: "Requisition", description: "Submit requisitions for department review" },
  { code: "requisition.update", name: "Update Requisition", module: "Requisition", description: "Update draft requisitions" },
  { code: "requisition.cancel", name: "Cancel Requisition", module: "Requisition", description: "Cancel pending requisitions" },
  { code: "requisition.approve", name: "Approve Requisition", module: "Requisition", description: "Approve, partially approve, or reject requisitions" },

  // Distribution
  { code: "distribution.view", name: "View Distributions", module: "Distribution", description: "View issued distribution records" },
  { code: "distribution.create", name: "Create Distribution", module: "Distribution", description: "Issue inventory against approved requisitions" },
  { code: "distribution.confirm_delivery", name: "Confirm Delivery", module: "Distribution", description: "Acknowledge receipt and handover confirmation" },

  // Return
  { code: "return.view", name: "View Returns", module: "Return", description: "View return transactions and expected returns" },
  { code: "return.create", name: "Initiate Return", module: "Return", description: "Initiate return of temporary or issued inventory" },
  { code: "return.process", name: "Process Return", module: "Return", description: "Inspect returned condition and restock into locations" },

  // Approval Engine & Policies
  { code: "approval.view", name: "View Approval Requests", module: "Approval", description: "View pending approval requests and history" },
  { code: "approval.action", name: "Action Approval Request", module: "Approval", description: "Approve, reject, or request corrections" },
  { code: "approval.manage_policy", name: "Manage Approval Policies", module: "Approval", description: "Configure approval rules across system/roles/users" },
  { code: "approval.bypass", name: "Bypass Approval", module: "Approval", description: "Explicit permission to bypass required approvals" },

  // Code Sequence
  { code: "code_sequence.view", name: "View Code Sequences", module: "CodeSequence", description: "View configurable code sequences" },
  { code: "code_sequence.manage", name: "Manage Code Sequences", module: "CodeSequence", description: "Create or configure code sequence formats" },

  // Audit & Notification
  { code: "audit.view", name: "View Audit Logs", module: "Audit", description: "View comprehensive system audit trail" },
  { code: "notification.view", name: "View Notifications", module: "Notification", description: "View user notifications" },
  { code: "notification.update", name: "Manage Notifications", module: "Notification", description: "Mark notifications as read/unread" },

  // Reports
  { code: "report.view", name: "View Reports & Analytics", module: "Report", description: "Access inventory, movement, and operational reports" },
];
