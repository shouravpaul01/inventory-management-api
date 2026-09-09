import express from "express";
import { AuthRoutes } from "../modules/Auth/auth.routes";
import { UserRoutes } from "../modules/User/user.route";
import { RbacRoutes } from "../modules/RBAC/rbac.route";
import { ApprovalRoutes } from "../modules/Approval/approval.route";
import { DepartmentRoutes } from "../modules/Department/department.route";
import { LocationRoutes } from "../modules/Location/location.route";

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
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;
