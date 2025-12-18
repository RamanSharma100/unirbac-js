import { PermissionName } from './Permission';

export interface Subject {
  id: string;
  roles: string[];
  permissions?: PermissionName[];
  attributes?: Record<string, unknown>;
}
