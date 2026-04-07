import { describe, it, expect } from 'vitest';
import { autoImportance } from '../importance.js';

describe('autoImportance', () => {
  describe('base score', () => {
    it('returns 0.5 for minimal content with no bonuses', () => {
      expect(autoImportance('hello', 'knowledge')).toBe(0.5);
    });
  });

  describe('content length bonuses', () => {
    it('adds +0.1 for content >500 chars', () => {
      const content = 'a'.repeat(501);
      expect(autoImportance(content, 'knowledge')).toBe(0.6);
    });
    it('does not add bonus for exactly 500 chars', () => {
      const content = 'a'.repeat(500);
      expect(autoImportance(content, 'knowledge')).toBe(0.5);
    });
    it('adds +0.2 total for content >1000 chars', () => {
      const content = 'a'.repeat(1001);
      expect(autoImportance(content, 'knowledge')).toBe(0.7);
    });
    it('does not add second bonus for exactly 1000 chars', () => {
      const content = 'a'.repeat(1000);
      // >500 but not >1000
      expect(autoImportance(content, 'knowledge')).toBe(0.6);
    });
  });

  describe('code block detection', () => {
    it('adds +0.15 for triple backticks', () => {
      const content = '```\nconst x = 1;\n```';
      expect(autoImportance(content, 'knowledge')).toBe(0.65);
    });
    it('no bonus without triple backticks', () => {
      const content = 'inline `code` here';
      expect(autoImportance(content, 'knowledge')).toBe(0.5);
    });
  });

  describe('URL detection', () => {
    it('adds +0.05 for https URL', () => {
      expect(autoImportance('see https://example.com', 'knowledge')).toBe(0.55);
    });
    it('adds +0.05 for http URL', () => {
      expect(autoImportance('see http://example.com', 'knowledge')).toBe(0.55);
    });
    it('no bonus without URL', () => {
      expect(autoImportance('no links here', 'knowledge')).toBe(0.5);
    });
  });

  describe('keyword bonuses: important/critical/must/never/always', () => {
    it('adds +0.15 for "important"', () => {
      expect(autoImportance('This is important', 'knowledge')).toBe(0.65);
    });
    it('adds +0.15 for "critical"', () => {
      expect(autoImportance('This is critical', 'knowledge')).toBe(0.65);
    });
    it('adds +0.15 for "must"', () => {
      expect(autoImportance('You must do this', 'knowledge')).toBe(0.65);
    });
    it('adds +0.15 for "never"', () => {
      expect(autoImportance('Never use eval', 'knowledge')).toBe(0.65);
    });
    it('adds +0.15 for "always"', () => {
      expect(autoImportance('Always validate input', 'knowledge')).toBe(0.65);
    });
    it('is case-insensitive', () => {
      expect(autoImportance('This is CRITICAL', 'knowledge')).toBe(0.65);
    });
  });

  describe('keyword bonuses: security/auth/password/secret/key', () => {
    it('adds +0.1 for "security"', () => {
      expect(autoImportance('Check security headers', 'knowledge')).toBe(0.6);
    });
    it('adds +0.1 for "auth"', () => {
      expect(autoImportance('Setup auth middleware', 'knowledge')).toBe(0.6);
    });
    it('adds +0.1 for "password"', () => {
      expect(autoImportance('Hash the password properly', 'knowledge')).toBe(0.6);
    });
    it('adds +0.1 for "secret"', () => {
      expect(autoImportance('Store the secret in vault', 'knowledge')).toBe(0.6);
    });
    it('adds +0.1 for "key"', () => {
      expect(autoImportance('Rotate the API key regularly', 'knowledge')).toBe(0.6);
    });
  });

  describe('keyword bonuses: architecture/design/system', () => {
    it('adds +0.1 for "architecture"', () => {
      expect(autoImportance('The architecture uses event sourcing', 'knowledge')).toBe(0.6);
    });
    it('adds +0.1 for "design"', () => {
      expect(autoImportance('The design follows clean architecture', 'knowledge')).toBe(0.6);
    });
    it('adds +0.1 for "system"', () => {
      expect(autoImportance('The system handles 10k requests', 'knowledge')).toBe(0.6);
    });
  });

  describe('type bonuses', () => {
    it('adds +0.1 for type "decision"', () => {
      expect(autoImportance('something', 'decision')).toBe(0.6);
    });
    it('adds +0.05 for type "debug"', () => {
      expect(autoImportance('something', 'debug')).toBe(0.55);
    });
    it('no type bonus for "knowledge"', () => {
      expect(autoImportance('something', 'knowledge')).toBe(0.5);
    });
    it('no type bonus for "pattern"', () => {
      expect(autoImportance('something', 'pattern')).toBe(0.5);
    });
  });

  describe('clamping to [0, 1]', () => {
    it('clamps to 1.0 when all bonuses stack', () => {
      // base 0.5 + length>500 0.1 + length>1000 0.1 + code 0.15 + url 0.05
      // + critical 0.15 + security 0.1 + architecture 0.1 + decision 0.1 = 1.35 -> clamped to 1.0
      const content = 'a'.repeat(1001) +
        ' ```code``` https://example.com This is critical security architecture';
      expect(autoImportance(content, 'decision')).toBe(1.0);
    });
    it('never returns below 0', () => {
      // base is 0.5 minimum with no negative modifiers, so score is always >= 0.5
      // but the Math.max(0, ...) guard is tested conceptually
      expect(autoImportance('', 'knowledge')).toBeGreaterThanOrEqual(0);
    });
    it('never returns above 1', () => {
      const content = 'a'.repeat(1001) +
        ' ```code``` https://example.com critical security architecture important';
      expect(autoImportance(content, 'decision')).toBeLessThanOrEqual(1);
    });
  });

  describe('combination of multiple bonuses', () => {
    it('stacks code block + URL bonuses', () => {
      const content = '```js\nfetch("https://api.example.com")\n```';
      // base 0.5 + code 0.15 + url 0.05 = 0.7
      expect(autoImportance(content, 'knowledge')).toBeCloseTo(0.7);
    });
    it('stacks keyword + type bonuses', () => {
      // base 0.5 + critical 0.15 + decision type 0.1 = 0.75
      expect(autoImportance('This is critical for the project', 'decision')).toBeCloseTo(0.75);
    });
    it('stacks all keyword groups', () => {
      // base 0.5 + important 0.15 + security 0.1 + architecture 0.1 = 0.85
      const content = 'Important security architecture note';
      expect(autoImportance(content, 'knowledge')).toBeCloseTo(0.85);
    });
    it('stacks length + keywords + type', () => {
      // base 0.5 + >500 0.1 + critical 0.15 + debug type 0.05 = 0.8
      const content = 'a'.repeat(501) + ' critical';
      expect(autoImportance(content, 'debug')).toBeCloseTo(0.8);
    });
  });
});
