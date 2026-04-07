import { Config } from '../config.js';
import { EmbeddingProvider } from './index.js';

type Pipeline = (texts: string | string[], options: { pooling: string; normalize: boolean }) => Promise<{ tolist(): number[][] }>;

let pipelineInstance: Pipeline | null = null;

async function loadPipeline(model: string): Promise<Pipeline> {
  if (pipelineInstance) return pipelineInstance;

  const { pipeline, env } = await import('@huggingface/transformers');
  env.allowLocalModels = true;

  const extractor = await pipeline('feature-extraction', model, { dtype: 'fp32' });
  pipelineInstance = extractor as unknown as Pipeline;
  return pipelineInstance;
}

export class TransformersJSEmbeddingProvider implements EmbeddingProvider {
  name = 'transformersjs';
  private model: string;
  private dimensions: number;
  private pipeline: Pipeline | null = null;

  constructor(config: Config['embedding']) {
    this.model = config.model || 'Xenova/all-MiniLM-L6-v2';
    this.dimensions = config.dimensions;
  }

  private async getPipeline(): Promise<Pipeline> {
    if (!this.pipeline) {
      console.error(`Loading Transformers.js model: ${this.model} (first run downloads ~90MB)...`);
      this.pipeline = await loadPipeline(this.model);
      console.error('Model loaded.');
    }
    return this.pipeline;
  }

  async getEmbedding(text: string): Promise<number[]> {
    const results = await this.getEmbeddings([text]);
    return results[0];
  }

  async getEmbeddings(texts: string[]): Promise<number[][]> {
    const pipe = await this.getPipeline();
    const output = await pipe(texts, { pooling: 'mean', normalize: true });
    return output.tolist();
  }

  getDimensions(): number {
    return this.dimensions;
  }
}
