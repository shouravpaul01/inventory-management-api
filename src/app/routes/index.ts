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
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
