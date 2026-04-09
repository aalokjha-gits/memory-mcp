import { Config } from '../config.js';
import { VectorDBProvider } from './index.js';
import { MemoryPayload, ProfilePayload } from './types.js';

async function fetchWithRetry(url: string, options?: RequestInit): Promise<Response | null> {
  let response = await fetch(url, options).catch(() => null);
  if (!response || !response.ok) {
    response = await fetch(url, options);
  }
  return response;
}

export class QdrantProvider implements VectorDBProvider {
  name = 'qdrant';
  private url: string;
  private collection: string;
  private dimensions: number;
  private embeddingConfig: Config['embedding'];

  constructor(vectordbConfig: Config['vectordb'], embeddingConfig?: Config['embedding']) {
    this.url = vectordbConfig.url;
    this.collection = vectordbConfig.collection;
    this.dimensions = embeddingConfig?.dimensions || 384;
    this.embeddingConfig = embeddingConfig || { provider: 'local', url: '', model: '', dimensions: 384, maxTokens: 512 };
  }

  async init(): Promise<void> {
    await this.createCollection('memories');
    await this.createCollection('profiles');
  }

  private async createCollection(name: string): Promise<void> {
    const url = `${this.url}/collections/${name}`;
    const response = await fetch(url).catch(() => null);

    if (response && response.ok) {
      console.error(`Collection '${name}' already exists`);
      return;
    }

    const createResponse = await fetchWithRetry(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vectors: { size: this.dimensions, distance: 'Cosine' }
      }),
    });

    if (!createResponse || !createResponse.ok) {
      throw new Error(`Failed to create collection '${name}': ${createResponse?.statusText}`);
    }
    console.error(`Collection '${name}' created`);
  }

  async upsertMemory(vector: number[], payload: MemoryPayload): Promise<void> {
    const url = `${this.url}/collections/memories/points`;
    const response = await fetchWithRetry(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: [{ id: payload.id, vector, payload }]
      }),
    });
    if (!response || !response.ok) {
      throw new Error(`Failed to upsert memory: ${response?.statusText}`);
    }
  }

  async searchMemories(
    vector: number[],
    limit: number,
    filter?: Record<string, unknown>,
    scoreThreshold?: number
  ): Promise<Array<{ id: string; score: number; payload: MemoryPayload }>> {
    const url = `${this.url}/collections/memories/points/search`;
    const body: Record<string, unknown> = { vector, limit, with_payload: true };
    if (filter && Object.keys(filter).length > 0) body.filter = filter;
    if (scoreThreshold !== undefined) body.score_threshold = scoreThreshold;

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response || !response.ok) {
      throw new Error(`Failed to search memories: ${response?.statusText}`);
    }
    const data = (await response.json()) as {
      result: Array<{ id: string; score: number; payload: MemoryPayload }>;
    };
    return data.result || [];
  }

  async scrollMemories(
    limit: number,
    offset: number,
    filter?: Record<string, unknown>
  ): Promise<Array<{ id: string; payload: MemoryPayload }>> {
    const url = `${this.url}/collections/memories/points/scroll`;
    const body: Record<string, unknown> = { limit: limit + offset, with_payload: true };
    if (filter && Object.keys(filter).length > 0) body.filter = filter;

    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response || !response.ok) {
      throw new Error(`Failed to list memories: ${response?.statusText}`);
    }
    const data = (await response.json()) as {
      result: { points: Array<{ id: string; payload: MemoryPayload }> };
    };
    let points = data.result?.points || [];

    points.sort(
      (a, b) =>
        new Date(b.payload.timestamp).getTime() - new Date(a.payload.timestamp).getTime()
    );
    if (offset > 0) {
      points = points.slice(offset);
    }
    return points.slice(0, limit);
  }

  async deleteMemory(id: string): Promise<void> {
    const url = `${this.url}/collections/memories/points/delete`;
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: [id] }),
    });
    if (!response || !response.ok) {
      throw new Error(`Failed to delete memory: ${response?.statusText}`);
    }
  }

  async getMemoryById(
    id: string
  ): Promise<{ id: string; vector: number[]; payload: MemoryPayload } | null> {
    const url = `${this.url}/collections/memories/points/${id}?with_vector=true&with_payload=true`;
    const response = await fetchWithRetry(url);
    if (!response || !response.ok) return null;
    const data = (await response.json()) as {
      result: { id: string; vector: number[]; payload: MemoryPayload };
    };
    return data.result || null;
  }

  async upsertProfile(id: string, payload: ProfilePayload): Promise<void> {
    const url = `${this.url}/collections/profiles/points`;
    const vector = new Array(this.dimensions).fill(0);
    vector[0] = 1;
    const response = await fetchWithRetry(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: [{ id, vector, payload }],
      }),
    });
    if (!response || !response.ok) {
      throw new Error(`Failed to upsert profile: ${response?.statusText}`);
    }
  }

  async getProfile(key: string): Promise<{ id: string; payload: ProfilePayload } | null> {
    const url = `${this.url}/collections/profiles/points/scroll`;
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        filter: { must: [{ key: 'key', match: { value: key } }] },
        limit: 1,
        with_payload: true,
      }),
    });
    if (!response || !response.ok) {
      throw new Error(`Failed to get profile: ${response?.statusText}`);
    }
    const data = (await response.json()) as {
      result: { points: Array<{ id: string; payload: ProfilePayload }> };
    };
    return data.result?.points[0] || null;
  }

  async listProfiles(): Promise<ProfilePayload[]> {
    const url = `${this.url}/collections/profiles/points/scroll`;
    const response = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ limit: 1000, with_payload: true }),
    });
    if (!response || !response.ok) {
      throw new Error(`Failed to list profiles: ${response?.statusText}`);
    }
    const data = (await response.json()) as {
      result: { points: Array<{ id: string; payload: ProfilePayload }> };
    };
    return data.result?.points.map((p) => p.payload) || [];
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
