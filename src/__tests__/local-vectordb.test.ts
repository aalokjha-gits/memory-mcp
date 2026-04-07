import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { LocalVectorDBProvider } from '../vectordb/local.js';
import { MemoryPayload } from '../vectordb/types.js';

let tempDir: string;
let provider: LocalVectorDBProvider;

function makePayload(overrides: Partial<MemoryPayload> & { id: string }): MemoryPayload {
  return {
    content: 'test content',
    type: 'knowledge',
    importance: 0.5,
    timestamp: new Date().toISOString(),
    ...overrides,
  };
}

function makeVector(values: number[]): number[] {
  return values;
}

beforeEach(async () => {
  tempDir = join(tmpdir(), `memory-mcp-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  provider = new LocalVectorDBProvider({ url: tempDir, collection: 'test', apiKey: undefined }, 3);
  await provider.init();
});

afterEach(async () => {
  await new Promise(r => setTimeout(r, 150));
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe('LocalVectorDBProvider', () => {
  describe('init', () => {
    it('creates data directory', async () => {
      const stat = await fs.stat(tempDir);
      expect(stat.isDirectory()).toBe(true);
    });

    it('loads empty store on first init', async () => {
      const results = await provider.scrollMemories(10, 0);
      expect(results).toEqual([]);
    });

    it('loads existing data from file', async () => {
      const payload = makePayload({ id: 'persist-1' });
      await provider.upsertMemory([1, 0, 0], payload);

      await new Promise(r => setTimeout(r, 200));

      const provider2 = new LocalVectorDBProvider({ url: tempDir, collection: 'test' }, 3);
      await provider2.init();

      const result = await provider2.getMemoryById('persist-1');
      expect(result).not.toBeNull();
      expect(result!.payload.id).toBe('persist-1');
    });
  });

  describe('name', () => {
    it('is "local"', () => {
      expect(provider.name).toBe('local');
    });
  });

  describe('upsertMemory', () => {
    it('stores a memory', async () => {
      const payload = makePayload({ id: 'mem-1' });
      await provider.upsertMemory([1, 0, 0], payload);

      const result = await provider.getMemoryById('mem-1');
      expect(result).not.toBeNull();
      expect(result!.payload).toEqual(payload);
    });

    it('updates an existing memory with the same id', async () => {
      const payload1 = makePayload({ id: 'mem-1', content: 'original' });
      await provider.upsertMemory([1, 0, 0], payload1);

      const payload2 = makePayload({ id: 'mem-1', content: 'updated' });
      await provider.upsertMemory([0, 1, 0], payload2);

      const result = await provider.getMemoryById('mem-1');
      expect(result!.payload.content).toBe('updated');
      expect(result!.vector).toEqual([0, 1, 0]);

      const all = await provider.scrollMemories(100, 0);
      expect(all).toHaveLength(1);
    });
  });

  describe('searchMemories', () => {
    it('returns results sorted by cosine similarity (dot product)', async () => {
      await provider.upsertMemory([1, 0, 0], makePayload({ id: 'x-axis' }));
      await provider.upsertMemory([0, 1, 0], makePayload({ id: 'y-axis' }));
      await provider.upsertMemory([0, 0, 1], makePayload({ id: 'z-axis' }));

      const results = await provider.searchMemories([1, 0, 0], 3);
      expect(results[0].id).toBe('x-axis');
      expect(results[0].score).toBeCloseTo(1);
      expect(results[1].score).toBeCloseTo(0);
    });

    it('respects limit', async () => {
      await provider.upsertMemory([1, 0, 0], makePayload({ id: 'a' }));
      await provider.upsertMemory([0.9, 0.1, 0], makePayload({ id: 'b' }));
      await provider.upsertMemory([0.8, 0.2, 0], makePayload({ id: 'c' }));

      const results = await provider.searchMemories([1, 0, 0], 2);
      expect(results).toHaveLength(2);
    });

    it('filters by type', async () => {
      await provider.upsertMemory([1, 0, 0], makePayload({ id: 'a', type: 'knowledge' }));
      await provider.upsertMemory([0.9, 0.1, 0], makePayload({ id: 'b', type: 'decision' }));

      const filter = { must: [{ key: 'type', match: { value: 'decision' } }] };
      const results = await provider.searchMemories([1, 0, 0], 10, filter);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('b');
    });

    it('filters by tags (any match)', async () => {
      await provider.upsertMemory([1, 0, 0], makePayload({ id: 'a', tags: ['rust', 'go'] }));
      await provider.upsertMemory([0.9, 0.1, 0], makePayload({ id: 'b', tags: ['python'] }));
      await provider.upsertMemory([0.8, 0.2, 0], makePayload({ id: 'c', tags: ['go', 'java'] }));

      const filter = { must: [{ key: 'tags', match: { any: ['rust', 'java'] } }] };
      const results = await provider.searchMemories([1, 0, 0], 10, filter);
      expect(results).toHaveLength(2);
      const ids = results.map(r => r.id);
      expect(ids).toContain('a');
      expect(ids).toContain('c');
    });

    it('filters by project', async () => {
      await provider.upsertMemory([1, 0, 0], makePayload({ id: 'a', project: 'alpha' }));
      await provider.upsertMemory([0.9, 0.1, 0], makePayload({ id: 'b', project: 'beta' }));

      const filter = { must: [{ key: 'project', match: { value: 'alpha' } }] };
      const results = await provider.searchMemories([1, 0, 0], 10, filter);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('a');
    });

    it('applies scoreThreshold', async () => {
      await provider.upsertMemory([1, 0, 0], makePayload({ id: 'high' }));
      await provider.upsertMemory([0, 1, 0], makePayload({ id: 'low' }));

      const results = await provider.searchMemories([1, 0, 0], 10, undefined, 0.5);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('high');
    });

    it('returns empty array when no memories match', async () => {
      const results = await provider.searchMemories([1, 0, 0], 10);
      expect(results).toEqual([]);
    });

    it('combines filter and scoreThreshold', async () => {
      await provider.upsertMemory([1, 0, 0], makePayload({ id: 'a', type: 'decision' }));
      await provider.upsertMemory([0, 1, 0], makePayload({ id: 'b', type: 'decision' }));
      await provider.upsertMemory([0.9, 0.1, 0], makePayload({ id: 'c', type: 'knowledge' }));

      const filter = { must: [{ key: 'type', match: { value: 'decision' } }] };
      const results = await provider.searchMemories([1, 0, 0], 10, filter, 0.5);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('a');
    });
  });

  describe('scrollMemories', () => {
    it('returns memories with offset and limit', async () => {
      for (let i = 0; i < 5; i++) {
        await provider.upsertMemory([1, 0, 0], makePayload({
          id: `m-${i}`,
          timestamp: new Date(2024, 0, i + 1).toISOString(),
        }));
      }

      const page = await provider.scrollMemories(2, 1);
      expect(page).toHaveLength(2);
    });

    it('sorts by timestamp descending', async () => {
      const t1 = new Date(2024, 0, 1).toISOString();
      const t2 = new Date(2024, 0, 15).toISOString();
      const t3 = new Date(2024, 0, 30).toISOString();

      await provider.upsertMemory([1, 0, 0], makePayload({ id: 'old', timestamp: t1 }));
      await provider.upsertMemory([0, 1, 0], makePayload({ id: 'mid', timestamp: t2 }));
      await provider.upsertMemory([0, 0, 1], makePayload({ id: 'new', timestamp: t3 }));

      const results = await provider.scrollMemories(10, 0);
      expect(results[0].id).toBe('new');
      expect(results[1].id).toBe('mid');
      expect(results[2].id).toBe('old');
    });

    it('applies filter', async () => {
      await provider.upsertMemory([1, 0, 0], makePayload({ id: 'a', type: 'debug' }));
      await provider.upsertMemory([0, 1, 0], makePayload({ id: 'b', type: 'knowledge' }));

      const filter = { must: [{ key: 'type', match: { value: 'debug' } }] };
      const results = await provider.scrollMemories(10, 0, filter);
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('a');
    });

    it('returns empty when offset exceeds total', async () => {
      await provider.upsertMemory([1, 0, 0], makePayload({ id: 'a' }));
      const results = await provider.scrollMemories(10, 100);
      expect(results).toEqual([]);
    });
  });

  describe('deleteMemory', () => {
    it('removes a memory', async () => {
      await provider.upsertMemory([1, 0, 0], makePayload({ id: 'del-me' }));
      expect(await provider.getMemoryById('del-me')).not.toBeNull();

      await provider.deleteMemory('del-me');
      expect(await provider.getMemoryById('del-me')).toBeNull();
    });

    it('does not throw for non-existent id', async () => {
      await expect(provider.deleteMemory('nope')).resolves.toBeUndefined();
    });
  });

  describe('getMemoryById', () => {
    it('returns the memory with vector and payload', async () => {
      const payload = makePayload({ id: 'find-me', content: 'hello' });
      await provider.upsertMemory([0.1, 0.2, 0.3], payload);

      const result = await provider.getMemoryById('find-me');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('find-me');
      expect(result!.vector).toEqual([0.1, 0.2, 0.3]);
      expect(result!.payload.content).toBe('hello');
    });

    it('returns null for non-existent id', async () => {
      const result = await provider.getMemoryById('missing');
      expect(result).toBeNull();
    });
  });

  describe('upsertProfile', () => {
    it('stores a profile', async () => {
      const ts = new Date().toISOString();
      await provider.upsertProfile('prof-1', { key: 'theme', value: 'dark', timestamp: ts });

      const result = await provider.getProfile('theme');
      expect(result).not.toBeNull();
      expect(result!.payload.key).toBe('theme');
      expect(result!.payload.value).toBe('dark');
    });

    it('updates an existing profile by key', async () => {
      const ts = new Date().toISOString();
      await provider.upsertProfile('p1', { key: 'lang', value: 'en', timestamp: ts });
      await provider.upsertProfile('p2', { key: 'lang', value: 'fr', timestamp: ts });

      const result = await provider.getProfile('lang');
      expect(result!.payload.value).toBe('fr');
      expect(result!.id).toBe('p2');

      const all = await provider.listProfiles();
      expect(all.filter(p => p.key === 'lang')).toHaveLength(1);
    });
  });

  describe('getProfile', () => {
    it('returns null for non-existent key', async () => {
      const result = await provider.getProfile('nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('listProfiles', () => {
    it('returns all profile payloads', async () => {
      const ts = new Date().toISOString();
      await provider.upsertProfile('p1', { key: 'a', value: '1', timestamp: ts });
      await provider.upsertProfile('p2', { key: 'b', value: '2', timestamp: ts });

      const profiles = await provider.listProfiles();
      expect(profiles).toHaveLength(2);
      const keys = profiles.map(p => p.key);
      expect(keys).toContain('a');
      expect(keys).toContain('b');
    });

    it('returns empty array when no profiles exist', async () => {
      const profiles = await provider.listProfiles();
      expect(profiles).toEqual([]);
    });
  });

  describe('linkMemories', () => {
    it('creates bidirectional links', async () => {
      await provider.upsertMemory([1, 0, 0], makePayload({ id: 'link-a' }));
      await provider.upsertMemory([0, 1, 0], makePayload({ id: 'link-b' }));

      await provider.linkMemories('link-a', 'link-b');

      const a = await provider.getMemoryById('link-a');
      const b = await provider.getMemoryById('link-b');
      expect(a!.payload.linked_ids).toContain('link-b');
      expect(b!.payload.linked_ids).toContain('link-a');
    });

    it('does not duplicate links on repeated calls', async () => {
      await provider.upsertMemory([1, 0, 0], makePayload({ id: 'dup-a' }));
      await provider.upsertMemory([0, 1, 0], makePayload({ id: 'dup-b' }));

      await provider.linkMemories('dup-a', 'dup-b');
      await provider.linkMemories('dup-a', 'dup-b');

      const a = await provider.getMemoryById('dup-a');
      const linkCount = a!.payload.linked_ids!.filter(id => id === 'dup-b').length;
      expect(linkCount).toBe(1);
    });

    it('throws for non-existent first memory', async () => {
      await provider.upsertMemory([0, 1, 0], makePayload({ id: 'exists' }));
      await expect(provider.linkMemories('ghost', 'exists')).rejects.toThrow('Memory not found: ghost');
    });

    it('throws for non-existent second memory', async () => {
      await provider.upsertMemory([1, 0, 0], makePayload({ id: 'exists' }));
      await expect(provider.linkMemories('exists', 'ghost')).rejects.toThrow('Memory not found: ghost');
    });
  });

  describe('persistence', () => {
    it('data persists across provider instances', async () => {
      const payload = makePayload({ id: 'persist-check', content: 'saved data' });
      await provider.upsertMemory([0.5, 0.5, 0], payload);

      const ts = new Date().toISOString();
      await provider.upsertProfile('pp1', { key: 'saved-key', value: 'saved-val', timestamp: ts });

      await new Promise(r => setTimeout(r, 200));

      const provider2 = new LocalVectorDBProvider({ url: tempDir, collection: 'test' }, 3);
      await provider2.init();

      const mem = await provider2.getMemoryById('persist-check');
      expect(mem).not.toBeNull();
      expect(mem!.payload.content).toBe('saved data');

      const prof = await provider2.getProfile('saved-key');
      expect(prof).not.toBeNull();
      expect(prof!.payload.value).toBe('saved-val');
    });
  });
});
