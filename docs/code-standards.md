# Code Standards

Development standards for the DisClaw project ensuring code quality, maintainability, and consistency across the monorepo.

---

## 1. Language & Type Safety

### TypeScript

All code in `src/` directories uses TypeScript with strict mode enabled.

```json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitThis": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "alwaysStrict": true
  }
}
```

### No `any` Type

Use explicit types instead of `any`:

```typescript
// Bad
const data: any = JSON.parse(str);

// Good
interface ParsedData {
  userId: string;
  name: string;
}
const data: ParsedData = JSON.parse(str);
```

---

## 2. File Naming & Organization

### File Names

Use **kebab-case** for all code files. Names should be self-documenting:

```
Good:
  src/discord-js-provider.ts
  src/event-router.ts
  src/memory-search-tool.ts
  src/sandbox-manager.ts

Bad:
  src/provider.ts          (ambiguous)
  src/router.ts            (which router?)
  src/tool.ts              (which tool?)
  src/manager.ts           (what is managed?)
```

### Directory Structure

Organize by feature/concern, not by file type:

```
src/
├── types/
│   ├── inbound-context.ts
│   ├── session-context.ts
│   └── ...
├── loaders/
│   ├── config-loader.ts
│   ├── skill-loader.ts
│   └── ...
├── tools/
│   ├── bash-tool.ts
│   ├── browser-tool.ts
│   └── ...
└── index.ts              # Main exports
```

### File Size Limits

Keep individual code files **under 200 lines**:

- **0-100 lines**: Single utility or simple component
- **100-200 lines**: Moderate complexity with one main responsibility
- **200+ lines**: Split into smaller focused modules

**When to split**:

```typescript
// Too long (250 lines) - split into modules
class AgentLoop {
  // Initialization (50 lines)
  // Context assembly (60 lines)
  // LLM calling (70 lines)
  // Tool execution (50 lines)
  // Reply streaming (20 lines)
}

// After split
class AgentLoop {
  constructor(
    private contextAsm: ContextAssembler,
    private llm: LLMProvider,
    private toolExec: ToolExecutor,
  ) {}

  async run(ctx: SessionContext): Promise<void> {
    const context = await this.contextAsm.assemble(ctx);
    const response = await this.llm.chat(context);
    const results = await this.toolExec.execute(response.toolCalls);
    // ...
  }
}
```

---

## 3. Naming Conventions

### Variables & Functions

Use **camelCase**:

```typescript
// Good
const sessionKey = "...";
const maxRetries = 3;
function loadMemoryFile(filename: string): Promise<string>;

// Bad
const session_key = "...";
const MAX_RETRIES = 3;
function load_memory_file(filename: string): Promise<string>;
```

### Classes & Interfaces

Use **PascalCase**:

```typescript
// Good
class MemorySystem {}
interface InboundContext {}
enum SandboxRuntime {}

// Bad
class memory_system {}
interface inboundContext {}
```

### Constants

Use **SCREAMING_SNAKE_CASE** only for true constants (never change):

```typescript
// Good - true constants
const DEFAULT_HEARTBEAT_INTERVAL_MS = 30 * 60 * 1000;
const DISCORD_MESSAGE_MAX_LENGTH = 2000;

// Bad - should be const in config
const defaultTemperature = 0.7;  // Should be in config, not code

// Good - config values are camelCase
const config = {
  defaultTemperature: 0.7,
  maxRetries: 3,
};
```

### Abbreviations

Avoid abbreviations. Spell out full words:

```typescript
// Good
const messageId = "...";
const sandboxManager = new SandboxManager();
const isApprovalRequired = true;

// Bad
const msgId = "...";
const sbxMgr = new SandboxMgr();
const needsApprov = true;
```

---

## 4. Code Organization

### Module Structure

Each package follows a consistent structure:

```typescript
// src/index.ts - Main exports
export { MemorySystem } from './memory-system';
export { MemoryLoader } from './memory-loader';
export type { MemoryConfig, MemoryFile } from './types';

// src/memory-system.ts - Main class
export class MemorySystem {
  constructor(private config: MemoryConfig) {}

  async search(query: string): Promise<SearchResult[]> {
    // Implementation
  }
}

// src/types.ts - Type definitions
export interface MemoryConfig {
  workspace: string;
  enableVectorIndex: boolean;
}

export interface MemoryFile {
  filename: string;
  content: string;
  lastModified: Date;
}
```

### Function Length

Keep functions **under 50 lines** (excluding comments):

```typescript
// Too long (100 lines)
async function processMessage(event: InboundContext) {
  // 100 lines of logic
}

// Better - split into focused functions
async function processMessage(event: InboundContext) {
  const context = await assembleContext(event);
  const response = await callLLM(context);
  await executeTools(response.toolCalls);
  await persistToMemory(context, response);
}

async function assembleContext(event: InboundContext): Promise<Context> {
  // 20 lines
}

async function callLLM(context: Context): Promise<LLMResponse> {
  // 15 lines
}
```

---

## 5. Comments & Documentation

### Inline Comments

Explain **why**, not what:

```typescript
// Bad - restates code
const timeout = 30000;  // Set timeout to 30000

// Good - explains reasoning
const timeout = 30000;  // 30s allows for slow LLM API responses

// Good - explains non-obvious logic
const adjusted = Math.min(base * Math.pow(2, attempt - 1), maxDelay);
// Exponential backoff with cap to prevent excessive wait times
```

### Function Documentation

Use JSDoc for public APIs:

```typescript
/**
 * Search memory for relevant context using semantic similarity.
 *
 * @param query - Natural language search query
 * @param limit - Maximum number of results (default: 5)
 * @returns Array of matching memory chunks with similarity scores
 * @throws MemoryIndexError if index is unavailable
 */
export async function searchMemory(
  query: string,
  limit: number = 5,
): Promise<MemoryChunk[]> {
  // Implementation
}
```

### Class Documentation

Document public methods and important properties:

```typescript
/**
 * Manages conversation state and persistence for a single session.
 *
 * Each session corresponds to a unique guild/channel/user combination.
 * Session state includes conversation history, metadata, and cached context.
 */
export class SessionManager {
  /**
   * Load a session from disk, creating if it doesn't exist.
   *
   * @param sessionKey Unique identifier (e.g., "agent:{agentId}:guild:{guildId}")
   * @returns Session state
   */
  async getOrCreate(sessionKey: string): Promise<SessionState> {
    // Implementation
  }
}
```

---

## 6. Error Handling

### Custom Error Classes

Create domain-specific error classes:

```typescript
// Good
export class SandboxError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = 'SandboxError';
  }
}

export class MemoryIndexError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MemoryIndexError';
  }
}

// Usage
try {
  await executeInSandbox(command);
} catch (error) {
  if (error instanceof SandboxError) {
    logger.error(`Sandbox failed: ${error.code}`);
  }
}
```

### Try-Catch Best Practices

```typescript
// Bad - swallows errors silently
try {
  await processMessage(event);
} catch {}

// Good - logs and handles appropriately
try {
  await processMessage(event);
} catch (error) {
  if (error instanceof NetworkError) {
    logger.warn('Network error, will retry', { error });
    await retry(() => processMessage(event));
  } else {
    logger.error('Unexpected error', { error });
    await sendErrorReply(event, 'Something went wrong');
  }
}
```

---

## 7. Testing

### Test Structure

One test file per source file:

```
src/memory-system.ts        → tests/memory-system.test.ts
src/tools/bash-tool.ts      → tests/tools/bash-tool.test.ts
```

### Test Naming

Test names should clearly describe what is being tested:

```typescript
// Good
describe('MemorySystem', () => {
  it('should return empty results when no matches found', async () => {
    // Test
  });

  it('should handle special characters in search queries', async () => {
    // Test
  });

  it('should respect similarity threshold', async () => {
    // Test
  });
});

// Bad
describe('MemorySystem', () => {
  it('works', async () => { /* ... */ });
  it('test search', async () => { /* ... */ });
  it('test 2', async () => { /* ... */ });
});
```

### Assertion Style

Use clear assertions:

```typescript
// Good - explicit assertions
expect(result).toEqual([{ filename: 'MEMORY.md', similarity: 0.95 }]);
expect(result).toHaveLength(1);
expect(result[0].similarity).toBeGreaterThan(0.8);

// Bad - vague assertions
expect(result).toBeTruthy();
expect(result.length).toBeGreaterThan(0);
```

### Test Coverage

Target **>80% coverage** for MVP:

```bash
# Run coverage report
yarn test --coverage

# Should report:
# Statements    : 82.5% ( 165/200 )
# Branches      : 78.2% ( 86/110 )
# Functions     : 85.0% ( 51/60 )
# Lines         : 83.1% ( 112/135 )
```

---

## 8. Linting & Formatting

### ESLint Configuration

Use shared `@htlabs/eslint-config`:

```json
{
  "extends": ["@htlabs/eslint-config"],
  "rules": {
    "no-console": ["warn", { "allow": ["warn", "error"] }],
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-types": "warn"
  }
}
```

### Prettier Configuration

Format with Prettier (included in eslint-config):

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

### Pre-commit Checks

Before committing, run:

```bash
# Lint
yarn lint

# Type-check
yarn typecheck

# Test
yarn test

# Build (verify compilation)
yarn build
```

---

## 9. Async/Await

Always use async/await instead of `.then()`:

```typescript
// Good
async function processEvent(event: InboundContext): Promise<void> {
  const context = await assembleContext(event);
  const response = await callLLM(context);
  await persistReply(response);
}

// Bad - harder to read, more error-prone
function processEvent(event: InboundContext): Promise<void> {
  return assembleContext(event)
    .then(context => callLLM(context))
    .then(response => persistReply(response))
    .catch(error => logger.error('Failed', error));
}
```

---

## 10. No Magic Numbers

Extract constants for clarity:

```typescript
// Bad - magic numbers
const backoffMs = Math.min(
  BASE_DELAY * Math.pow(2, attempt - 1),
  30000
);

// Good - named constant
const MAX_BACKOFF_MS = 30000;
const backoffMs = Math.min(
  BASE_DELAY * Math.pow(2, attempt - 1),
  MAX_BACKOFF_MS
);
```

---

## 11. Type-Safe Configuration

Always type your configuration objects:

```typescript
// Good - typed config
interface GatewayConfig {
  port: number;
  host: string;
  heartbeat: {
    enabled: boolean;
    intervalMs: number;
  };
}

const config: GatewayConfig = loadConfig();

// Bad - untyped config
const config = loadConfig();
const port = config['port'];  // Could be wrong
```

---

## 12. Commit Message Format

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code formatting
- `refactor`: Code restructuring (no feature change)
- `perf`: Performance improvement
- `test`: Test additions/updates
- `chore`: Dependencies, CI, build scripts

### Examples

```
feat(agent-loop): implement context assembly

Implement ContextAssembler class that loads session history,
memory files, and skills into a unified context for LLM calls.

Closes #42

---

fix(memory-system): resolve race condition on concurrent writes

Add mutex lock around MEMORY.md writes to prevent concurrent
modification issues when multiple sessions run in parallel.

Fixes #58

---

docs(security): update sandbox documentation

Add detailed explanation of Docker isolation and failure modes.
```

---

## 13. Performance Considerations

### Avoid N+1 Queries

Load all needed data at once:

```typescript
// Bad - N+1: loads memory index on every tool call
for (const toolCall of toolCalls) {
  const index = await loadMemoryIndex(agentId);  // N+1!
  const results = await index.search(query);
}

// Good - load once, reuse
const index = await loadMemoryIndex(agentId);
for (const toolCall of toolCalls) {
  const results = await index.search(query);  // Reuse
}
```

### Lazy Load Large Resources

```typescript
// Good - lazy load
class MemorySystem {
  private index?: SQLiteIndex;

  async search(query: string): Promise<SearchResult[]> {
    if (!this.index) {
      this.index = await this.loadIndex();
    }
    return this.index.search(query);
  }
}
```

---

## 14. Security Best Practices

### Never Log Secrets

```typescript
// Bad
logger.info('Calling LLM', { apiKey: config.apiKey });

// Good
logger.info('Calling LLM', { provider: config.provider });
```

### Validate All Inputs

```typescript
// Bad
async function readFile(path: string): Promise<string> {
  return fs.readFile(path, 'utf-8');  // Path could be /etc/passwd
}

// Good
async function readFile(path: string): Promise<string> {
  if (!validatePath(path)) {
    throw new Error('Invalid path');
  }
  return fs.readFile(path, 'utf-8');
}

function validatePath(path: string): boolean {
  const absolute = resolvePath(path);
  return absolute.startsWith(WORKSPACE_DIR);
}
```

---

## Cross-References

- [project-overview-pdr.md](./project-overview-pdr.md) — Project requirements
- [codebase-summary.md](./codebase-summary.md) — Monorepo structure
- [system-architecture.md](./system-architecture.md) — Architecture overview
