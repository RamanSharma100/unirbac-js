import { describe, it, expect } from 'vitest';

import { Permission } from '../src/permissions';

describe('Permission.match', () => {
  describe('exact match', () => {
    it('should match identical permissions', () => {
      expect(Permission.match('user:read', 'user:read')).toBe(true);
    });

    it('should not match different permissions', () => {
      expect(Permission.match('user:read', 'user:write')).toBe(false);
    });

    it('should not match permissions with different depth', () => {
      expect(Permission.match('user:read', 'user:read:all')).toBe(false);
    });
  });

  describe('single wildcard (*)', () => {
    it('should match any single segment', () => {
      expect(Permission.match('user:*', 'user:read')).toBe(true);
      expect(Permission.match('user:*', 'user:write')).toBe(true);
      expect(Permission.match('user:*', 'user:delete')).toBe(true);
    });

    it('should match wildcard in middle segment', () => {
      expect(Permission.match('user:*:view', 'user:profile:view')).toBe(true);
      expect(Permission.match('user:*:view', 'user:settings:view')).toBe(true);
    });

    it('should match wildcard at start', () => {
      expect(Permission.match('*:read', 'user:read')).toBe(true);
      expect(Permission.match('*:read', 'post:read')).toBe(true);
    });

    it('should not match if other segments differ', () => {
      expect(Permission.match('user:*', 'post:read')).toBe(false);
    });

    it('should not match more segments than pattern', () => {
      expect(Permission.match('user:*', 'user:read:all')).toBe(false);
    });
  });

  describe('double wildcard (**)', () => {
    it('should match any remaining segments', () => {
      expect(Permission.match('user:**', 'user:read')).toBe(true);
      expect(Permission.match('user:**', 'user:read:all')).toBe(true);
      expect(Permission.match('user:**', 'user:profile:settings:view')).toBe(true);
    });

    it('should match at any position', () => {
      expect(Permission.match('**', 'anything:at:all')).toBe(true);
    });

    it('should match combined with exact segments', () => {
      expect(Permission.match('admin:**', 'admin:users:delete')).toBe(true);
      expect(Permission.match('admin:**', 'admin')).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle empty permission parts', () => {
      expect(Permission.match('user:', 'user:')).toBe(true);
    });

    it('should handle single segment permissions', () => {
      expect(Permission.match('admin', 'admin')).toBe(true);
      expect(Permission.match('admin', 'user')).toBe(false);
    });

    it('should handle permission with many segments', () => {
      expect(
        Permission.match(
          'org:team:project:resource:action',
          'org:team:project:resource:action'
        )
      ).toBe(true);
    });

    it('should be case-sensitive', () => {
      expect(Permission.match('User:Read', 'user:read')).toBe(false);
    });
  });

  describe('dot notation', () => {
    it('should work with dot-separated permissions', () => {
      expect(Permission.match('user.read', 'user.read')).toBe(true);
    });
  });

  describe('pattern longer than permission', () => {
    it('should return false when pattern has more segments than permission', () => {
      expect(Permission.match('user:read:all', 'user:read')).toBe(false);
      expect(Permission.match('a:b:c:d', 'a:b')).toBe(false);
    });

    it('should return false when wildcard pattern is longer', () => {
      expect(Permission.match('user:*:details', 'user:profile')).toBe(false);
    });
  });
});
