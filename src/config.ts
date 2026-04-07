import process from 'node:process';

export type EmbeddingProvider = 'transformersjs' | 'local' | 'openai' | 'ollama' | 'custom';
export type VectorDBProvider = 'local' | 'qdrant' | 'chromadb' | 'milvus';

export interface Config {
  server: {
    port: number;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
  };
  embedding: {
    provider: EmbeddingProvider;
    url: string;
    apiKey?: string;
    model: string;
    dimensions: number;
  };
  vectordb: {
    provider: VectorDBProvider;
    url: string;
    apiKey?: string;
    collection: string;
  };
}

// Default configurations per provider
export const EMBEDDING_DEFAULTS: Record<EmbeddingProvider, Partial<Config['embedding']>> = {
  transformersjs: {
    url: '',
    model: 'Xenova/all-MiniLM-L6-v2',
    dimensions: 384,
  },
  local: {
    url: 'http://localhost:8080',
    model: 'all-MiniLM-L6-v2',
    dimensions: 384,
  },
  openai: {
    url: 'https://api.openai.com/v1',
    model: 'text-embedding-3-small',
    dimensions: 1536,
  },
  ollama: {
    url: 'http://localhost:11434',
    model: 'nomic-embed-text',
    dimensions: 768,
  },
  custom: {
    url: '',
    model: 'custom',
    dimensions: 384,
  },
};

export const VECTORDB_DEFAULTS: Record<VectorDBProvider, Partial<Config['vectordb']>> = {
  local: {
    url: '',
    collection: 'memories',
  },
  qdrant: {
    url: 'http://localhost:6333',
    collection: 'memories',
  },
  chromadb: {
    url: 'http://localhost:8000',
    collection: 'memories',
  },
  milvus: {
    url: 'http://localhost:19530',
    collection: 'memories',
  },
};

function getEnv<T>(key: string, defaultValue: T, parser?: (v: string) => T): T {
  const value = process.env[key];
  if (value === undefined) return defaultValue;
  if (parser) return parser(value);
  return value as unknown as T;
}

export function loadConfig(): Config {
  // Detect embedding provider
  const embeddingProvider = getEnv('EMBEDDING_PROVIDER', 'transformersjs') as EmbeddingProvider;
  const embeddingDefaults = EMBEDDING_DEFAULTS[embeddingProvider];
  
  // Detect vector DB provider
  const vectordbProvider = getEnv('VECTORDB_PROVIDER', 'local') as VectorDBProvider;
  const vectordbDefaults = VECTORDB_DEFAULTS[vectordbProvider];

  return {
    server: {
      port: getEnv('PORT', 3000, Number),
      logLevel: getEnv('LOG_LEVEL', 'info') as Config['server']['logLevel'],
    },
    embedding: {
      provider: embeddingProvider,
      url: getEnv('EMBEDDING_URL', embeddingDefaults.url || ''),
      apiKey: getEnv('EMBEDDING_API_KEY', undefined),
      model: getEnv('EMBEDDING_MODEL', embeddingDefaults.model || ''),
      dimensions: getEnv('EMBEDDING_DIMENSIONS', embeddingDefaults.dimensions || 384, Number),
    },
    vectordb: {
      provider: vectordbProvider,
      url: getEnv('QDRANT_URL', getEnv('VECTORDB_URL', vectordbDefaults.url || '')),
      apiKey: getEnv('VECTORDB_API_KEY', undefined),
      collection: getEnv('VECTORDB_COLLECTION', vectordbDefaults.collection || 'memories'),
    },
  };
}

// Singleton config instance
let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    _config = loadConfig();
  }
  return _config;
}

export function resetConfig(): void {
  _config = null;
}
