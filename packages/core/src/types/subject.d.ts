import { PermissionName } from './permission';

export type Subject = {
  id: string;
  roles: string[];
  permissions?: PermissionName[];
  attributes?: Record<string, unknown>;
};
