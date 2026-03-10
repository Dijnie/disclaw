# Project Changelog

All significant changes to the DisClaw project are documented here.

**Format**: [YYYY-MM-DD] | Type | Description

---

## [2026-03-10] Phase 1 Bootstrap Completion

**Type**: Major Release - Bootstrap Complete

### Packages Implemented

- **@disclaw/types** - Shared TypeScript interfaces and type definitions
  - InboundContext for Discord events
  - SessionContext for session state management
  - ToolDefinition for tool registry
  - ConfigTypes for configuration

- **@disclaw/config** - Configuration management with hot-reload
  - ConfigLoader with YAML parsing and env var interpolation
  - ConfigWatcher for real-time config updates
  - Zod-based schema validation
  - Environment variable overlay support

- **@disclaw/bot** - Discord provider using discord.js v14+
  - DiscordJsProvider for Bot API integration
  - AllowlistFilter for guild/channel/user filtering
  - MessageSender for reply handling
  - SessionKeyBuilder for scope-based routing
  - SelfbotProvider stub for Phase 3

- **@disclaw/gateway** - Central control plane
  - Gateway orchestrator
  - EventRouter for message routing to sessions
  - SessionManager for conversation state persistence
  - CronScheduler for job execution
  - HeartbeatTimer for periodic checks
  - ConfigManager for hot-reload integration
  - WebSocket server stub for future RPC

- **@disclaw/agent** - Agent loop runtime with LLM integration
  - AgentLoop orchestrator
  - ContextAssembler for loading memory + history
  - ToolExecutor for tool invocation
  - StreamHandler for token-by-token response
  - ErrorHandler with retry logic
  - Anthropic SDK integration

- **@disclaw/memory** - Markdown memory system with SQLite indexing
  - MemorySystem orchestrator
  - MemoryLoader for reading SOUL.md/AGENTS.md/MEMORY.md
  - MemoryWriter for persistence
  - VectorIndexer with SQLite backend
  - FileWatcher for incremental index updates
  - MemorySearchTool and MemoryGetTool

- **@disclaw/tools** - Built-in tool implementations
  - ToolRegistry for tool management
  - BashTool for command execution
  - BrowserTool for web automation
  - FileTool for I/O operations
  - CanvasTool for image generation
  - CronTool for job scheduling
  - GitTool for version control
  - MemoryTools integration

- **@disclaw/skills** - Skill loader and injector
  - SkillLoader for SKILL.md discovery
  - SkillInjector for context injection
  - YAML frontmatter parsing
  - Bundled skills directory

- **@disclaw/sandbox** - Docker sandbox isolation
  - SandboxManager for container orchestration
  - ContainerConfig with security settings
  - PathValidator for path escape prevention
  - ResourceLimits (CPU, memory, timeout)
  - ApprovalGate for dangerous operations
  - AuditLog for security events

- **apps/bot** - Main application entry point
  - Bootstrap initialization
  - ShutdownHandler for graceful shutdown
  - CLI startup logic

### Documentation

- **system-architecture.md** - Comprehensive system architecture (455 lines)
  - High-level system diagram
  - Component responsibilities
  - Data flow walkthrough
  - Configuration and startup sequence
  - Session management
  - Memory layers
  - Tool execution model
  - LLM integration
  - Scheduling and automation
  - Security model
  - Error handling and retry
  - Deployment architecture
  - Key design decisions

- **code-standards.md** - Development standards (703 lines)
  - Language and type safety (TypeScript strict mode)
  - File naming (kebab-case)
  - Naming conventions (camelCase, PascalCase)
  - Code organization and file size limits
  - Comments and documentation standards
  - Error handling patterns
  - Testing strategy
  - Linting and formatting rules
  - Async/await patterns
  - Performance considerations
  - Security best practices

- **codebase-summary.md** - Monorepo structure and packages
  - Current state assessment
  - Monorepo directory layout
  - Workspace configuration
  - Package descriptions and status
  - Dependencies (production and development)
  - Runtime directory layout
  - Git configuration
  - Testing strategy

- **project-overview-pdr.md** - Project vision and requirements
  - Vision statement
  - Target users (primary and secondary)
  - Core features (MVP + Phase 2 + Phase 3)
  - MVP scope definition
  - Success metrics
  - Non-functional requirements
  - Technology decisions
  - Architecture highlights
  - Deployment model
  - Project phases
  - Risk and mitigation
  - Open questions

### Technology Stack

- **Language**: TypeScript 5.9.2
- **Runtime**: Node.js 18+
- **Monorepo**: Turborepo + Yarn 4.13.0
- **Discord**: discord.js v14+
- **Database**: better-sqlite3 for memory indexing
- **Config**: js-yaml + zod
- **LLM**: Anthropic SDK (Claude Sonnet/Opus)
- **Sandbox**: Docker with resource limits
- **Build**: tsc (TypeScript compiler)

### Key Features Implemented

- [x] Discord integration with guild/channel/user filtering
- [x] Central gateway with event routing and session management
- [x] Agent loop with context assembly and tool execution
- [x] Markdown-based memory system with SQLite vector indexing
- [x] Tool registry with 8 built-in tools
- [x] Docker sandbox with fail-closed security
- [x] YAML configuration with hot-reload
- [x] Heartbeat system for periodic checks
- [x] Cron scheduler for job execution
- [x] Skill system for extensibility
- [x] Approval workflows for dangerous operations

### Development Infrastructure

- TypeScript strict mode enabled
- ESLint configuration
- Turborepo build caching
- Workspace dependencies via `workspace:*` protocol
- Per-package build and lint scripts
- Source maps for debugging

### Documentation Quality

- Comprehensive architecture documentation (8 detailed design docs)
- Code standards with examples
- Clear separation of concerns
- Type-safe configuration
- Security guidelines

---

## [2026-03-10] Documentation Updates

**Type**: Documentation

- Updated `codebase-summary.md` to reflect Phase 1 bootstrap completion
- Created `development-roadmap.md` with phased timeline
- Created `project-changelog.md` (this file)
- Added package descriptions and implementation status
- Documented actual runtime directory structure
- Updated testing strategy with framework and coverage targets
- Updated dependencies section with actual production packages

---

## Planned Changes (Future Phases)

### Phase 2 (April-June 2026)
- Skills system expansion
- Multi-provider LLM support (OpenAI, Gemini, DeepSeek)
- Performance optimization
- Developer experience improvements

### Phase 3 (July-September 2026)
- Multi-agent teams
- Selfbot provider
- Web dashboard
- MCP protocol support

### Phase 4+ (October 2026+)
- Cloud deployment
- Skill marketplace
- Plugin ecosystem
- Model fine-tuning

---

## Migration Notes

No breaking changes in Phase 1 (initial release).

---

## Dependencies Updated

Initial implementation includes:

```json
{
  "devDependencies": {
    "typescript": "5.9.2",
    "@typescript-eslint/parser": "latest",
    "@disclaw/eslint-config": "workspace:*",
    "@disclaw/typescript-config": "workspace:*",
    "turbo": "latest"
  },
  "production": {
    "discord.js": "14.x",
    "@anthropic-ai/sdk": "^0.78.0",
    "better-sqlite3": "latest",
    "js-yaml": "latest",
    "zod": "latest"
  }
}
```

---

## Known Issues & Limitations

### Phase 1 MVP
1. **Single-instance only** - One agent per deployment (horizontal scaling in Phase 3)
2. **No web dashboard** - Configuration via YAML files (web UI in Phase 3)
3. **Selfbot not implemented** - discord.js Bot API only (selfbot.js in Phase 3)
4. **No MCP support** - Standard tool interface only
5. **Limited skill library** - Basic skills included (expanded in Phase 2)

### Testing
- Test suite structure scaffolded; comprehensive tests in Phase 2

### Documentation
- Minor gaps in detailed API reference (to be completed)

---

## Credits

Phase 1 Bootstrap completed by the DisClaw development team.

---

## Version History

| Version | Date | Status |
|---------|------|--------|
| 0.0.1 | 2026-03-10 | Phase 1 Bootstrap Complete |
| 0.0.0 | 2026-02-xx | Initial scaffolding |

---

## Next Steps

1. **Phase 2 Planning** - Begin skills system enhancement
2. **Test Suite Expansion** - Achieve 80%+ coverage
3. **Community Feedback** - Gather early adopter feedback
4. **Performance Baseline** - Establish response time metrics
5. **Security Audit** - Third-party security review

---

## Cross-References

- [development-roadmap.md](./development-roadmap.md) — Project timeline
- [project-overview-pdr.md](./project-overview-pdr.md) — Project scope
- [system-architecture.md](./system-architecture.md) — Architecture details
- [codebase-summary.md](./codebase-summary.md) — Codebase structure
