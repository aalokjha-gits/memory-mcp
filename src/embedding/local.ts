import { Config } from '../config.js';
import { EmbeddingProvider } from './index.js';

/**
 * Local embedding provider using external embedding server
 * Default: http://localhost:8080/embed
 */
export class LocalEmbeddingProvider implements EmbeddingProvider {
  name = 'local';
  private url: string;
  private dimensions: number;

  constructor(config: Config['embedding']) {
    this.url = `${config.url}/embed`;
    this.dimensions = config.dimensions;
  }

  async getEmbedding(text: string): Promise<number[]> {
    const results = await this.getEmbeddings([text]);
    return results[0];
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs: texts }),
    });

    if (!response.ok) {
      throw new Error(`Local embedding failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as unknown;
    
    // Handle array of arrays format: [[...], [...]]
    if (Array.isArray(data) && Array.isArray(data[0])) {
      return data as number[][];
    }
    
    throw new Error('Invalid response format from local embedding service');
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
