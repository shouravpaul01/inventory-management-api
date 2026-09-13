export interface ICreateRolePayload {
  name: string;
  code: string;
  description?: string;
  permissionIds?: string[];
}

export interface IUpdateRolePayload {
  name?: string;
  description?: string;
}

export interface IAssignRolePermissionsPayload {
  permissionIds: string[];
}
