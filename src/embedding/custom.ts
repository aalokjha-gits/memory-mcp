import { Config } from '../config.js';
import { EmbeddingProvider } from './index.js';

export class CustomEmbeddingProvider implements EmbeddingProvider {
  name = 'custom';
  private url: string;
  private apiKey?: string;
  private model: string;
  private dimensions: number;

  constructor(config: Config['embedding']) {
    this.url = config.url;
    this.apiKey = config.apiKey;
    this.model = config.model || 'custom';
    this.dimensions = config.dimensions;

    if (!this.url) {
      throw new Error('Custom embedding provider requires EMBEDDING_URL');
    }
  }

  async getEmbedding(text: string): Promise<number[]> {
    const results = await this.getEmbeddings([text]);
    return results[0];
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const endpoint = this.url.endsWith('/embeddings') ? this.url : `${this.url}/v1/embeddings`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ input: texts, model: this.model }),
    });

    if (!response.ok) {
      throw new Error(`Custom embedding failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as unknown;

    if (this.isOpenAIFormat(data)) {
      return (data as { data: Array<{ embedding: number[] }> }).data.map(item => item.embedding);
    }

    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data as number[][];
    }

    throw new Error('Unsupported response format. Expected OpenAI-compatible { data: [{ embedding }] } or raw number[][]');
  }

  private isOpenAIFormat(data: unknown): boolean {
    return typeof data === 'object' && data !== null && 'data' in data &&
      Array.isArray((data as { data: unknown }).data);
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
