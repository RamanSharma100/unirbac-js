import { PermissionName, Role, Subject } from '../types';
import { PolicyFn, AuthorizationContext } from '../policy';
import { Permission } from '../permissions';

export type Authorization = {
  allowed: boolean;
  reason?: string;
  permission: string;
};

export class RBACEngine {
  private roles = new Map<string, Role>();
  private policies = new Map<string, PolicyFn>();

  addRole = (role: Role): void => {
    this.roles.set(role.name, role);
  };

  addPolicy = (permission: string, policyCallback: PolicyFn): void => {
    this.policies.set(permission, policyCallback);
  };

  can = async (
    subject: Subject,
    permission: string,
    context: AuthorizationContext = {}
  ): Promise<Authorization> => {
    const permissions: Set<PermissionName> = this.resolvePermissions(subject);

    const matchedPermission = [...permissions].some((perm) =>
      Permission.match(perm, permission)
    );

    if (!matchedPermission) {
      return {
        allowed: false,
        reason: 'Permission not found in subject roles/permissions',
        permission
      };
    }

    const policy = this.policies.get(permission);

    if (policy) {
      if (await policy({ subject, context })) {
        return {
          allowed: true,
          permission
        };
      }

      return {
        allowed: false,
        reason: 'Access denied by policy',
        permission
      };
    }

    return {
      allowed: true,
      permission
    };
  };

  private resolvePermissions = (subject: Subject): Set<PermissionName> => {
    const prms = new Set<PermissionName>(subject.permissions);

    const resolvedRoles = this.resolveRoles(subject.roles);

    for (const role of resolvedRoles) {
      role.permissions.forEach((p) => prms.add(p));
    }

    subject.permissions?.forEach((p: string) => prms.add(p));

    return prms;
  };

  private resolveRoles(roleNames: string[]): Role[] {
    const visited = new Set<string>();
    const roles: Role[] = [];

    const visit = (name: string) => {
      if (visited.has(name)) return;
      visited.add(name);

      const role = this.roles.get(name);
      if (!role) return;

      role.inherits?.forEach(visit);
      roles.push(role);
    };

    roleNames.forEach(visit);

    return roles.sort((a, b) => b.level - a.level);
  }
}
