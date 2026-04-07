import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { loadConfig, getConfig, resetConfig } from '../config.js';

describe('config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    resetConfig();
  });

  afterEach(() => {
    for (const key of Object.keys(process.env)) {
      if (!(key in originalEnv)) {
        delete process.env[key];
      }
    }
    Object.assign(process.env, originalEnv);
    resetConfig();
  });

  describe('loadConfig() defaults', () => {
    it('returns correct server defaults', () => {
      const config = loadConfig();
      expect(config.server.port).toBe(3000);
      expect(config.server.logLevel).toBe('info');
    });

    it('returns correct transformersjs embedding defaults', () => {
      const config = loadConfig();
      expect(config.embedding.provider).toBe('transformersjs');
      expect(config.embedding.url).toBe('');
      expect(config.embedding.model).toBe('Xenova/all-MiniLM-L6-v2');
      expect(config.embedding.dimensions).toBe(384);
      expect(config.embedding.apiKey).toBeUndefined();
    });

    it('returns correct local vectordb defaults', () => {
      const config = loadConfig();
      expect(config.vectordb.provider).toBe('local');
      expect(config.vectordb.url).toBe('');
      expect(config.vectordb.collection).toBe('memories');
      expect(config.vectordb.apiKey).toBeUndefined();
    });
  });

  describe('env var overrides', () => {
    it('overrides PORT', () => {
      process.env.PORT = '8080';
      const config = loadConfig();
      expect(config.server.port).toBe(8080);
    });

    it('overrides LOG_LEVEL', () => {
      process.env.LOG_LEVEL = 'debug';
      const config = loadConfig();
      expect(config.server.logLevel).toBe('debug');
    });

    it('overrides EMBEDDING_PROVIDER', () => {
      process.env.EMBEDDING_PROVIDER = 'openai';
      const config = loadConfig();
      expect(config.embedding.provider).toBe('openai');
    });

    it('overrides EMBEDDING_URL', () => {
      process.env.EMBEDDING_URL = 'http://custom:9999';
      const config = loadConfig();
      expect(config.embedding.url).toBe('http://custom:9999');
    });

    it('overrides EMBEDDING_API_KEY', () => {
      process.env.EMBEDDING_API_KEY = 'sk-test-123';
      const config = loadConfig();
      expect(config.embedding.apiKey).toBe('sk-test-123');
    });

    it('overrides EMBEDDING_MODEL', () => {
      process.env.EMBEDDING_MODEL = 'custom-model';
      const config = loadConfig();
      expect(config.embedding.model).toBe('custom-model');
    });

    it('overrides EMBEDDING_DIMENSIONS', () => {
      process.env.EMBEDDING_DIMENSIONS = '512';
      const config = loadConfig();
      expect(config.embedding.dimensions).toBe(512);
    });

    it('overrides QDRANT_URL', () => {
      process.env.QDRANT_URL = 'http://qdrant:6334';
      const config = loadConfig();
      expect(config.vectordb.url).toBe('http://qdrant:6334');
    });

    it('overrides VECTORDB_URL as fallback', () => {
      process.env.VECTORDB_URL = 'http://vectordb:7777';
      const config = loadConfig();
      expect(config.vectordb.url).toBe('http://vectordb:7777');
    });

    it('QDRANT_URL takes precedence over VECTORDB_URL', () => {
      process.env.QDRANT_URL = 'http://qdrant:6334';
      process.env.VECTORDB_URL = 'http://vectordb:7777';
      const config = loadConfig();
      expect(config.vectordb.url).toBe('http://qdrant:6334');
    });

    it('overrides VECTORDB_PROVIDER', () => {
      process.env.VECTORDB_PROVIDER = 'chromadb';
      const config = loadConfig();
      expect(config.vectordb.provider).toBe('chromadb');
    });

    it('overrides VECTORDB_API_KEY', () => {
      process.env.VECTORDB_API_KEY = 'vdb-key-123';
      const config = loadConfig();
      expect(config.vectordb.apiKey).toBe('vdb-key-123');
    });

    it('overrides VECTORDB_COLLECTION', () => {
      process.env.VECTORDB_COLLECTION = 'custom-memories';
      const config = loadConfig();
      expect(config.vectordb.collection).toBe('custom-memories');
    });
  });

  describe('provider-specific defaults', () => {
    it('local provider: 384 dimensions, localhost:8080', () => {
      process.env.EMBEDDING_PROVIDER = 'local';
      const config = loadConfig();
      expect(config.embedding.dimensions).toBe(384);
      expect(config.embedding.url).toBe('http://localhost:8080');
      expect(config.embedding.model).toBe('all-MiniLM-L6-v2');
    });

    it('openai provider: 1536 dimensions, openai API URL', () => {
      process.env.EMBEDDING_PROVIDER = 'openai';
      const config = loadConfig();
      expect(config.embedding.dimensions).toBe(1536);
      expect(config.embedding.url).toBe('https://api.openai.com/v1');
      expect(config.embedding.model).toBe('text-embedding-3-small');
    });

    it('ollama provider: 768 dimensions, localhost:11434', () => {
      process.env.EMBEDDING_PROVIDER = 'ollama';
      const config = loadConfig();
      expect(config.embedding.dimensions).toBe(768);
      expect(config.embedding.url).toBe('http://localhost:11434');
      expect(config.embedding.model).toBe('nomic-embed-text');
    });

    it('custom provider: 384 dimensions, empty URL', () => {
      process.env.EMBEDDING_PROVIDER = 'custom';
      const config = loadConfig();
      expect(config.embedding.dimensions).toBe(384);
      expect(config.embedding.url).toBe('');
      expect(config.embedding.model).toBe('custom');
    });

    it('chromadb vectordb: localhost:8000', () => {
      process.env.VECTORDB_PROVIDER = 'chromadb';
      const config = loadConfig();
      expect(config.vectordb.url).toBe('http://localhost:8000');
      expect(config.vectordb.collection).toBe('memories');
    });

    it('milvus vectordb: localhost:19530', () => {
      process.env.VECTORDB_PROVIDER = 'milvus';
      const config = loadConfig();
      expect(config.vectordb.url).toBe('http://localhost:19530');
      expect(config.vectordb.collection).toBe('memories');
    });
  });

  describe('resetConfig()', () => {
    it('clears the singleton so next getConfig() re-reads env', () => {
      const config1 = getConfig();
      expect(config1.server.port).toBe(3000);

      process.env.PORT = '9999';
      expect(getConfig().server.port).toBe(3000);

      resetConfig();
      expect(getConfig().server.port).toBe(9999);
    });
  });

  describe('getConfig() singleton', () => {
    it('returns the same instance on repeated calls', () => {
      const a = getConfig();
      const b = getConfig();
      expect(a).toBe(b);
    });

    it('creates config on first call', () => {
      const config = getConfig();
      expect(config).toBeDefined();
      expect(config.server).toBeDefined();
      expect(config.embedding).toBeDefined();
      expect(config.vectordb).toBeDefined();
    });
  });
});
