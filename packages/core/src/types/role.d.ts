import { PermissionName } from './Permission';

export interface Role {
  name: string;
  level: number;
  permissions: PermissionName[];
  inherits?: string[];
}
