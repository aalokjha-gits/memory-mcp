# Memory MCP

**Persistent memory for AI agents. Plug-and-play with zero infrastructure.**

A Model Context Protocol (MCP) server that gives your AI agents persistent, searchable memory. Works out of the box with zero configuration using local embeddings and file-based storage.

## Features

- 🔍 **Semantic Search** - Find memories by meaning, not keywords
- 🔗 **Auto-Linking** - Related memories are automatically connected
- 🏷️ **Auto-Categorization** - Memories are categorized by type (knowledge, decision, pattern, etc.)
- ⭐ **Importance Scoring** - Automatic priority based on content
- 🔌 **Pluggable Embeddings** - Transformers.js (default), OpenAI, Ollama, or custom
- 🐳 **Docker & Kubernetes Ready** - Ready for production scale
- 📦 **Zero Config** - No database or API keys required to start

## Quick Start

Start the server immediately with zero configuration.

```bash
# Run using npx (requires Node 18+)
npx memory-mcp
```

Or install and run locally:

```bash
git clone https://github.com/aalokjha-gits/memory-mcp.git
cd memory-mcp
npm install
npm start
```

### How it works by default:
- **Embeddings**: Uses in-process Transformers.js (`all-MiniLM-L6-v2`, 384 dimensions). No external server or Python needed.
- **Storage**: Uses a local JSON vector store at `~/.memory-mcp/`. No Docker or database required.
- **Initialization**: The first run downloads a ~90MB model file. Every run after that is instant.

## Production Setup

Upgrade to high-performance storage and external embedding providers when you're ready to scale.

### Qdrant + External Embeddings

1. Start Qdrant and your embedding service using Docker Compose:

```bash
docker-compose up -d
```

2. Configure environment variables to point to your production services:

```bash
export VECTORDB_PROVIDER=qdrant
export QDRANT_URL=http://localhost:6333
export EMBEDDING_PROVIDER=openai
export EMBEDDING_API_KEY=sk-your-key
```

### Docker Compose

```yaml
version: '3.8'

services:
  memory-mcp:
    image: aalokjha-gits/memory-mcp:latest
    environment:
      - VECTORDB_PROVIDER=qdrant
      - QDRANT_URL=http://qdrant:6333
      - EMBEDDING_PROVIDER=openai
      - EMBEDDING_API_KEY=your-api-key
    depends_on:
      - qdrant

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

volumes:
  qdrant_data:
```

### Kubernetes

Deploy to Kubernetes using Helm or raw manifests:

```bash
# Using Helm
helm install memory-mcp ./helm/memory-mcp

# Or apply manifests directly
kubectl apply -f kubernetes/
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
