# Codebase Summary

## Current State

DisClaw is in **MVP Bootstrap Complete** phase (Phase 1). All core packages have been scaffolded with initial implementations:

- **@disclaw/types** - Shared TypeScript types
- **@disclaw/config** - YAML configuration with env interpolation and hot-reload
- **@disclaw/bot** - Discord provider (discord.js v14+)
- **@disclaw/gateway** - Central event router, session manager, cron, heartbeat
- **@disclaw/agent** - Agent loop with Anthropic SDK integration
- **@disclaw/memory** - Markdown memory system with SQLite vector indexing
- **@disclaw/tools** - Tool registry with 8 built-in tools
- **@disclaw/skills** - Skill loader and injector
- **@disclaw/sandbox** - Docker sandbox with fail-closed security
- **apps/bot** - Main entry point

---

## 1. Monorepo Structure

```
disclaw/
├── .claude/                         # Claude Code configuration & rules
├── .git/                            # Git repository
├── .github/                         # GitHub workflows (future: CI/CD)
├── apps/
│   └── bot/                         # Main application entry point
│       ├── src/
│       │   ├── bootstrap.ts         # Initialization and startup
│       │   ├── index.ts             # Main exports
│       │   └── shutdown-handler.ts  # Graceful shutdown
│       ├── package.json
│       ├── tsconfig.json
│       └── eslint.config.js
│
├── packages/
│   ├── types/                       # Shared TypeScript types
│   │   └── src/
│   │       ├── config-types.ts
│   │       ├── index.ts
│   │       ├── inbound-context.ts
│   │       ├── session-context.ts
│   │       ├── tool-types.ts
│   │       └── types.ts
│   │
│   ├── config/                      # Config loading & hot-reload
│   │   └── src/
│   │       ├── config-defaults.ts
│   │       ├── config-loader.ts
│   │       ├── config-schema.ts
│   │       ├── config-watcher.ts
│   │       └── index.ts
│   │
│   ├── bot/                         # Discord provider (discord.js)
│   │   └── src/
│   │       ├── allowlist-filter.ts
│   │       ├── discord-js-provider.ts
│   │       ├── index.ts
│   │       ├── message-sender.ts
│   │       ├── provider-interface.ts
│   │       ├── selfbot-provider-stub.ts
│   │       └── session-key-builder.ts
│   │
│   ├── gateway/                     # Central control plane
│   │   └── src/
│   │       ├── config-manager.ts
│   │       ├── cron-scheduler.ts
│   │       ├── event-router.ts
│   │       ├── gateway.ts
│   │       ├── heartbeat-timer.ts
│   │       ├── index.ts
│   │       ├── session-manager.ts
│   │       └── ws-server.ts
│   │
│   ├── agent/                       # Agent loop runtime
│   │   └── src/
│   │       ├── agent-loop.ts
│   │       ├── context-assembler.ts
│   │       ├── error-handler.ts
│   │       ├── index.ts
│   │       ├── stream-handler.ts
│   │       └── tool-executor.ts
│   │
│   ├── memory/                      # Memory system (Markdown + SQLite)
│   │   └── src/
│   │       ├── file-watcher.ts
│   │       ├── index.ts
│   │       ├── memory-get-tool.ts
│   │       ├── memory-loader.ts
│   │       ├── memory-search-tool.ts
│   │       ├── memory-system.ts
│   │       ├── memory-writer.ts
│   │       ├── types.ts
│   │       └── vector-indexer.ts
│   │
│   ├── tools/                       # Tool registry & implementations
│   │   └── src/
│   │       ├── bash-tool.ts
│   │       ├── browser-tool.ts
│   │       ├── canvas-tool.ts
│   │       ├── cron-tool.ts
│   │       ├── file-tool.ts
│   │       ├── git-tool.ts
│   │       ├── index.ts
│   │       ├── memory-tools.ts
│   │       └── tool-registry.ts
│   │
│   ├── skills/                      # Skill loader & injector
│   │   └── src/
│   │       ├── bundled-skills/
│   │       ├── index.ts
│   │       ├── skill-injector.ts
│   │       └── skill-loader.ts
│   │
│   ├── sandbox/                     # Docker sandbox isolation
│   │   └── src/
│   │       ├── approval-gate.ts
│   │       ├── audit-log.ts
│   │       ├── container-config.ts
│   │       ├── error-handler.ts
│   │       ├── index.ts
│   │       ├── path-validator.ts
│   │       ├── resource-limits.ts
│   │       └── sandbox-manager.ts
│   │
│   ├── eslint-config/               # Shared ESLint config
│   │   ├── base.js
│   │   ├── next.js
│   │   ├── react-internal.js
│   │   ├── package.json
│   │   └── README.md
│   │
│   ├── typescript-config/           # Shared TypeScript config
│   │   ├── base.json
│   │   ├── package.json
│   │   └── README.md
│   │
│   └── ui/                          # React UI components (legacy)
│       └── [archived for future use]
│
├── docs/                            # Project documentation
│   ├── project-overview-pdr.md
│   ├── codebase-summary.md          # This file
│   ├── code-standards.md
│   ├── system-architecture.md
│   └── disclaw/                     # Detailed design docs (00-08)
│
├── plans/                           # Planning & reports
│   └── reports/                     # Generated reports
│
├── .gitignore
├── .npmrc
├── .yarnrc.yml
├── CLAUDE.md                        # Project Claude Code guidance
├── README.md                        # Project README
├── package.json                     # Root workspace
├── turbo.json                       # Turborepo configuration
└── yarn.lock                        # Dependency lock file
```

---

## 2. Workspace Configuration

### package.json (Root)

Root workspace configures Turborepo monorepo:

```json
{
  "name": "disclaw",
  "version": "0.0.1",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "lint": "turbo run lint"
  },
  "devDependencies": {
    "@disclaw/eslint-config": "workspace:*",
    "@disclaw/typescript-config": "workspace:*",
    "turbo": "latest"
  }
}
```

### Package Scripts (Per Package)

All packages follow standard build pattern:

```json
{
  "scripts": {
    "build": "tsc",
    "check-types": "tsc --noEmit",
    "lint": "eslint ."
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

## 3. Implemented Packages

All 10 core packages have been scaffolded with initial implementations:

### @disclaw/types
Shared TypeScript interfaces for the entire system.
- **Status**: Implemented
- **Key Types**: InboundContext, SessionContext, ToolDefinition, ConfigTypes
- **Dependencies**: None (foundational)

### @disclaw/config
YAML configuration with environment variable interpolation and hot-reload.
- **Status**: Implemented
- **Key Classes**: ConfigLoader, ConfigWatcher, ConfigSchema
- **Features**: Hot-reload support, Zod schema validation, env var overlay
- **Dependencies**: @disclaw/types

### @disclaw/bot
Discord provider using discord.js v14+.
- **Status**: Implemented
- **Key Classes**: DiscordJsProvider, AllowlistFilter, MessageSender, SessionKeyBuilder
- **Features**: Guild/channel/user filtering, session-based routing
- **Dependencies**: @disclaw/types
- **Future**: SelfbotProvider stub for phase 3

### @disclaw/gateway
Central control plane for event routing, session management, cron, heartbeat.
- **Status**: Implemented
- **Key Classes**: Gateway, EventRouter, SessionManager, CronScheduler, HeartbeatTimer
- **Features**: Event routing by scope, cron job execution, periodic heartbeats
- **Dependencies**: @disclaw/types, @disclaw/bot, @disclaw/config

### @disclaw/agent
Agent loop runtime with Anthropic SDK integration.
- **Status**: Implemented
- **Key Classes**: AgentLoop, ContextAssembler, ToolExecutor, StreamHandler, ErrorHandler
- **Features**: LLM integration, tool execution loop, token streaming
- **Dependencies**: @disclaw/types, @anthropic-ai/sdk

### @disclaw/memory
Markdown memory system with SQLite vector indexing.
- **Status**: Implemented
- **Key Classes**: MemorySystem, MemoryLoader, MemoryWriter, VectorIndexer, FileWatcher
- **Features**: File-based memory, semantic search via SQLite, incremental indexing
- **Dependencies**: @disclaw/types, better-sqlite3

### @disclaw/tools
Tool registry with 8 built-in tool implementations.
- **Status**: Implemented
- **Tools**: bash, browser, file, memory_search, memory_get, canvas, cron, git
- **Key Classes**: ToolRegistry, BashTool, BrowserTool, FileTool, etc.
- **Dependencies**: @disclaw/types, @disclaw/sandbox

### @disclaw/skills
Skill loader and injector system.
- **Status**: Implemented
- **Key Classes**: SkillLoader, SkillInjector
- **Features**: SKILL.md file discovery, YAML frontmatter parsing, context injection
- **Dependencies**: @disclaw/types

### @disclaw/sandbox
Docker sandbox isolation for safe tool execution.
- **Status**: Implemented
- **Key Classes**: SandboxManager, PathValidator, ResourceLimits, ApprovalGate, AuditLog
- **Features**: Fail-closed isolation, resource limits, path validation, approval workflows
- **Dependencies**: @disclaw/types, docker SDK

### apps/bot
Main application entry point combining all packages.
- **Status**: Implemented
- **Key Classes**: Bootstrap, ShutdownHandler
- **Features**: Application initialization, graceful shutdown, CLI startup
- **Dependencies**: All core packages

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

## 6. Core Dependencies

### Production Dependencies

| Package | Version | Purpose | Used By |
|---------|---------|---------|---------|
| discord.js | v14+ | Discord Bot API | @disclaw/bot |
| @anthropic-ai/sdk | ^0.78.0 | Anthropic Claude LLM | @disclaw/agent |
| better-sqlite3 | Latest | SQLite vector index | @disclaw/memory |
| js-yaml | Latest | YAML parsing | @disclaw/config |
| zod | Latest | Schema validation | @disclaw/config |
| dotenv | Latest | Env var loading | @disclaw/config |
| pino | Latest | Structured logging | All packages |
| uuid | Latest | Session identifiers | @disclaw/gateway |

### Development Dependencies (Shared)

| Package | Purpose |
|---------|---------|
| typescript | 5.9.2 |
| @typescript-eslint/parser | ESLint TypeScript |
| eslint-config-prettier | Prettier integration |
| jest | Testing framework |
| @types/node | Node.js types |

### Build Tools

| Tool | Purpose |
|------|---------|
| TypeScript Compiler (tsc) | Compile TS to JS |
| Turborepo | Monorepo orchestration |
| Yarn 4.13.0+ | Package manager |

### No External API Services (MVP)
- Discord API (external service)
- Anthropic API (external service)
- Docker daemon (local service required)

---

## 7. Runtime Directory Layout

When running DisClaw, the filesystem will contain:

```
~/.disclaw/                          # User's home directory
├── disclaw.config.yaml              # Main config file (YAML)
├── workspace/                       # Working directory for agent tasks
│   ├── temp/                        # Temporary files
│   ├── data/                        # Persistent data
│   ├── uploads/                     # User uploads
│   ├── reports/                     # Generated reports
│   └── scripts/                     # Custom scripts
│
├── agents/
│   └── {agentId}/                   # Per-agent directory
│       ├── SOUL.md                  # Agent personality (immutable)
│       ├── AGENTS.md                # Agent configuration
│       ├── MEMORY.md                # Long-term memory (updatable)
│       ├── HEARTBEAT.md             # Heartbeat checklist
│       ├── memory/                  # Daily logs (auto-created)
│       │   ├── 2026-03-01.md
│       │   ├── 2026-03-02.md
│       │   └── ...
│       └── skills/                  # Workspace skills
│           └── {skillName}/
│               └── SKILL.md
│
├── memory/
│   └── {agentId}.sqlite             # SQLite vector index
│
├── cron/
│   └── jobs.json                    # Job definitions + run history
│
├── sessions.json                    # Session state (auto-saved)
│
├── logs/                            # Application logs
│   ├── disclaw.log                  # Main application log
│   └── security.log                 # Security events
│
└── backup/                          # Auto-generated backups
    └── [timestamp]/                 # Dated backups
```

---

## 8. Git Configuration

### .gitignore

Excludes sensitive and generated files:

```
# Dependencies
node_modules/
yarn.lock
package-lock.json

# Build outputs
dist/
build/
*.tsbuildinfo

# Environment & secrets
.env
.env.local
.env.*.local

# IDE & tooling
.idea/
.vscode/
*.swp
*.swo
.DS_Store
Thumbs.db

# Logs
*.log
logs/

# Coverage & test artifacts
coverage/
.nyc_output/

# Generated files
repomix-output.xml
node_modules/.bin/

# Claude tools & local workspace
.claude/
CLAUDE.md
AGENTS.md
plans/

# Runtime files
sessions.json
*.sqlite
cron/jobs.json
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

## 9. Testing Strategy (MVP)

### Test Framework
- **Jest** for unit and integration tests
- **TypeScript** with strict type checking
- **ESLint** for code quality

### Test Coverage Target
Minimum **80% code coverage** for all packages.

### Unit Tests (Per Package)
- **@disclaw/types**: Type validation
- **@disclaw/config**: Config loading, schema validation, hot-reload
- **@disclaw/bot**: AllowlistFilter, SessionKeyBuilder, MessageSender
- **@disclaw/gateway**: EventRouter, SessionManager, CronScheduler
- **@disclaw/agent**: ContextAssembler, ToolExecutor, ErrorHandler
- **@disclaw/memory**: MemoryLoader, VectorIndexer, FileWatcher
- **@disclaw/tools**: Tool implementations (bash, browser, file, etc.)
- **@disclaw/sandbox**: PathValidator, ResourceLimits, SandboxManager
- **@disclaw/skills**: SkillLoader, SkillInjector

### Integration Tests
- Event flow: Discord → Gateway → Agent → Response
- Memory persistence across sessions
- Cron job execution and retry logic
- Hot-reload of config without restart
- Sandbox command execution with limits

### E2E Tests
- Full agent turn (message in → LLM call → tool use → response out)
- Memory loading and semantic search
- Skill injection into context
- Session isolation and parallel execution

### Test Commands

```bash
# Run all tests
yarn test

# Run tests with coverage
yarn test --coverage

# Run tests in watch mode
yarn test --watch

# Type checking
yarn typecheck

# Linting
yarn lint
```

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
