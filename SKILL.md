# Memory Skill

Access the persistent memory system powered by Qdrant vector database.

## Tools Available

| Tool | Description |
|------|-------------|
| `memory_add` | Store a memory with auto-categorization |
| `memory_search` | Semantic search across all memories |
| `memory_list` | Browse memories by type, tags, project |
| `memory_forget` | Delete a memory by ID |
| `memory_profile` | Get/set user preferences |
| `memory_link` | Link related memories |

## Usage

Use the mcporter CLI to call memory tools:

```bash
mcporter call memory.memory_add content="your memory" type="knowledge"
mcporter call memory.memory_search query="search terms"
mcporter call memory.memory_list limit=10
```

## Memory Types

- `knowledge` - Facts and information
- `decision` - Choices made and rationale
- `pattern` - Recurring behaviors or solutions
- `preference` - User preferences
- `context` - Situational context
- `debug` - Debug notes and solutions
- `auto` - Auto-detect type (default)

## Best Practices

1. Store important decisions with rationale
2. Link related memories for context
3. Use consistent project names
4. Tag memories for easier filtering
5. Set importance (0-1) for prioritization
