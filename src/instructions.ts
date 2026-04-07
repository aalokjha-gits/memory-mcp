import { Config, EMBEDDING_DEFAULTS, EmbeddingProvider } from './config.js';

function getMaxWords(provider: EmbeddingProvider): number {
  const maxTokens = EMBEDDING_DEFAULTS[provider]?.maxTokens ?? 512;
  // Rough token-to-word ratio: 1 token ≈ 0.75 words
  return Math.floor(maxTokens * 0.75);
}

export function generateInstructions(config: Config): string {
  const maxWords = getMaxWords(config.embedding.provider);

  return `# Memory MCP — Agent Instructions

## When to Use Memory

**Search memory FIRST** when:
- Starting a new session or conversation
- Working on a project you may have touched before
- About to make an architecture or design decision
- Debugging something that might have been debugged before
- Needing to recall user preferences, conventions, or past decisions

**Store to memory** when:
- You make or discover a decision and its rationale
- You find a key debugging insight or root cause
- You learn infrastructure details (IPs, configs, endpoints, credentials context)
- You discover user preferences or project conventions
- You complete a significant piece of work (store a session summary)
- You find recurring patterns in a codebase

**Link memories** when:
- A newly stored memory relates to an existing one (check search results after storing)
- You discover a connection between two topics during your work

## How to Store Effective Memories

- **Keep each memory under ${maxWords} words** (current embedding model: ${config.embedding.model}, context window: ${EMBEDDING_DEFAULTS[config.embedding.provider]?.maxTokens} tokens). Longer content degrades search quality.
- If you have more to store, **split into multiple focused memories** — one topic per memory.
- Always set \`type\` to the most specific category: knowledge, decision, pattern, preference, context, or debug. Use "auto" only when unsure.
- Use \`tags\` for searchability — short, consistent tag names (e.g., "auth", "database", "deployment").
- Set \`project\` to the project name for filtering across multi-project work.
- Leave \`importance\` at 0 for auto-scoring, or override to 0.9+ for critical items.

## Memory Types

| Type | Use For |
|------|---------|
| knowledge | Facts, configs, IPs, API endpoints, how things work |
| decision | Choices made and why — "chose X over Y because Z" |
| pattern | Recurring solutions, conventions, best practices found in code |
| preference | User likes/dislikes, communication style, tool preferences |
| context | What was built, current state of work, session summaries |
| debug | Bug root causes, error resolutions, troubleshooting steps |

## Cross-Tool Workflow

1. \`memory_search\` → Check for existing context before starting work
2. \`memory_add\` → Store findings as you work (don't batch at the end)
3. \`memory_search\` → After storing, related memories are auto-linked (similarity > 0.7)
4. \`memory_link\` → Manually link memories when you see connections the auto-linker missed
5. \`memory_profile\` → Store persistent user preferences (key-value, not semantic)

## Constraints

- Embedding model: ${config.embedding.model} (${config.embedding.dimensions} dimensions, ${EMBEDDING_DEFAULTS[config.embedding.provider]?.maxTokens} token context)
- Storage: ${config.vectordb.provider}${config.vectordb.provider === 'local' ? ' (file-based at ~/.memory-mcp/)' : ''}
- Auto-linking threshold: similarity > 0.7
- Memories are never automatically deleted — use \`memory_forget\` explicitly`;
}
