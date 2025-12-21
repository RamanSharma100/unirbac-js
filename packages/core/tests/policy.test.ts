import { describe, it, expect, beforeEach } from 'vitest';

import { RBACEngine } from '../src/engine/RBACEngine';
import { Subject } from '../src/types';
import { PolicyFn } from '../src/policy';

describe('Policy-based access control', () => {
  let engine: RBACEngine;

  beforeEach(() => {
    engine = new RBACEngine();

    engine.addRole({
      name: 'author',
      level: 20,
      permissions: ['post:read', 'post:edit', 'post:delete']
    });

    engine.addRole({
      name: 'moderator',
      level: 50,
      permissions: ['post:read', 'post:edit', 'post:delete', 'post:moderate']
    });
  });

  describe('ownership policies', () => {
    it('should allow owner to edit their own post', async () => {
      const ownershipPolicy: PolicyFn = ({ subject, context }) => {
        return context.ownerId === subject.id;
      };

      engine.addPolicy('post:edit', ownershipPolicy);

      const author: Subject = { id: 'author-1', roles: ['author'], permissions: [] };

      const result = await engine.can(author, 'post:edit', { ownerId: 'author-1' });

      expect(result.allowed).toBe(true);
    });

    it('should deny non-owner from editing post', async () => {
      const ownershipPolicy: PolicyFn = ({ subject, context }) => {
        return context.ownerId === subject.id;
      };

      engine.addPolicy('post:edit', ownershipPolicy);

      const author: Subject = { id: 'author-1', roles: ['author'], permissions: [] };

      const result = await engine.can(author, 'post:edit', { ownerId: 'author-2' });

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Access denied by policy');
    });
  });

  describe('role-based policies', () => {
    it('should allow moderator to bypass ownership check', async () => {
      const moderatorOrOwnerPolicy: PolicyFn = ({ subject, context }) => {
        // Moderators can always edit, others need ownership
        if (subject.roles.includes('moderator')) {
          return true;
        }
        return context.ownerId === subject.id;
      };

      engine.addPolicy('post:edit', moderatorOrOwnerPolicy);

      const moderator: Subject = { id: 'mod-1', roles: ['moderator'], permissions: [] };

      const result = await engine.can(moderator, 'post:edit', {
        ownerId: 'someone-else'
      });

      expect(result.allowed).toBe(true);
    });
  });

  describe('context-based policies', () => {
    it('should allow access based on time window', async () => {
      const businessHoursPolicy: PolicyFn = ({ context }) => {
        const hour = context.currentHour as number;
        return hour >= 9 && hour <= 17;
      };

      engine.addPolicy('post:edit', businessHoursPolicy);

      const user: Subject = { id: 'user-1', roles: ['author'], permissions: [] };

      const duringBusinessHours = await engine.can(user, 'post:edit', {
        currentHour: 14
      });
      expect(duringBusinessHours.allowed).toBe(true);

      const afterHours = await engine.can(user, 'post:edit', { currentHour: 22 });
      expect(afterHours.allowed).toBe(false);
    });

    it('should allow access based on resource status', async () => {
      const draftOnlyPolicy: PolicyFn = ({ context }) => {
        return context.postStatus === 'draft';
      };

      engine.addPolicy('post:edit', draftOnlyPolicy);

      const user: Subject = { id: 'user-1', roles: ['author'], permissions: [] };

      const draftPost = await engine.can(user, 'post:edit', { postStatus: 'draft' });
      expect(draftPost.allowed).toBe(true);

      const publishedPost = await engine.can(user, 'post:edit', {
        postStatus: 'published'
      });
      expect(publishedPost.allowed).toBe(false);
    });
  });

  describe('async policies', () => {
    it('should handle async database lookups', async () => {
      const asyncOwnershipPolicy: PolicyFn = async ({ subject, context }) => {
        // Simulate database lookup
        await new Promise((resolve) => setTimeout(resolve, 5));

        const ownersFromDb = ['user-1', 'user-2', 'user-3'];
        return ownersFromDb.includes(subject.id) && context.postId !== undefined;
      };

      engine.addPolicy('post:delete', asyncOwnershipPolicy);

      const user: Subject = { id: 'user-1', roles: ['author'], permissions: [] };

      const result = await engine.can(user, 'post:delete', { postId: 'post-123' });

      expect(result.allowed).toBe(true);
    });

    it('should handle async policy that denies', async () => {
      const asyncDenyPolicy: PolicyFn = async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return false;
      };

      engine.addPolicy('post:edit', asyncDenyPolicy);

      const user: Subject = { id: 'user-1', roles: ['author'], permissions: [] };

      const result = await engine.can(user, 'post:edit', {});

      expect(result.allowed).toBe(false);
    });
  });

  describe('attribute-based policies', () => {
    it('should check subject attributes', async () => {
      const verifiedUserPolicy: PolicyFn = ({ subject }) => {
        return subject.attributes?.verified === true;
      };

      engine.addPolicy('post:edit', verifiedUserPolicy);

      const verifiedUser: Subject = {
        id: 'user-1',
        roles: ['author'],
        permissions: [],
        attributes: { verified: true }
      };

      const unverifiedUser: Subject = {
        id: 'user-2',
        roles: ['author'],
        permissions: [],
        attributes: { verified: false }
      };

      const verifiedResult = await engine.can(verifiedUser, 'post:edit', {});
      expect(verifiedResult.allowed).toBe(true);

      const unverifiedResult = await engine.can(unverifiedUser, 'post:edit', {});
      expect(unverifiedResult.allowed).toBe(false);
    });
  });
});
