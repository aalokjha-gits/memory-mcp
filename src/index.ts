#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import process from 'node:process';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { getConfig, resetConfig } from './config.js';
import { createEmbeddingProvider, EmbeddingProvider } from './embedding/index.js';
import { createVectorDBProvider, VectorDBProvider } from './vectordb/index.js';
import { MemoryPayload } from './vectordb/types.js';
import { autoCategory } from './categorize.js';
import { autoImportance } from './importance.js';
import { generateInstructions } from './instructions.js';

let embeddingProvider: EmbeddingProvider;
let vectordbProvider: VectorDBProvider;

function createServer(instructions: string): McpServer {

const server = new McpServer(
  { name: 'memory-mcp', version: '1.1.0' },
  { instructions }
);

server.tool(
  'memory_add',
  'Store a memory with auto-categorization and importance scoring. Use this to persist decisions, findings, debug insights, infrastructure details, user preferences, and session summaries.',
  {
    content: z.string().describe('The memory content to store'),
    type: z.enum(['knowledge', 'decision', 'pattern', 'preference', 'context', 'debug', 'auto']).default('auto'),
    tags: z.array(z.string()).optional(),
    project: z.string().optional(),
    importance: z.number().min(0).max(1).default(0)
  },
  async ({ content, type, tags, project, importance }) => {
    try {
      const resolvedType = type === 'auto' ? autoCategory(content) : type;
      const resolvedImportance = importance === 0 ? autoImportance(content, resolvedType) : importance;

      const id = uuidv4();
      const timestamp = new Date().toISOString();
      const vector = await embeddingProvider.getEmbedding(content);
      
      const payload: MemoryPayload = { 
        id, 
        content, 
        type: resolvedType, 
        tags, 
        project, 
        importance: resolvedImportance, 
        timestamp 
      };
      await vectordbProvider.upsertMemory(vector, payload);
      
      let linkMessage = '';
      const related = await vectordbProvider.searchMemories(vector, 3, undefined, 0.7);
      const toLink = related.filter(r => r.id !== id);
      if (toLink.length > 0) {
        for (const rel of toLink) {
          await vectordbProvider.linkMemories(id, rel.id);
        }
        linkMessage = `\nAuto-linked to: ${toLink.map(r => r.id).join(', ')}`;
      }
      
      return {
        content: [{ type: 'text', text: `Memory stored successfully.\nID: ${id}\nType: ${resolvedType}\nImportance: ${resolvedImportance}${linkMessage}` }]
      };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Failed to store memory: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

server.tool(
  'memory_link',
  'Link two related memories bidirectionally. Memories with similarity > 0.7 are auto-linked on store, but use this for connections the auto-linker missed.',
  {
    id1: z.string().describe('First memory ID'),
    id2: z.string().describe('Second memory ID')
  },
  async ({ id1, id2 }) => {
    try {
      await vectordbProvider.linkMemories(id1, id2);
      return { content: [{ type: 'text', text: `Memories ${id1} and ${id2} linked successfully.` }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Failed to link memories: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

server.tool(
  'memory_search',
  'Semantic search across all memories. Use this at the start of a session, before making decisions, or when you need context about a topic. Returns results ranked by relevance.',
  {
    query: z.string().describe('The search query text'),
    limit: z.number().default(10),
    type: z.string().optional(),
    tags: z.array(z.string()).optional(),
    project: z.string().optional(),
    min_score: z.number().min(0).max(1).optional()
  },
  async ({ query, limit, type, tags, project, min_score }) => {
    try {
      const vector = await embeddingProvider.getEmbedding(query);
      
      const must: Array<Record<string, unknown>> = [];
      if (type) must.push({ key: 'type', match: { value: type } });
      if (project) must.push({ key: 'project', match: { value: project } });
      if (tags && tags.length > 0) {
        must.push({ key: 'tags', match: { any: tags } });
      }
      
      const filter = must.length > 0 ? { must } : undefined;
      const results = await vectordbProvider.searchMemories(vector, limit, filter, min_score);
      
      if (results.length === 0) {
        return { content: [{ type: 'text', text: 'No matching memories found.' }] };
      }

      const formatted = results.map(r => {
        const p = r.payload;
        const links = p.linked_ids && p.linked_ids.length > 0 ? p.linked_ids.join(', ') : 'none';
        return `[Score: ${r.score.toFixed(3)}] [ID: ${r.id}] [Type: ${p.type}] [Time: ${p.timestamp}]\n${p.content}\nTags: ${p.tags?.join(', ') || 'none'} | Project: ${p.project || 'none'} | Importance: ${p.importance}\nLinks: ${links}`;
      }).join('\n\n---\n\n');

      return { content: [{ type: 'text', text: formatted }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Search failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

server.tool(
  'memory_list',
  'Browse memories by type, tags, or project with pagination. Use this when you need to review all memories in a category rather than searching by meaning.',
  {
    type: z.string().optional(),
    tags: z.array(z.string()).optional(),
    project: z.string().optional(),
    limit: z.number().default(20),
    offset: z.number().default(0)
  },
  async ({ type, tags, project, limit, offset }) => {
    try {
      const must: Array<Record<string, unknown>> = [];
      if (type) must.push({ key: 'type', match: { value: type } });
      if (project) must.push({ key: 'project', match: { value: project } });
      if (tags && tags.length > 0) {
        must.push({ key: 'tags', match: { any: tags } });
      }
      
      const filter = must.length > 0 ? { must } : undefined;
      const results = await vectordbProvider.scrollMemories(limit, offset, filter);
      
      if (results.length === 0) {
        return { content: [{ type: 'text', text: 'No memories found.' }] };
      }

      const formatted = results.map(r => {
        const p = r.payload;
        return `[ID: ${r.id}] [Type: ${p.type}] [Time: ${p.timestamp}]\n${p.content}\nTags: ${p.tags?.join(', ') || 'none'} | Project: ${p.project || 'none'} | Importance: ${p.importance}`;
      }).join('\n\n---\n\n');

      return { content: [{ type: 'text', text: formatted }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `List failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

server.tool(
  'memory_forget',
  'Delete a memory by ID. Memories are never automatically deleted — use this for outdated or incorrect information.',
  {
    memoryId: z.string().describe('The ID of the memory to delete')
  },
  async ({ memoryId }) => {
    try {
      await vectordbProvider.deleteMemory(memoryId);
      return { content: [{ type: 'text', text: `Memory ${memoryId} deleted successfully.` }] };
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Delete failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

server.tool(
  'memory_profile',
  'Key-value store for user preferences and settings. Use this for structured data like preferred_language, editor, timezone — not for general knowledge (use memory_add for that).',
  {
    action: z.enum(['get', 'set', 'list']),
    key: z.string().optional().describe('Required for get and set'),
    value: z.string().optional().describe('Required for set')
  },
  async ({ action, key, value }) => {
    try {
      if (action === 'set') {
        if (!key || !value) throw new Error('Key and value required for set action');
        const existing = await vectordbProvider.getProfile(key);
        const id = existing ? existing.id : uuidv4();
        const timestamp = new Date().toISOString();
        await vectordbProvider.upsertProfile(id, { key, value, timestamp });
        return { content: [{ type: 'text', text: `Profile preference '${key}' saved.` }] };
      } else if (action === 'get') {
        if (!key) throw new Error('Key required for get action');
        const profile = await vectordbProvider.getProfile(key);
        if (!profile) return { content: [{ type: 'text', text: `No profile preference found for '${key}'.` }] };
        return { content: [{ type: 'text', text: `${profile.payload.key}: ${profile.payload.value} (updated: ${profile.payload.timestamp})` }] };
      } else {
        const profiles = await vectordbProvider.listProfiles();
        if (profiles.length === 0) return { content: [{ type: 'text', text: 'No profile preferences stored.' }] };
        const formatted = profiles.map(p => `${p.key}: ${p.value}`).join('\n');
        return { content: [{ type: 'text', text: formatted }] };
      }
    } catch (error) {
      return {
        content: [{ type: 'text', text: `Profile operation failed: ${error instanceof Error ? error.message : String(error)}` }],
        isError: true
      };
    }
  }
);

server.tool(
  'memory_help',
  'Show server configuration and available tools.',
  {},
  async () => {
    const config = getConfig();
    const help = `Memory MCP Server v1.0.0

Configuration:
  Embedding: ${config.embedding.provider} (${config.embedding.dimensions} dims)
  Vector DB: ${config.vectordb.provider} (${config.vectordb.url})

Tools:
  1. memory_add     - Store a memory (auto-categorizes)
  2. memory_search  - Semantic search across memories
  3. memory_list    - Browse memories by type/tags/project
  4. memory_forget  - Delete a memory by ID
  5. memory_profile - Get/set user preferences
  6. memory_link    - Link related memories

Memory Types:
  knowledge, decision, pattern, preference, context, debug, auto

Environment Variables:
  EMBEDDING_PROVIDER  - transformersjs (default) | local | openai | ollama | custom
  EMBEDDING_URL       - Embedding service URL (for local/openai/ollama)
  EMBEDDING_API_KEY   - API key for OpenAI/Ollama
  VECTORDB_PROVIDER   - local (default) | qdrant
  QDRANT_URL          - Qdrant endpoint (when using qdrant)
  VECTORDB_COLLECTION - Collection name (default: memories)
`;
    return { content: [{ type: 'text', text: help }] };
  }
);

return server;

}

async function run() {
  try {
    const config = getConfig();
    console.error(`Starting Memory MCP Server...`);
    console.error(`Embedding: ${config.embedding.provider} (${config.embedding.dimensions} dims)`);
    console.error(`Vector DB: ${config.vectordb.provider} at ${config.vectordb.url}`);

    embeddingProvider = await createEmbeddingProvider(config.embedding);
    console.error(`Embedding provider initialized: ${embeddingProvider.name}`);

    vectordbProvider = await createVectorDBProvider(config.vectordb, config.embedding.dimensions);
    await vectordbProvider.init();
    console.error(`Vector DB provider initialized: ${vectordbProvider.name}`);

    const instructions = generateInstructions(config);
    const server = createServer(instructions);

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Memory MCP Server running on stdio');
  } catch (error) {
    console.error('Fatal initialization error:', error);
    process.exit(1);
  }
}

run();
