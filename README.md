# Memory MCP

**Persistent memory for AI agents. Plug-and-play with zero infrastructure.**

A Model Context Protocol (MCP) server that gives your AI agents persistent, searchable memory. Works out of the box with zero configuration using local embeddings and file-based storage.

## Features

- 🔍 **Semantic Search** - Find memories by meaning, not keywords
- 🔗 **Auto-Linking** - Related memories are automatically connected
- 🏷️ **Auto-Categorization** - Memories are categorized by type (knowledge, decision, pattern, etc.)
- ⭐ **Importance Scoring** - Automatic priority based on content
- 🔌 **Pluggable Embeddings** - Transformers.js (default), OpenAI, Ollama, or custom
- 📦 **Zero Config** - No database or API keys required to start

## Quick Start

Start the server immediately with zero configuration.

```bash
# Run using npx (requires Node 18+)
npx @aalokjha/mem-aj
```

Or install locally:

```bash
npm i @aalokjha/mem-aj
```

### How it works by default:
- **Embeddings**: Uses in-process Transformers.js (`all-MiniLM-L6-v2`, 384 dimensions). No external server or Python needed.
- **Storage**: Uses a local JSON vector store at `~/.memory-mcp/`.
- **Initialization**: The first run downloads a ~90MB model file. Every run after that is instant.

## MCP Client Configuration

Add Memory MCP to your favorite AI tools by adding these configurations.

### OpenCode / Claude Desktop / Cursor

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@aalokjha/mem-aj"]
    }
  }
}
```

## Production Setup

Configure environment variables to use high-performance storage and external embedding providers.

### Qdrant + External Embeddings

1. Run your own Qdrant instance.
2. Set environment variables to point to your services:

```bash
export VECTORDB_PROVIDER=qdrant
export QDRANT_URL=http://localhost:6333
export EMBEDDING_PROVIDER=openai
export EMBEDDING_API_KEY=sk-your-key
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDING_PROVIDER` | `transformersjs` | Embedding provider: `transformersjs`, `openai`, `ollama`, `custom` |
| `VECTORDB_PROVIDER` | `local` | Storage provider: `local`, `qdrant` |
| `EMBEDDING_URL` | - | Embedding service URL (for Ollama/Custom) |
| `EMBEDDING_API_KEY` | - | API key for OpenAI |
| `EMBEDDING_MODEL` | Provider default | Model name |
| `EMBEDDING_DIMENSIONS` | Provider default | Vector dimensions |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant endpoint |
| `VECTORDB_COLLECTION` | `memories` | Collection name |
| `LOG_LEVEL` | `info` | Log level: debug, info, warn, error |

### Embedding Providers

#### Transformers.js (Default - Zero Config)

Runs locally in your Node.js process. No external services needed.

```bash
export EMBEDDING_PROVIDER=transformersjs
```

#### OpenAI

```bash
export EMBEDDING_PROVIDER=openai
export EMBEDDING_API_KEY=sk-your-key
export EMBEDDING_MODEL=text-embedding-3-small
```

#### Ollama

```bash
export EMBEDDING_PROVIDER=ollama
export EMBEDDING_URL=http://localhost:11434
export EMBEDDING_MODEL=nomic-embed-text
```

#### Custom

Any HTTP endpoint that accepts `POST /embed` with `{ inputs: string[] }` and returns `number[][]`.

```bash
export EMBEDDING_PROVIDER=custom
export EMBEDDING_URL=http://your-service:port
```

## MCP Tools

### memory_add

Store a memory with automatic categorization and importance scoring.

```json
{
  "content": "Decided to use PostgreSQL for the main database",
  "type": "auto",
  "tags": ["database", "architecture"],
  "project": "my-app"
}
```

### memory_search

Semantic search across all memories.

```json
{
  "query": "database decisions",
  "limit": 10,
  "min_score": 0.7
}
```

### memory_list

Browse memories by type, tags, or project.

```json
{
  "type": "decision",
  "project": "my-app",
  "limit": 20
}
```

### memory_forget

Delete a memory by ID.

```json
{
  "memoryId": "uuid-here"
}
```

### memory_link

Manually link two related memories.

```json
{
  "id1": "uuid-1",
  "id2": "uuid-2"
}
```

### memory_profile

Store user preferences.

```json
{
  "action": "set",
  "key": "preferred_language",
  "value": "typescript"
}
```

## Memory Types

| Type | Description | Keywords Detected |
|------|-------------|-------------------|
| `knowledge` | Facts and information | (default) |
| `decision` | Choices made | decided, chose, will use, picked |
| `pattern` | Recurring solutions | pattern, always, convention, best practice |
| `preference` | User preferences | prefer, like, dislike, want, hate |
| `context` | Situational context | working on, currently, project |
| `debug` | Debug notes | error, bug, fix, crash, issue |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in dev mode
npm run dev

# Run tests
npm test
```

## Architecture

Memory MCP supports two modes:

### Zero-Config Mode (Default)
Simple, file-based storage for personal use.
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MCP Client    │────▶│   Memory MCP    │────▶│   Local JSON    │
│   (Claude/AI)   │     │    Server       │     │   Vector Store  │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │ Transformers.js │
                        │  (In-process)   │
                        └─────────────────┘
```

### Production Mode
High-performance configuration for shared environments.
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MCP Client    │────▶│   Memory MCP    │────▶│     Qdrant      │
│   (Claude/AI)   │     │    Server       │     │    Vector DB    │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │    External     │
                        │    Provider     │
                        │ (OpenAI/Ollama) │
                        └─────────────────┘
```

## License

MIT License - see [LICENSE](LICENSE)

## Contributing

Contributions welcome! Please read our contributing guidelines.

## Credits

Built by [Aalok Jha](https://github.com/aalokjha-gits)
