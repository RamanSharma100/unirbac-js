import { describe, it, expect, beforeEach } from 'vitest';

import { RBACEngine } from '../src/engine/RBACEngine';
import { Role, Subject } from '../src/types';

describe('RBACEngine', () => {
  let engine: RBACEngine;

  beforeEach(() => {
    engine = new RBACEngine();
  });

  describe('addRole', () => {
    it('should add a role to the engine', async () => {
      const role: Role = {
        name: 'admin',
        level: 100,
        permissions: ['user:read', 'user:write', 'user:delete']
      };

      engine.addRole(role);

      // Verify by checking if a subject with this role can access permissions
      const subject: Subject = { id: '1', roles: ['admin'], permissions: [] };
      await expect(engine.can(subject, 'user:read')).resolves.toMatchObject({
        allowed: true
      });
    });
  });

  describe('can', () => {
    beforeEach(() => {
      engine.addRole({
        name: 'viewer',
        level: 10,
        permissions: ['post:read', 'comment:read']
      });

      engine.addRole({
        name: 'editor',
        level: 50,
        permissions: ['post:write', 'post:edit'],
        inherits: ['viewer']
      });

      engine.addRole({
        name: 'admin',
        level: 100,
        permissions: ['post:delete', 'user:manage'],
        inherits: ['editor']
      });
    });

    it('should allow access when subject has direct permission', async () => {
      const subject: Subject = { id: '1', roles: ['viewer'], permissions: [] };

      const result = await engine.can(subject, 'post:read');

      expect(result.allowed).toBe(true);
      expect(result.permission).toBe('post:read');
    });

    it('should deny access when subject lacks permission', async () => {
      const subject: Subject = { id: '1', roles: ['viewer'], permissions: [] };

      const result = await engine.can(subject, 'post:delete');

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Permission not found in subject roles/permissions');
    });

    it('should allow access via inherited role permissions', async () => {
      const subject: Subject = { id: '1', roles: ['editor'], permissions: [] };

      // editor inherits from viewer, so should have post:read
      const result = await engine.can(subject, 'post:read');

      expect(result.allowed).toBe(true);
    });

    it('should allow access via deep inheritance chain', async () => {
      const subject: Subject = { id: '1', roles: ['admin'], permissions: [] };

      // admin -> editor -> viewer, should have post:read
      const result = await engine.can(subject, 'post:read');

      expect(result.allowed).toBe(true);
    });

    it('should allow access from direct subject permissions', async () => {
      const subject: Subject = {
        id: '1',
        roles: [],
        permissions: ['special:action']
      };

      const result = await engine.can(subject, 'special:action');

      expect(result.allowed).toBe(true);
    });

    it('should handle subject with no roles and no permissions', async () => {
      const subject: Subject = { id: '1', roles: [], permissions: [] };

      const result = await engine.can(subject, 'any:permission');

      expect(result.allowed).toBe(false);
    });

    it('should handle non-existent role gracefully', async () => {
      const subject: Subject = { id: '1', roles: ['nonexistent'], permissions: [] };

      const result = await engine.can(subject, 'any:permission');

      expect(result.allowed).toBe(false);
    });
  });

  describe('circular inheritance', () => {
    it('should handle circular role inheritance without infinite loop', async () => {
      engine.addRole({
        name: 'roleA',
        level: 10,
        permissions: ['perm:a'],
        inherits: ['roleB']
      });

      engine.addRole({
        name: 'roleB',
        level: 10,
        permissions: ['perm:b'],
        inherits: ['roleA']
      });

      const subject: Subject = { id: '1', roles: ['roleA'], permissions: [] };

      // Should not hang and should resolve permissions from both roles
      const resultA = await engine.can(subject, 'perm:a');
      const resultB = await engine.can(subject, 'perm:b');

      expect(resultA.allowed).toBe(true);
      expect(resultB.allowed).toBe(true);
    });
  });

  describe('addPolicy', () => {
    beforeEach(() => {
      engine.addRole({
        name: 'user',
        level: 10,
        permissions: ['post:edit']
      });
    });

    it('should allow access when policy returns true', async () => {
      engine.addPolicy('post:edit', ({ subject, context }) => {
        return context.authorId === subject.id;
      });

      const subject: Subject = { id: 'user-1', roles: ['user'], permissions: [] };

      const result = await engine.can(subject, 'post:edit', { authorId: 'user-1' });

      expect(result.allowed).toBe(true);
    });

    it('should deny access when policy returns false', async () => {
      engine.addPolicy('post:edit', ({ subject, context }) => {
        return context.authorId === subject.id;
      });

      const subject: Subject = { id: 'user-1', roles: ['user'], permissions: [] };

      const result = await engine.can(subject, 'post:edit', { authorId: 'user-2' });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Access denied by policy');
    });

    it('should work with async policies', async () => {
      engine.addPolicy('post:edit', async ({ subject, context }) => {
        // Simulate async check
        await new Promise((resolve) => setTimeout(resolve, 10));
        return context.authorId === subject.id;
      });

      const subject: Subject = { id: 'user-1', roles: ['user'], permissions: [] };

      const result = await engine.can(subject, 'post:edit', { authorId: 'user-1' });

      expect(result.allowed).toBe(true);
    });

    it('should skip policy if permission not found', async () => {
      let policyCalled = false;

      engine.addPolicy('post:delete', () => {
        policyCalled = true;
        return true;
      });

      const subject: Subject = { id: 'user-1', roles: ['user'], permissions: [] };

      const result = await engine.can(subject, 'post:delete');

      expect(result.allowed).toBe(false);
      expect(policyCalled).toBe(false);
    });
  });
});
