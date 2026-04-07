import { describe, it, expect } from 'vitest';
import { autoCategory } from '../categorize.js';

describe('autoCategory', () => {
  describe('decision detection', () => {
    it('detects "decided"', () => {
      expect(autoCategory('We decided to use PostgreSQL')).toBe('decision');
    });
    it('detects "chose"', () => {
      expect(autoCategory('We chose React over Vue')).toBe('decision');
    });
    it('detects "will use"', () => {
      expect(autoCategory('We will use Docker for deployment')).toBe('decision');
    });
    it('detects "going with"', () => {
      expect(autoCategory('Going with the monorepo approach')).toBe('decision');
    });
    it('detects "picked"', () => {
      expect(autoCategory('Picked Tailwind for styling')).toBe('decision');
    });
  });

  describe('pattern detection', () => {
    it('detects "pattern"', () => {
      expect(autoCategory('The repository pattern works well here')).toBe('pattern');
    });
    it('detects "always"', () => {
      expect(autoCategory('Always validate input at the boundary')).toBe('pattern');
    });
    it('detects "convention"', () => {
      expect(autoCategory('Our convention is kebab-case filenames')).toBe('pattern');
    });
    it('detects "standard"', () => {
      expect(autoCategory('This is the standard way to handle auth')).toBe('pattern');
    });
    it('detects "best practice"', () => {
      expect(autoCategory('It is a best practice to use parameterized queries')).toBe('pattern');
    });
  });

  describe('preference detection', () => {
    it('detects "prefer"', () => {
      expect(autoCategory('I prefer functional components')).toBe('preference');
    });
    it('detects "like"', () => {
      expect(autoCategory('I like using Vim for editing')).toBe('preference');
    });
    it('detects "dislike"', () => {
      expect(autoCategory('I dislike verbose configuration')).toBe('preference');
    });
    it('detects "want"', () => {
      expect(autoCategory('I want dark mode support')).toBe('preference');
    });
    it('detects "hate"', () => {
      expect(autoCategory('I hate XML configs')).toBe('preference');
    });
    it('detects "favorite"', () => {
      expect(autoCategory('My favorite editor is Neovim')).toBe('preference');
    });
  });

  describe('debug detection', () => {
    it('detects "error"', () => {
      expect(autoCategory('Got an error when running migrations')).toBe('debug');
    });
    it('detects "bug"', () => {
      expect(autoCategory('Found a bug in the parser')).toBe('debug');
    });
    it('detects "fix"', () => {
      expect(autoCategory('Need to fix the login flow')).toBe('debug');
    });
    it('detects "crash"', () => {
      expect(autoCategory('The app crash on startup')).toBe('debug');
    });
    it('detects "issue"', () => {
      expect(autoCategory('There is an issue with timeouts')).toBe('debug');
    });
    it('detects "debug"', () => {
      expect(autoCategory('Need to debug the websocket handler')).toBe('debug');
    });
    it('detects "stack trace"', () => {
      expect(autoCategory('Here is the stack trace from production')).toBe('debug');
    });
  });

  describe('context detection', () => {
    it('detects "context"', () => {
      expect(autoCategory('For context, this service handles payments')).toBe('context');
    });
    it('detects "working on"', () => {
      expect(autoCategory('Currently working on the API layer')).toBe('context');
    });
    it('detects "currently"', () => {
      expect(autoCategory('We are currently refactoring auth')).toBe('context');
    });
    it('detects "project"', () => {
      expect(autoCategory('The project uses a microservices architecture')).toBe('context');
    });
    it('detects "sprint"', () => {
      expect(autoCategory('This sprint we focus on performance')).toBe('context');
    });
  });

  describe('knowledge (default)', () => {
    it('returns knowledge for generic content', () => {
      expect(autoCategory('TypeScript compiles to JavaScript')).toBe('knowledge');
    });
    it('returns knowledge for content with no matching keywords', () => {
      expect(autoCategory('The function returns an array of numbers')).toBe('knowledge');
    });
  });

  describe('case insensitivity', () => {
    it('matches uppercase keywords', () => {
      expect(autoCategory('DECIDED to use Go')).toBe('decision');
    });
    it('matches mixed case keywords', () => {
      expect(autoCategory('Found a BUG in the parser')).toBe('debug');
    });
    it('matches title case keywords', () => {
      expect(autoCategory('Currently Working On the frontend')).toBe('context');
    });
  });

  describe('edge cases', () => {
    it('returns knowledge for empty string', () => {
      expect(autoCategory('')).toBe('knowledge');
    });
    it('first matching category wins when multiple keywords present', () => {
      // "decided" (decision) comes before "error" (debug) in check order
      expect(autoCategory('We decided to fix the error')).toBe('decision');
    });
    it('pattern wins over preference when both match', () => {
      // "always" (pattern) is checked before "prefer" (preference)
      expect(autoCategory('I always prefer typed languages')).toBe('pattern');
    });
    it('preference wins over debug when both match', () => {
      // "prefer" (preference) is checked before "error" (debug)
      expect(autoCategory('I prefer to handle errors explicitly')).toBe('preference');
    });
  });
});
