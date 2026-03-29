import { Config } from '../config.js';
import { EmbeddingProvider } from './index.js';

/**
 * Custom embedding provider for any HTTP endpoint
 * Expects: POST {url}/embed with body { inputs: string[] }
 * Returns: number[][]
 */
export class CustomEmbeddingProvider implements EmbeddingProvider {
  name = 'custom';
  private url: string;
  private apiKey?: string;
  private dimensions: number;

  constructor(config: Config['embedding']) {
    this.url = config.url;
    this.apiKey = config.apiKey;
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

    const response = await fetch(`${this.url}/embed`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ inputs: texts }),
    });

    if (!response.ok) {
      throw new Error(`Custom embedding failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as unknown;
    
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data as number[][];
    }
    
    throw new Error('Invalid response format from custom embedding service');
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
