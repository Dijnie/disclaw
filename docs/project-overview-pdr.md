# Project Overview & PDR

## Project: DisClaw

**Self-hosted autonomous AI agent for Discord**

---

## 1. Vision

Enable Discord server administrators and developers to deploy their own AI agent that understands their community, automates repetitive tasks, and provides intelligent assistance — all running on their own infrastructure with full privacy and control.

---

## 2. Target Users

### Primary
- **Discord Server Admins**: Want to automate moderation, welcome new members, answer FAQs
- **Community Managers**: Need a bot to manage announcements, track activity, generate reports
- **Developers**: Want to extend Discord bots with AI capabilities (custom skills, tool integrations)

### Secondary
- **Self-hosted users**: Prefer running software on their own machines for privacy
- **Enterprise teams**: Need AI agents with custom security requirements

---

## 3. Core Features

### MVP (Phase 1)

- **Discord Integration**
  - Connect via discord.js (official Bot API)
  - Support for guilds, channels, DMs, threads
  - Guild/channel/user-based routing and isolation

- **Agent Loop**
  - Receive Discord messages/interactions
  - Assemble context from session history + memory
  - Call LLM (Anthropic, OpenAI-compatible)
  - Execute built-in tools (bash, browser, file, memory, cron)
  - Stream responses back to Discord

- **Memory System**
  - Markdown-based memory files (SOUL.md, AGENTS.md, MEMORY.md, daily logs)
  - SQLite vector indexing for semantic search
  - Per-session isolation to prevent race conditions

- **Tool System**
  - Built-in tools: bash, browser, file I/O, memory search, cron, git, canvas
  - Approval workflows for dangerous operations
  - Docker sandbox execution with fail-closed policy

- **Configuration**
  - YAML-based config with env var overlay
  - Hot-reload without restart
  - Allowlists for guilds/channels/users

- **Scheduling**
  - Heartbeat system (periodic checks, default 30 min)
  - Cron jobs (at, every, cron expressions)
  - Run logging and retry with exponential backoff

### Phase 2

- **Skills System**
  - Markdown-based skill definitions with YAML frontmatter
  - Skill discovery and injection into agent context
  - Community skill marketplace (local-first, optional hub)

- **Advanced LLM Features**
  - Extended thinking support
  - Multiple provider support (Anthropic, OpenAI, Gemini, DeepSeek, etc.)
  - Tool use and streaming optimization

- **Multi-Agent Support**
  - Agent-to-agent delegation
  - Agent teams with task coordination
  - Handoff workflows

### Phase 3 (Post-MVP)

- **User Account Support (Selfbotjs)**
  - User account-based Discord connection (against ToS)
  - Access to private channels and features unavailable to bot accounts

- **Web Dashboard**
  - UI for configuration management
  - Session history viewer
  - Memory editor
  - Job scheduling interface

- **Advanced Security**
  - MCP (Model Context Protocol) support
  - Fine-grained permission system
  - Audit logging and compliance

---

## 4. MVP Scope Definition

### In Scope (MVP)

| Component | Status |
|-----------|--------|
| Discord provider (discord.js) | Planned |
| Gateway (event routing, session mgmt) | Planned |
| Agent loop (context, LLM, tools) | Planned |
| Memory system (Markdown + SQLite) | Planned |
| Built-in tools (bash, browser, file, memory, cron, git, canvas) | Planned |
| Docker sandbox | Planned |
| Cron scheduler + heartbeat | Planned |
| YAML config + hot-reload | Planned |
| Approval workflows | Planned |
| Basic error handling | Planned |

### Out of Scope (Phase 2+)

- Skills system (placeholder reserved)
- Selfbotjs provider
- Web dashboard
- Multi-agent teams
- Advanced security (MCP, fine-grained RBAC)
- Cloud deployment templates

---

## 5. Success Metrics

### User Adoption
- **Target**: 100+ active self-hosted instances in first 6 months
- **Measure**: GitHub stars, Discord community members, issue reports

### Functionality
- **Target**: All MVP features production-ready with <5% critical bugs
- **Measure**: Test coverage >80%, zero critical CVEs

### Performance
- **Target**: Agent response <5 seconds (p95) under normal load
- **Measure**: Monitoring + benchmarks (1K messages/day per agent)

### Community
- **Target**: 20+ community-contributed skills by month 6
- **Measure**: Submissions to skill repository

---

## 6. Non-Functional Requirements

### Reliability
- Graceful restart (preserve session state)
- Automatic recovery from transient errors (retry logic)
- Cron job persistence across restarts

### Security
- Docker sandbox isolation for tool execution
- No secrets in config files (env vars only)
- Approval workflows for dangerous operations
- Audit logging for security events

### Performance
- Stream LLM responses (token-by-token) for perceived speed
- Lazy-load skills and memory files
- Parallel cron job execution with per-job lane concurrency

### Maintainability
- Clear separation of concerns (provider, gateway, runtime, memory, tools)
- Comprehensive documentation
- TypeScript strict mode
- Test coverage >80%

### Scalability
- Single-agent per instance (MVP)
- Horizontal: run multiple instances, one per guild
- Session history bounded (auto-archive old conversations)
- Memory index synced asynchronously

---

## 7. Technology Decisions

| Decision | Rationale |
|----------|-----------|
| **Turborepo monorepo** | Clean separation, shared types, easier maintenance |
| **TypeScript** | Type safety, better IDE support, easier refactoring |
| **discord.js** | Official, well-maintained, full feature parity |
| **Docker sandbox** | Fail-closed security, no host pollution |
| **Markdown memory** | Human-editable, transparent, version-control friendly |
| **YAML config** | Human-friendly, no compilation step, hot-reload |
| **Node.js** | Good async/await support, JavaScript ecosystem |

---

## 8. Architecture Highlights

### Hub-and-Spoke Gateway
Single always-on gateway process routes all Discord events to sessions. Inherited from OpenClaw, proven pattern.

### Markdown-Based State
All persistent state (memory, conversation history) stored as readable Markdown files. Enables human editing, transparency, and simple backups.

### Fail-Closed Sandbox
Docker sandbox required for tool execution. If unavailable, execution fails rather than silently falling back to host. Security over convenience.

### Stateless Agent Loop
Agent loop is pure function: given context, generate response. No hidden state. Enables parallel execution and replay.

### Extensible Skills System
Skills teach the agent new capabilities without code changes. Inspired by OpenClaw, compatible format for future skill portability.

---

## 9. Deployment Model

### Target Deployment
Self-hosted on user's own infrastructure:

```
User's Server
├─ Node.js process (DisClaw gateway + agent runtime)
├─ Docker daemon (for sandboxed tool execution)
├─ SQLite (memory index)
└─ Filesystem (config, memory files, workspace)
```

### Requirements
- **OS**: Linux (primary), macOS (development), Windows WSL2
- **Node.js**: 18+
- **Docker**: 20+ (for sandbox)
- **Disk**: 500MB minimum
- **Network**: Outbound HTTPS to Discord, LLM providers

### Setup Time
Target: <5 minutes from "git clone" to first message.

---

## 10. Project Phases

### Phase 1: MVP (3-4 months)
- Implement all core components (gateway, agent loop, memory, tools, sandbox)
- Basic error handling and retry logic
- Comprehensive documentation
- Initial test suite (>80% coverage)
- Public release (GitHub)

### Phase 2: Polish (2-3 months)
- Skills system implementation
- Multi-provider LLM support
- Performance optimization
- Community feedback integration
- Skill marketplace (local-first)

### Phase 3: Advanced Features (3-4 months)
- Multi-agent teams and delegation
- Selfbotjs provider
- Web dashboard
- MCP support
- Advanced RBAC and audit logging

### Phase 4+: Long-term
- Cloud deployment templates
- Managed hosting (optional)
- Plugin ecosystem
- LLM fine-tuning integration

---

## 11. Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Discord API rate limits | Can't serve high-volume guilds | Implement queue + backoff; document rate limits |
| LLM provider outages | Agent can't respond | Graceful degradation + fallback responses |
| Security vulnerability in sandbox | Could escape Docker | Regular security audits, depend on well-maintained images |
| Community skill quality | Bad skills confuse agent | Skill review process, confidence scores, usage analytics |
| Complexity of multi-tenancy | Hard to scale | MVP: single-agent per instance; multi-agent in Phase 3 |

---

## 12. Open Questions

1. **Skill Marketplace**: Should we build a centralized hub, or keep it decentralized (users share on GitHub)?
2. **Selfbotjs Support**: Is the user risk acceptable, or should we omit it entirely?
3. **Web Dashboard**: MVP needs? (monitoring, configuration UI, memory editor)
4. **Cloud Hosting**: Should we offer managed DisClaw as a service?
5. **Model Fine-Tuning**: Should agents be able to fine-tune their LLM on guild data?

---

## Cross-References

- [codebase-summary.md](./codebase-summary.md) — Current monorepo structure
- [code-standards.md](./code-standards.md) — Development standards
- [system-architecture.md](./system-architecture.md) — Detailed architecture overview
- [docs/disclaw/](./disclaw/) — Design documents (00-08)
