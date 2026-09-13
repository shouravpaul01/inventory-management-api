export interface ICreateCategoryPayload {
  name: string;
  code: string;
  description?: string;
  parentId?: string;
}

export interface IUpdateCategoryPayload {
  name?: string;
  description?: string;
  parentId?: string | null;
}
