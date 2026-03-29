# Memory MCP

**Persistent memory for AI agents. One-click setup.**

A Model Context Protocol (MCP) server that gives your AI agents persistent, searchable memory powered by vector embeddings.

## Features

- 🔍 **Semantic Search** - Find memories by meaning, not keywords
- 🔗 **Auto-Linking** - Related memories are automatically connected
- 🏷️ **Auto-Categorization** - Memories are categorized by type (knowledge, decision, pattern, etc.)
- ⭐ **Importance Scoring** - Automatic priority based on content
- 🔌 **Pluggable Embeddings** - Local (free), OpenAI, Ollama, or custom
- 🐳 **Docker & Kubernetes Ready** - One command deployment
- 📦 **Zero Config** - Works out of the box with sensible defaults

## Quick Start

### Docker (Recommended)

```bash
# Clone and run
git clone https://github.com/openclaw/memory-mcp.git
cd memory-mcp
docker-compose up -d
```

That's it! Memory MCP is now running with:
- Memory server on port 3000
- Qdrant vector DB on port 6333
- Local embeddings on port 8080

### Local Installation

```bash
# Clone and install
git clone https://github.com/openclaw/memory-mcp.git
cd memory-mcp
npm install

# Set environment variables (or use defaults)
export QDRANT_URL=http://localhost:6333
export EMBEDDING_PROVIDER=local
export EMBEDDING_URL=http://localhost:8080

# Run
npm start
```

### Kubernetes

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
| `EMBEDDING_PROVIDER` | `local` | Embedding provider: `local`, `openai`, `ollama`, `custom` |
| `EMBEDDING_URL` | `http://localhost:8080` | Embedding service URL |
| `EMBEDDING_API_KEY` | - | API key for OpenAI/Ollama |
| `EMBEDDING_MODEL` | Provider default | Model name |
| `EMBEDDING_DIMENSIONS` | Provider default | Vector dimensions |
| `QDRANT_URL` | `http://localhost:6333` | Qdrant endpoint |
| `VECTORDB_COLLECTION` | `memories` | Collection name |
| `PORT` | `3000` | Server port |
| `LOG_LEVEL` | `info` | Log level: debug, info, warn, error |

### Embedding Providers

#### Local (Default - Free)

No API key required. Uses a local embedding server.

```bash
export EMBEDDING_PROVIDER=local
export EMBEDDING_URL=http://localhost:8080
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

## Docker Compose

```yaml
version: '3.8'

services:
  memory-mcp:
    image: openclaw/memory-mcp:latest
    ports:
      - "3000:3000"
    environment:
      - QDRANT_URL=http://qdrant:6333
      - EMBEDDING_PROVIDER=local
      - EMBEDDING_URL=http://embeddings:8080
    depends_on:
      - qdrant
      - embeddings

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

  embeddings:
    image: openclaw/embeddings-local:latest
    ports:
      - "8080:8080"

volumes:
  qdrant_data:
```

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

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   MCP Client    │────▶│   Memory MCP    │────▶│    Qdrant       │
│   (Claude/AI)   │     │    Server       │     │   Vector DB     │
└─────────────────┘     └────────┬────────┘     └─────────────────┘
                                 │
                                 ▼
                        ┌─────────────────┐
                        │   Embedding     │
                        │   Provider      │
                        │ (local/openai)  │
                        └─────────────────┘
```

## License

MIT License - see [LICENSE](LICENSE)

## Contributing

Contributions welcome! Please read our contributing guidelines.

## Credits

Built by [OpenClaw](https://openclaw.ai) - AI agents that actually work.
