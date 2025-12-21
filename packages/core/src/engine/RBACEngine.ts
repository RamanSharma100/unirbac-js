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
    const permissions: Set<PermissionName> = this.getPermissions(subject);

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

  private getPermissions = (subject: Subject): Set<PermissionName> => {
    const prms = new Set<PermissionName>(subject.permissions);

    const visitedRoles = new Set<string>();
    const visited = (roleName: string) => {
      if (visitedRoles.has(roleName)) return;

      visitedRoles.add(roleName);

      const role = this.roles.get(roleName);

      if (role) {
        role.permissions.forEach((perm: PermissionName) => prms.add(perm));

        role.inherits?.forEach((parentRoleName: string) => {
          visited(parentRoleName);
        });
      }

      return;
    };

    subject.roles.forEach((roleName: string) => visited(roleName));

    return prms;
  };
}
