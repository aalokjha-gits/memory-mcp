import { Config } from '../config.js';
import { EmbeddingProvider } from './index.js';

/**
 * OpenAI embedding provider
 * Models: text-embedding-3-small (1536), text-embedding-3-large (3072), text-embedding-ada-002 (1536)
 */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  private url: string;
  private apiKey: string;
  private model: string;
  private dimensions: number;

  constructor(config: Config['embedding']) {
    this.url = config.url || 'https://api.openai.com/v1';
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = config.model || 'text-embedding-3-small';
    this.dimensions = config.dimensions || 1536;

    if (!this.apiKey) {
      throw new Error('OpenAI API key required. Set EMBEDDING_API_KEY or OPENAI_API_KEY');
    }
  }

  async getEmbedding(text: string): Promise<number[]> {
    const results = await this.getEmbeddings([text]);
    return results[0];
  }

  private supportsDimensionsParam(): boolean {
    return this.model.startsWith('text-embedding-3-');
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    const body: Record<string, unknown> = {
      input: texts,
      model: this.model,
    };
    if (this.supportsDimensionsParam()) {
      body.dimensions = this.dimensions;
    }

    const response = await fetch(`${this.url}/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI embedding failed: ${response.status} ${error}`);
    }

    const data = await response.json() as { data: Array<{ embedding: number[] }> };
    return data.data.map((item) => item.embedding);
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
