import { PermissionName } from './Permission';

export type Role = {
  name: string;
  level: number;
  permissions: PermissionName[];
  inherits?: string[];
  denies?: string[];
};
