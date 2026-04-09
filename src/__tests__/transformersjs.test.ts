import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExtractor = vi.fn();
const mockPipeline = vi.fn().mockResolvedValue(mockExtractor);

vi.mock('@huggingface/transformers', () => ({
  pipeline: mockPipeline,
  env: { allowLocalModels: false },
}));

let TransformersJSEmbeddingProvider: typeof import('../embedding/transformersjs.js').TransformersJSEmbeddingProvider;

beforeEach(async () => {
  vi.clearAllMocks();
  vi.resetModules();

  vi.doMock('@huggingface/transformers', () => ({
    pipeline: mockPipeline,
    env: { allowLocalModels: false },
  }));

  const mod = await import('../embedding/transformersjs.js');
  TransformersJSEmbeddingProvider = mod.TransformersJSEmbeddingProvider;
});

describe('TransformersJSEmbeddingProvider', () => {
  describe('constructor', () => {
    it('sets model from config', () => {
      const provider = new TransformersJSEmbeddingProvider({
        provider: 'transformersjs',
        url: '',
        model: 'custom/model',
        dimensions: 512, maxTokens: 512,
      });
      expect(provider.getDimensions()).toBe(512);
    });

    it('uses default model when config.model is empty', () => {
      const provider = new TransformersJSEmbeddingProvider({
        provider: 'transformersjs',
        url: '',
        model: '',
        dimensions: 384, maxTokens: 512,
      });
      expect(provider.getDimensions()).toBe(384);
    });

    it('sets dimensions from config', () => {
      const provider = new TransformersJSEmbeddingProvider({
        provider: 'transformersjs',
        url: '',
        model: 'Xenova/all-MiniLM-L6-v2',
        dimensions: 768, maxTokens: 512,
      });
      expect(provider.getDimensions()).toBe(768);
    });
  });

  describe('name', () => {
    it('is "transformersjs"', () => {
      const provider = new TransformersJSEmbeddingProvider({
        provider: 'transformersjs',
        url: '',
        model: 'Xenova/all-MiniLM-L6-v2',
        dimensions: 384, maxTokens: 512,
      });
      expect(provider.name).toBe('transformersjs');
    });
  });

  describe('getDimensions', () => {
    it('returns the configured dimensions', () => {
      const provider = new TransformersJSEmbeddingProvider({
        provider: 'transformersjs',
        url: '',
        model: 'Xenova/all-MiniLM-L6-v2',
        dimensions: 384, maxTokens: 512,
      });
      expect(provider.getDimensions()).toBe(384);
    });

    it('returns custom dimensions', () => {
      const provider = new TransformersJSEmbeddingProvider({
        provider: 'transformersjs',
        url: '',
        model: 'custom/model',
        dimensions: 1024, maxTokens: 512,
      });
      expect(provider.getDimensions()).toBe(1024);
    });
  });

  describe('getEmbedding', () => {
    it('returns a single number[]', async () => {
      const fakeVector = [0.1, 0.2, 0.3];
      mockExtractor.mockResolvedValue({ tolist: () => [fakeVector] });

      const provider = new TransformersJSEmbeddingProvider({
        provider: 'transformersjs',
        url: '',
        model: 'Xenova/all-MiniLM-L6-v2',
        dimensions: 3, maxTokens: 512,
      });

      const result = await provider.getEmbedding('hello world');
      expect(result).toEqual(fakeVector);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(3);
    });

    it('passes text through getEmbeddings internally', async () => {
      const fakeVector = [0.5, 0.6];
      mockExtractor.mockResolvedValue({ tolist: () => [fakeVector] });

      const provider = new TransformersJSEmbeddingProvider({
        provider: 'transformersjs',
        url: '',
        model: 'Xenova/all-MiniLM-L6-v2',
        dimensions: 2, maxTokens: 512,
      });

      const result = await provider.getEmbedding('test');
      expect(result).toEqual(fakeVector);
      expect(mockExtractor).toHaveBeenCalledWith(
        ['test'],
        { pooling: 'mean', normalize: true }
      );
    });
  });

  describe('getEmbeddings', () => {
    it('returns number[][] for multiple texts', async () => {
      const fakeVectors = [
        [0.1, 0.2, 0.3],
        [0.4, 0.5, 0.6],
      ];
      mockExtractor.mockResolvedValue({ tolist: () => fakeVectors });

      const provider = new TransformersJSEmbeddingProvider({
        provider: 'transformersjs',
        url: '',
        model: 'Xenova/all-MiniLM-L6-v2',
        dimensions: 3, maxTokens: 512,
      });

      const result = await provider.getEmbeddings(['hello', 'world']);
      expect(result).toEqual(fakeVectors);
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveLength(3);
      expect(result[1]).toHaveLength(3);
    });

    it('calls pipeline with correct options', async () => {
      mockExtractor.mockResolvedValue({ tolist: () => [[0.1]] });

      const provider = new TransformersJSEmbeddingProvider({
        provider: 'transformersjs',
        url: '',
        model: 'Xenova/all-MiniLM-L6-v2',
        dimensions: 1, maxTokens: 512,
      });

      await provider.getEmbeddings(['test text']);
      expect(mockExtractor).toHaveBeenCalledWith(
        ['test text'],
        { pooling: 'mean', normalize: true }
      );
    });

    it('loads pipeline lazily on first call', async () => {
      mockExtractor.mockResolvedValue({ tolist: () => [[0.1]] });

      const provider = new TransformersJSEmbeddingProvider({
        provider: 'transformersjs',
        url: '',
        model: 'Xenova/all-MiniLM-L6-v2',
        dimensions: 1, maxTokens: 512,
      });

      expect(mockPipeline).not.toHaveBeenCalled();

      await provider.getEmbeddings(['test']);
      expect(mockPipeline).toHaveBeenCalledTimes(1);
    });

    it('reuses pipeline on subsequent calls', async () => {
      mockExtractor.mockResolvedValue({ tolist: () => [[0.1]] });

      const provider = new TransformersJSEmbeddingProvider({
        provider: 'transformersjs',
        url: '',
        model: 'Xenova/all-MiniLM-L6-v2',
        dimensions: 1, maxTokens: 512,
      });

      await provider.getEmbeddings(['a']);
      await provider.getEmbeddings(['b']);

      expect(mockPipeline).toHaveBeenCalledTimes(1);
      expect(mockExtractor).toHaveBeenCalledTimes(2);
    });
  });

  describe('default model', () => {
    it('uses Xenova/all-MiniLM-L6-v2 when model is empty', async () => {
      mockExtractor.mockResolvedValue({ tolist: () => [[0.1]] });

      const provider = new TransformersJSEmbeddingProvider({
        provider: 'transformersjs',
        url: '',
        model: '',
        dimensions: 1, maxTokens: 512,
      });

      await provider.getEmbeddings(['test']);
      expect(mockPipeline).toHaveBeenCalledWith(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        { dtype: 'fp32' }
      );
    });

    it('uses custom model when provided', async () => {
      mockExtractor.mockResolvedValue({ tolist: () => [[0.1]] });

      const provider = new TransformersJSEmbeddingProvider({
        provider: 'transformersjs',
        url: '',
        model: 'custom/embed-model',
        dimensions: 1, maxTokens: 512,
      });

      await provider.getEmbeddings(['test']);
      expect(mockPipeline).toHaveBeenCalledWith(
        'feature-extraction',
        'custom/embed-model',
        { dtype: 'fp32' }
      );
    });
  });
});
