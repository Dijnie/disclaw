# Codebase Summary

## Current State

DisClaw is in **pre-implementation** phase. The monorepo contains only the Turborepo scaffold with default Next.js apps and shared packages. No DisClaw-specific code exists yet.

---

## 1. Monorepo Structure

```
disclaw/
├── .claude/                         # Claude Code configuration
├── .git/                            # Git repository
├── .github/                         # GitHub (future: CI/CD workflows)
├── apps/
│   ├── docs/                        # Next.js app (to be repurposed)
│   └── web/                         # Next.js app (to be repurposed)
├── packages/
│   ├── eslint-config/               # ESLint shared config
│   ├── typescript-config/           # TypeScript shared config
│   └── ui/                          # React UI component library
├── docs/                            # Documentation (this directory)
├── plans/                           # Planning & reports
├── .gitignore
├── .npmrc
├── .yarnrc.yml
├── CLAUDE.md                        # Claude Code guidance
├── README.md                        # Project README
├── package.json                     # Root workspace
├── turbo.json                       # Turborepo config
└── yarn.lock                        # Dependency lock
```

---

## 2. Workspace Configuration

### package.json

```json
{
  "name": "disclaw",
  "version": "0.0.1",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "@htlabs/eslint-config": "workspace:*",
    "@htlabs/typescript-config": "workspace:*",
    "turbo": "latest"
  }
}
```

### turbo.json

```json
{
  "globalDependencies": ["**/.env.local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"],
      "cache": false
    },
    "lint": {
      "outputs": [],
      "cache": false
    },
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

### .yarnrc.yml

```yaml
nodeLinker: node-modules
enableGlobalCache: false
```

---

## 3. Planned Package Structure

After implementation, the workspace will contain:

```
packages/
├── types/                           # Shared TypeScript types
│   └── src/
│       ├── inbound-context.ts       # Discord event normalized interface
│       ├── session-context.ts       # Session state & callbacks
│       ├── tool-types.ts            # Tool definitions
│       └── config-types.ts          # Configuration types
│
├── config/                          # Configuration management
│   └── src/
│       ├── config-loader.ts         # YAML + env var overlay
│       ├── config-schema.ts         # Validation schema
│       ├── config-watcher.ts        # Hot-reload
│       └── types.ts                 # Config TypeScript types
│
├── bot/                             # Discord provider
│   └── src/
│       ├── discord-js-provider.ts   # discord.js implementation
│       ├── selfbotjs-provider.ts    # Placeholder for future
│       ├── allowlist.ts             # Guild/channel/user filtering
│       ├── event-router.ts          # Route by scope
│       └── reply.ts                 # Send messages back
│
├── gateway/                         # Central control plane
│   └── src/
│       ├── gateway.ts               # Main orchestrator
│       ├── event-router.ts          # Route to sessions
│       ├── session-manager.ts       # Session state
│       ├── config-manager.ts        # Config hot-reload
│       ├── heartbeat.ts             # Periodic checks
│       ├── cron-scheduler.ts        # Job scheduling
│       └── ws-server.ts             # Optional: RPC interface
│
├── agent/                           # Agent loop runtime
│   └── src/
│       ├── agent-loop.ts            # Main loop orchestrator
│       ├── context-assembler.ts     # Assemble context
│       ├── tool-executor.ts         # Execute tools
│       ├── stream-handler.ts        # Stream responses
│       ├── error-handler.ts         # Error handling
│       └── session-context.ts       # SessionContext implementation
│
├── memory/                          # Memory system
│   └── src/
│       ├── memory-system.ts         # Main orchestrator
│       ├── memory-loader.ts         # Load Markdown files
│       ├── memory-writer.ts         # Write updates
│       ├── vector-indexer.ts        # SQLite + embeddings
│       ├── memory-search-tool.ts    # memory_search tool
│       ├── memory-get-tool.ts       # memory_get tool
│       └── file-watcher.ts          # Monitor changes
│
├── tools/                           # Built-in tools
│   └── src/
│       ├── tool-registry.ts         # Tool registry
│       ├── bash-tool.ts             # bash execution
│       ├── browser-tool.ts          # Browser automation
│       ├── file-tool.ts             # File I/O
│       ├── memory-tools.ts          # Memory search/get
│       ├── canvas-tool.ts           # Image/chart generation
│       ├── cron-tool.ts             # Scheduling
│       └── git-tool.ts              # Git operations
│
├── skills/                          # Skill system
│   └── src/
│       ├── skill-loader.ts          # Load SKILL.md files
│       ├── skill-injector.ts        # Inject into context
│       └── bundled-skills/          # Default skills
│           ├── web-research/
│           ├── daily-summary/
│           └── ...
│
├── sandbox/                         # Docker sandbox
│   └── src/
│       ├── sandbox-manager.ts       # Create/manage containers
│       ├── container-config.ts      # Security settings
│       ├── path-validator.ts        # Path escape prevention
│       ├── resource-limits.ts       # CPU/memory/timeout
│       ├── approval-gate.ts         # Approval workflows
│       ├── error-handler.ts         # Error handling
│       └── audit-log.ts             # Security logging
│
└── eslint-config/
    typescript-config/
    ui/
```

---

## 4. Key Configuration Files

### disclaw.config.yaml

Main configuration file (planned location: `~/.disclaw/disclaw.config.yaml`).

Example minimal config:

```yaml
provider:
  method: bot
  token: ${DISCORD_BOT_TOKEN}

agent:
  provider: anthropic
  model: claude-sonnet-4-20250514

gateway:
  heartbeat:
    interval: 30m

sandbox:
  enabled: true
  runtime: docker
```

See [07-configuration.md](./disclaw/07-configuration.md) for full reference.

### Environment Variables

Required:
```bash
DISCORD_BOT_TOKEN      # Discord bot token
ANTHROPIC_API_KEY      # Anthropic API key
```

Optional:
```bash
DISCLAW_CONFIG         # Config file path
DISCLAW_WORKSPACE      # Workspace directory
```

---

## 5. Build Configuration

### TypeScript (tsconfig.json)

Shared via `@htlabs/typescript-config`:

- Target: ES2020 (Node.js 18+)
- Module: ESM
- Strict mode: true
- Source maps: true
- Outdir: dist/

### ESLint

Shared via `@htlabs/eslint-config`:

- Base: eslint-config-prettier
- Parser: @typescript-eslint/parser
- Rules: Reasonable defaults, no style enforcement

### Build Commands

```bash
# Build all packages
yarn build

# Build specific package
yarn workspace @disclaw/agent build

# Watch mode
yarn dev

# Lint
yarn lint
```

---

## 6. Current Dependencies

### Root Level

```json
{
  "devDependencies": {
    "turbo": "latest",
    "@htlabs/eslint-config": "workspace:*",
    "@htlabs/typescript-config": "workspace:*"
  }
}
```

### Planned Dependencies (MVP)

| Package | Purpose | Category |
|---------|---------|----------|
| discord.js | Discord Bot API client | Core |
| node-fetch | HTTP client | Core |
| yaml | YAML parser | Core |
| dotenv | Env var loading | Core |
| sqlite3 | SQLite client | Core |
| docker | Docker API client | Core |
| pino | Logging | Utilities |
| typescript | Language | Dev |
| @types/node | Node types | Dev |
| jest | Testing | Dev |
| @typescript-eslint/parser | Linting | Dev |

---

## 7. Directory Layout (Runtime)

After setup, the filesystem will contain:

```
~/.disclaw/
├── disclaw.config.yaml              # Configuration
├── workspace/                        # Working directory
│   ├── temp/
│   ├── data/
│   ├── uploads/
│   ├── reports/
│   └── scripts/
│
├── agents/
│   └── main/                        # Default agent
│       ├── SOUL.md                  # Personality
│       ├── AGENTS.md                # Config
│       ├── MEMORY.md                # Long-term memory
│       ├── HEARTBEAT.md             # Checklist
│       ├── memory/                  # Daily logs
│       │   ├── 2026-03-01.md
│       │   ├── 2026-03-02.md
│       │   └── ...
│       └── skills/                  # Workspace skills
│           └── my-skill/
│               └── SKILL.md
│
├── memory/
│   └── main.sqlite                  # Vector index
│
├── cron/                            # Cron job store
│   └── jobs.json                    # Job definitions + run logs
│
├── logs/                            # Log files
│   ├── disclaw.log
│   └── security.log
│
└── sessions.json                    # Session state
```

---

## 8. Git Configuration

### .gitignore

Excludes:

```
node_modules/
dist/
build/
*.log
.env.local
.DS_Store
.idea/
.vscode/
coverage/
repomix-output.xml
.claude/
CLAUDE.md
AGENTS.md
plans/
```

### Commit Conventions

Follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add memory_search tool implementation
fix: resolve race condition in session manager
docs: update architecture documentation
test: add unit tests for sandbox isolation
chore: update dependencies
refactor: simplify event routing logic
```

---

## 9. Testing Strategy (Planned)

### Unit Tests

- Tool implementations (bash, browser, file)
- Context assembly logic
- Memory indexing
- Config loading
- Path validation

### Integration Tests

- Event → session → agent loop → Discord reply
- Memory persistence across sessions
- Cron job scheduling and execution
- Hot-reload of configuration

### E2E Tests

- Full agent turn (message → response)
- Skill injection and execution
- Sandbox isolation verification

### Coverage Target

Minimum 80% code coverage for MVP.

---

## 10. Documentation Organization

```
docs/
├── project-overview-pdr.md          # Project vision & requirements
├── codebase-summary.md              # This file
├── code-standards.md                # Development standards
├── system-architecture.md           # System-level architecture
├── codebase-summary.md              # Monorepo structure summary
│
└── disclaw/                         # Design documents (numbered)
    ├── 00-architecture-overview.md
    ├── 01-discord-provider.md
    ├── 02-gateway.md
    ├── 03-agent-runtime.md
    ├── 04-memory-system.md
    ├── 05-tools-skills-system.md
    ├── 06-scheduling-cron.md
    ├── 07-configuration.md
    └── 08-security-sandbox.md
```

---

## 11. Continuous Integration (Future)

Planned CI/CD workflows:

- **On Push**: Lint, type-check, test
- **On PR**: Lint, test, coverage, security scan
- **Release**: Build, publish to npm, create GitHub release
- **Scheduled**: Dependency updates, security audit

---

## Cross-References

- [project-overview-pdr.md](./project-overview-pdr.md) — Project scope & vision
- [code-standards.md](./code-standards.md) — Development standards
- [system-architecture.md](./system-architecture.md) — Architecture diagrams
- [disclaw/](./disclaw/) — Detailed design documents
