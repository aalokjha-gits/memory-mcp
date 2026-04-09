import { describe, it, expect } from 'vitest';
import { generateInstructions } from '../instructions.js';
import { Config } from '../config.js';

function makeConfig(overrides: Partial<Config['embedding']> = {}): Config {
  return {
    server: { port: 3000, logLevel: 'info' },
    embedding: {
      provider: 'transformersjs',
      url: '',
      model: 'Xenova/all-MiniLM-L6-v2',
      dimensions: 384,
      maxTokens: 512,
      ...overrides,
    },
    vectordb: {
      provider: 'local',
      url: '',
      collection: 'memories',
    },
  };
}

describe('generateInstructions', () => {
  it('includes the model name from config', () => {
    const instructions = generateInstructions(makeConfig());
    expect(instructions).toContain('Xenova/all-MiniLM-L6-v2');
  });

  it('includes the correct token limit for transformersjs', () => {
    const instructions = generateInstructions(makeConfig());
    expect(instructions).toContain('512 token');
  });

  it('includes the correct word limit for transformersjs (512 * 0.75 = 384)', () => {
    const instructions = generateInstructions(makeConfig());
    expect(instructions).toContain('384 words');
  });

  it('adapts word limit for openai provider (8191 * 0.75 = 6143)', () => {
    const instructions = generateInstructions(makeConfig({
      provider: 'openai',
      model: 'text-embedding-3-small',
      dimensions: 1536,
      maxTokens: 8191,
    }));
    expect(instructions).toContain('6143 words');
    expect(instructions).toContain('8191 token');
    expect(instructions).toContain('text-embedding-3-small');
  });

  it('adapts word limit for ollama provider (8192 * 0.75 = 6144)', () => {
    const instructions = generateInstructions(makeConfig({
      provider: 'ollama',
      model: 'nomic-embed-text',
      dimensions: 768,
      maxTokens: 8192,
    }));
    expect(instructions).toContain('6144 words');
    expect(instructions).toContain('nomic-embed-text');
  });

  it('includes vectordb provider info', () => {
    const instructions = generateInstructions(makeConfig());
    expect(instructions).toContain('local');
    expect(instructions).toContain('~/.memory-mcp/');
  });

  it('includes when-to-search guidance', () => {
    const instructions = generateInstructions(makeConfig());
    expect(instructions).toContain('Search memory FIRST');
  });

  it('includes when-to-store guidance', () => {
    const instructions = generateInstructions(makeConfig());
    expect(instructions).toContain('Store to memory');
  });

  it('includes cross-tool workflow', () => {
    const instructions = generateInstructions(makeConfig());
    expect(instructions).toContain('memory_search');
    expect(instructions).toContain('memory_add');
    expect(instructions).toContain('memory_link');
    expect(instructions).toContain('memory_profile');
  });

  it('includes memory type table', () => {
    const instructions = generateInstructions(makeConfig());
    expect(instructions).toContain('knowledge');
    expect(instructions).toContain('decision');
    expect(instructions).toContain('pattern');
    expect(instructions).toContain('preference');
    expect(instructions).toContain('context');
    expect(instructions).toContain('debug');
  });

  it('does not include local path hint for qdrant provider', () => {
    const config = makeConfig();
    config.vectordb.provider = 'qdrant';
    config.vectordb.url = 'http://localhost:6333';
    const instructions = generateInstructions(config);
    expect(instructions).not.toContain('~/.memory-mcp/');
    expect(instructions).toContain('qdrant');
  });
});
