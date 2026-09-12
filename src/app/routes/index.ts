import express from "express";
import { AuthRoutes } from "../modules/Auth/auth.routes";
import { UserRoutes } from "../modules/User/user.route";
import { RbacRoutes } from "../modules/RBAC/rbac.route";
import { ApprovalRoutes } from "../modules/Approval/approval.route";
import { DepartmentRoutes } from "../modules/Department/department.route";
import { LocationRoutes } from "../modules/Location/location.route";
import { CategoryRoutes } from "../modules/Category/category.route";
import { InventoryItemRoutes } from "../modules/InventoryItem/inventoryItem.route";
import { InventoryUnitRoutes } from "../modules/InventoryUnit/inventoryUnit.route";
import { StockRoutes } from "../modules/Stock/stock.route";
import { RequisitionRoutes } from "../modules/Requisition/requisition.route";
import { DistributionRoutes } from "../modules/Distribution/distribution.route";
import { ReturnRoutes } from "../modules/Return/return.route";
import { AuditRoutes } from "../modules/Audit/audit.route";
import { NotificationRoutes } from "../modules/Notification/notification.route";
import { ReportRoutes } from "../modules/Report/report.route";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/users",
    route: UserRoutes,
  },
  {
    path: "/rbac",
    route: RbacRoutes,
  },
  {
    path: "/approvals",
    route: ApprovalRoutes,
  },
  {
    path: "/departments",
    route: DepartmentRoutes,
  },
  {
    path: "/locations",
    route: LocationRoutes,
  },
  {
    path: "/categories",
    route: CategoryRoutes,
  },
  {
    path: "/inventory",
    route: InventoryItemRoutes,
  },
  {
    path: "/inventory-units",
    route: InventoryUnitRoutes,
  },
  {
    path: "/stock",
    route: StockRoutes,
  },
  {
    path: "/requisitions",
    route: RequisitionRoutes,
  },
  {
    path: "/distributions",
    route: DistributionRoutes,
  },
  {
    path: "/returns",
    route: ReturnRoutes,
  },
  {
    path: "/audit-logs",
    route: AuditRoutes,
  },
  {
    path: "/notifications",
    route: NotificationRoutes,
  },
  {
    path: "/reports",
    route: ReportRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
