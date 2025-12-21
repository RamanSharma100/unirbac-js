import { PermissionName } from '../types';

export class Permission {
  static match = (pattern: string, permission: PermissionName): boolean => {
    if (pattern === permission) {
      return true;
    }

    const patternParts = pattern.split(':') || pattern.split('.');
    const permissionParts = permission.split(':') || permission.split('.');

    for (let i = 0; i < patternParts.length; i++) {
      const patternPart = patternParts[i];
      const permissionPart = permissionParts[i];

      if (patternPart === '**') {
        return true;
      }

      if (patternPart === '*') {
        continue;
      }

      if (!permissionPart) {
        return false;
      }

      if (patternPart !== permissionPart) {
        return false;
      }
    }
    return permissionParts.length === patternParts.length;
  };
}
