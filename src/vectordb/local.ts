import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { VectorDBProvider } from './index.js';
import { MemoryPayload, ProfilePayload } from './types.js';

interface StoredMemory {
  id: string;
  vector: number[];
  payload: MemoryPayload;
}

interface StoredProfile {
  id: string;
  vector: number[];
  payload: ProfilePayload;
}

interface LocalStore {
  memories: StoredMemory[];
  profiles: StoredProfile[];
}

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

function matchesFilter(payload: MemoryPayload, filter?: Record<string, unknown>): boolean {
  if (!filter) return true;

  const must = filter.must as Array<{ key: string; match: { value?: string; any?: string[] } }> | undefined;
  if (!must) return true;

  for (const condition of must) {
    const fieldValue = payload[condition.key as keyof MemoryPayload];

    if (condition.match.value !== undefined) {
      if (fieldValue !== condition.match.value) return false;
    }

    if (condition.match.any !== undefined) {
      if (!Array.isArray(fieldValue)) return false;
      const hasOverlap = condition.match.any.some(v => (fieldValue as string[]).includes(v));
      if (!hasOverlap) return false;
    }
  }

  return true;
}

export class LocalVectorDBProvider implements VectorDBProvider {
  name = 'local';
  private dataDir: string;
  private filePath: string;
  private store: LocalStore = { memories: [], profiles: [] };
  private dimensions: number;
  private dirty = false;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: { url: string; collection: string; apiKey?: string }, dimensions = 384) {
    this.dataDir = config.url || join(homedir(), '.memory-mcp');
    this.filePath = join(this.dataDir, `${config.collection}.json`);
    this.dimensions = dimensions;
  }

  async init(): Promise<void> {
    await fs.mkdir(this.dataDir, { recursive: true });

    try {
      const raw = await fs.readFile(this.filePath, 'utf-8');
      this.store = JSON.parse(raw);
    } catch {
      this.store = { memories: [], profiles: [] };
    }

    console.error(`Local vector store: ${this.filePath} (${this.store.memories.length} memories, ${this.store.profiles.length} profiles)`);
  }

  private async save(): Promise<void> {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    this.dirty = true;

    this.saveTimer = setTimeout(async () => {
      if (!this.dirty) return;
      await fs.writeFile(this.filePath, JSON.stringify(this.store), 'utf-8');
      this.dirty = false;
    }, 100);
  }

  private async flushSave(): Promise<void> {
    if (this.saveTimer) clearTimeout(this.saveTimer);
    if (this.dirty) {
      await fs.writeFile(this.filePath, JSON.stringify(this.store), 'utf-8');
      this.dirty = false;
    }
  }

  async upsertMemory(vector: number[], payload: MemoryPayload): Promise<void> {
    const idx = this.store.memories.findIndex(m => m.id === payload.id);
    if (idx >= 0) {
      this.store.memories[idx] = { id: payload.id, vector, payload };
    } else {
      this.store.memories.push({ id: payload.id, vector, payload });
    }
    await this.save();
  }

  async searchMemories(
    vector: number[],
    limit: number,
    filter?: Record<string, unknown>,
    scoreThreshold?: number
  ): Promise<Array<{ id: string; score: number; payload: MemoryPayload }>> {
    const scored = this.store.memories
      .filter(m => matchesFilter(m.payload, filter))
      .map(m => ({
        id: m.id,
        score: dotProduct(vector, m.vector),
        payload: m.payload,
      }))
      .filter(r => scoreThreshold === undefined || r.score >= scoreThreshold)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return scored;
  }

  async scrollMemories(
    limit: number,
    offset: number,
    filter?: Record<string, unknown>
  ): Promise<Array<{ id: string; payload: MemoryPayload }>> {
    const filtered = this.store.memories
      .filter(m => !filter || matchesFilter(m.payload, filter))
      .sort((a, b) => new Date(b.payload.timestamp).getTime() - new Date(a.payload.timestamp).getTime());

    return filtered.slice(offset, offset + limit).map(m => ({ id: m.id, payload: m.payload }));
  }

  async deleteMemory(id: string): Promise<void> {
    this.store.memories = this.store.memories.filter(m => m.id !== id);
    await this.save();
  }

  async getMemoryById(id: string): Promise<{ id: string; vector: number[]; payload: MemoryPayload } | null> {
    return this.store.memories.find(m => m.id === id) || null;
  }

  async upsertProfile(id: string, payload: ProfilePayload): Promise<void> {
    const vector = new Array(this.dimensions).fill(0);
    vector[0] = 1;

    const existing = this.store.profiles.findIndex(p => p.payload.key === payload.key);
    if (existing >= 0) {
      this.store.profiles[existing] = { id, vector, payload };
    } else {
      this.store.profiles.push({ id, vector, payload });
    }
    await this.save();
  }

  async getProfile(key: string): Promise<{ id: string; payload: ProfilePayload } | null> {
    const found = this.store.profiles.find(p => p.payload.key === key);
    return found ? { id: found.id, payload: found.payload } : null;
  }

  async listProfiles(): Promise<ProfilePayload[]> {
    return this.store.profiles.map(p => p.payload);
  }

  async linkMemories(id1: string, id2: string): Promise<void> {
    const mem1 = await this.getMemoryById(id1);
    const mem2 = await this.getMemoryById(id2);

    if (!mem1) throw new Error(`Memory not found: ${id1}`);
    if (!mem2) throw new Error(`Memory not found: ${id2}`);

    const p1 = mem1.payload;
    const p2 = mem2.payload;

    p1.linked_ids = p1.linked_ids || [];
    if (!p1.linked_ids.includes(id2)) p1.linked_ids.push(id2);

    p2.linked_ids = p2.linked_ids || [];
    if (!p2.linked_ids.includes(id1)) p2.linked_ids.push(id1);

    await this.upsertMemory(mem1.vector, p1);
    await this.upsertMemory(mem2.vector, p2);
  }
}
