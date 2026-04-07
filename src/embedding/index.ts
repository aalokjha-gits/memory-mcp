import { Config } from '../config.js';

export interface EmbeddingResult {
  vector: number[];
  dimensions: number;
}

export interface EmbeddingProvider {
  name: string;
  getEmbedding(text: string): Promise<number[]>;
  getEmbeddings(texts: string[]): Promise<number[][]>;
  getDimensions(): number;
}

export async function createEmbeddingProvider(config: Config['embedding']): Promise<EmbeddingProvider> {
  switch (config.provider) {
    case 'transformersjs': {
      const { TransformersJSEmbeddingProvider } = await import('./transformersjs.js');
      return new TransformersJSEmbeddingProvider(config);
    }
    case 'local': {
      const { LocalEmbeddingProvider } = await import('./local.js');
      return new LocalEmbeddingProvider(config);
    }
    case 'openai': {
      const { OpenAIEmbeddingProvider } = await import('./openai.js');
      return new OpenAIEmbeddingProvider(config);
    }
    case 'ollama': {
      const { OllamaEmbeddingProvider } = await import('./ollama.js');
      return new OllamaEmbeddingProvider(config);
    }
    case 'custom': {
      const { CustomEmbeddingProvider } = await import('./custom.js');
      return new CustomEmbeddingProvider(config);
    }
    default:
      throw new Error(`Unknown embedding provider: ${config.provider}`);
  }
}

// Helper function for HTTP-based embedding services
async function fetchEmbeddings(
  url: string,
  texts: string[],
  headers: Record<string, string> = {},
  bodyTransformer: (texts: string[]) => unknown = (texts) => ({ inputs: texts }),
  responseExtractor: (data: unknown) => number[][]
): Promise<number[][]> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(bodyTransformer(texts)),
  });

  if (!response.ok) {
    throw new Error(`Embedding service failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  return responseExtractor(data);
}
