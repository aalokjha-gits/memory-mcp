import { Config } from '../config.js';
import { EmbeddingProvider } from './index.js';

/**
 * Ollama embedding provider
 * Models: nomic-embed-text, mxbai-embed-large, all-minilm
 */
export class OllamaEmbeddingProvider implements EmbeddingProvider {
  name = 'ollama';
  private url: string;
  private model: string;
  private dimensions: number;

  constructor(config: Config['embedding']) {
    this.url = config.url || 'http://localhost:11434';
    this.model = config.model || 'nomic-embed-text';
    this.dimensions = config.dimensions || 768;
  }

  async getEmbedding(text: string): Promise<number[]> {
    const results = await this.getEmbeddings([text]);
    return results[0];
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    // Ollama requires individual calls for each text
    const results: number[][] = [];
    
    for (const text of texts) {
      const response = await fetch(`${this.url}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt: text,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as { embedding: number[] };
      results.push(data.embedding);
    }
    
    return results;
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
