import { Config } from '../config.js';
import { MemoryPayload, ProfilePayload } from './types.js';

export interface VectorDBProvider {
  name: string;
  init(): Promise<void>;
  upsertMemory(vector: number[], payload: MemoryPayload): Promise<void>;
  searchMemories(
    vector: number[],
    limit: number,
    filter?: Record<string, unknown>,
    scoreThreshold?: number
  ): Promise<Array<{ id: string; score: number; payload: MemoryPayload }>>;
  scrollMemories(
    limit: number,
    offset: number,
    filter?: Record<string, unknown>
  ): Promise<Array<{ id: string; payload: MemoryPayload }>>;
  deleteMemory(id: string): Promise<void>;
  getMemoryById(id: string): Promise<{ id: string; vector: number[]; payload: MemoryPayload } | null>;
  upsertProfile(id: string, payload: ProfilePayload): Promise<void>;
  getProfile(key: string): Promise<{ id: string; payload: ProfilePayload } | null>;
  listProfiles(): Promise<ProfilePayload[]>;
  linkMemories(id1: string, id2: string): Promise<void>;
}

export async function createVectorDBProvider(config: Config['vectordb'], dimensions?: number): Promise<VectorDBProvider> {
  switch (config.provider) {
    case 'local': {
      const { LocalVectorDBProvider } = await import('./local.js');
      return new LocalVectorDBProvider(config, dimensions);
    }
    case 'qdrant': {
      const { QdrantProvider } = await import('./qdrant.js');
      return new QdrantProvider(config);
    }
    default:
      throw new Error(`Unknown vector DB provider: ${config.provider}`);
  }
}
