import bcrypt from "bcrypt";
import prisma from "../shared/prisma";
import { env } from "../config/env.config";
import { SYSTEM_PERMISSIONS } from "../constants/permissions";
import { SYSTEM_ROLES } from "../constants/roles";

export const initiateSuperAdmin = async () => {
  try {
    console.log("🌱 Starting system database seeding...");

    // 1. Seed Default Department
    const defaultDept = await prisma.department.upsert({
      where: { code: "CSE" },
      update: {},
      create: {
        code: "CSE",
        name: "Department of Computer Science and Engineering",
        description: "Primary University Department for Inventory Management",
      },
    });

    // 2. Seed All System Permissions
    for (const perm of SYSTEM_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { code: perm.code },
        update: {
          name: perm.name,
          module: perm.module,
          description: perm.description,
        },
        create: {
          code: perm.code,
          name: perm.name,
          module: perm.module,
          description: perm.description,
        },
      });
    }

    const allDbPermissions = await prisma.permission.findMany();
    const permMap = new Map(allDbPermissions.map((p) => [p.code, p.id]));

    // 3. Seed System Roles & Role Permissions
    for (const roleDef of SYSTEM_ROLES) {
      const role = await prisma.role.upsert({
        where: { code: roleDef.code },
        update: {
          name: roleDef.name,
          description: roleDef.description,
          isSystemRole: roleDef.isSystemRole,
        },
        create: {
          code: roleDef.code,
          name: roleDef.name,
          description: roleDef.description,
          isSystemRole: roleDef.isSystemRole,
        },
      });

      // Resolve permission IDs
      let targetPermissionIds: string[] = [];
      if (roleDef.permissionCodes.includes("*")) {
        targetPermissionIds = allDbPermissions.map((p) => p.id);
      } else {
        targetPermissionIds = roleDef.permissionCodes
          .map((code) => permMap.get(code))
          .filter(Boolean) as string[];
      }

      // Upsert RolePermission mappings
      for (const permissionId of targetPermissionIds) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId,
          },
        });
      }
    }

    // 4. Seed Super Admin User & UserAuth
    const superAdminRole = await prisma.role.findUnique({
      where: { code: "SUPER_ADMIN" },
    });

    const adminEmail = env.ADMIN_EMAIL;
    const adminPassword = env.ADMIN_PASSWORD;
    const adminNameParts = (env.ADMIN_NAME || "Super Admin").split(" ");
    const firstName = adminNameParts[0] || "Super";
    const lastName = adminNameParts.slice(1).join(" ") || "Admin";
    const employeeId = process.env.INITIAL_ADMIN_EMPLOYEE_ID || "EMP-000001";
    const username = process.env.INITIAL_ADMIN_USERNAME || "superadmin";

    let superAdminUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: adminEmail },
          { username },
          { employeeId },
          { isSuperAdmin: true },
        ],
      },
      include: {
        auth: true,
      },
    });

    if (!superAdminUser) {
      const hashedPassword = await bcrypt.hash(adminPassword, 12);

      superAdminUser = await prisma.user.create({
        data: {
          employeeId,
          username,
          email: adminEmail,
          firstName,
          lastName,
          isSuperAdmin: true,
          status: "ACTIVE",
          departmentId: defaultDept.id,
          auth: {
            create: {
              password: hashedPassword,
              emailVerifiedAt: new Date(),
            },
          },
        },
        include: {
          auth: true,
        },
      });

      console.log(`✅ Super Admin User created: ${adminEmail}`);
    } else {
      // Ensure superAdmin flag is true and active
      await prisma.user.update({
        where: { id: superAdminUser.id },
        data: {
          isSuperAdmin: true,
          status: "ACTIVE",
        },
      });

      // Ensure UserAuth exists
      if (!superAdminUser.auth) {
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        await prisma.userAuth.create({
          data: {
            userId: superAdminUser.id,
            password: hashedPassword,
            emailVerifiedAt: new Date(),
          },
        });
      }
    }

    // Assign SUPER_ADMIN role to superAdminUser
    if (superAdminRole && superAdminUser) {
      await prisma.userRole.upsert({
        where: {
          userId_roleId: {
            userId: superAdminUser.id,
            roleId: superAdminRole.id,
          },
        },
        update: {},
        create: {
          userId: superAdminUser.id,
          roleId: superAdminRole.id,
        },
      });
    }

    console.log("🚀 System database seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  }
};