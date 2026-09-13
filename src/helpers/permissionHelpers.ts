import { SYSTEM_PERMISSIONS } from "../constants/permissions";

export interface IUserWithRbac {
  isSuperAdmin: boolean;
  roles?: Array<{
    role: {
      code: string;
      permissions?: Array<{
        permission: {
          code: string;
        };
      }>;
    };
  }>;
  permissions?: Array<{
    effect: "GRANT" | "REVOKE";
    permission: {
      code: string;
    };
  }>;
}

export const calculateEffectivePermissions = (user: IUserWithRbac): string[] => {
  if (user.isSuperAdmin) {
    return SYSTEM_PERMISSIONS.map((p) => p.code);
  }

  const effectiveSet = new Set<string>();

  // 1. Role-based permissions
  if (user.roles) {
    for (const userRole of user.roles) {
      if (userRole.role?.permissions) {
        for (const rp of userRole.role.permissions) {
          if (rp.permission?.code) {
            effectiveSet.add(rp.permission.code);
          }
        }
      }
    }
  }

  // 2. User-specific permission overrides (GRANT / REVOKE)
  if (user.permissions) {
    for (const override of user.permissions) {
      if (override.permission?.code) {
        if (override.effect === "GRANT") {
          effectiveSet.add(override.permission.code);
        } else if (override.effect === "REVOKE") {
          effectiveSet.delete(override.permission.code);
        }
      }
    }
  }

  return Array.from(effectiveSet);
};
