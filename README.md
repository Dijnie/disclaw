# DisClaw

**Self-hosted autonomous AI agent for Discord**

DisClaw is a TypeScript/Node.js project that enables Discord server administrators to deploy their own AI agent — one that understands their community, automates tasks, and provides intelligent assistance, all running on their own infrastructure.

---

## Features

### Core Capabilities
- **Discord Integration** — Connect via discord.js (official Bot API) with support for guilds, channels, DMs, and threads
- **Agent Loop** — Receive Discord messages, assemble context, call LLM, execute tools, stream responses back
- **Markdown Memory** — All memory stored as human-editable Markdown files (SOUL.md, AGENTS.md, MEMORY.md, daily logs)
- **Built-in Tools** — bash, browser, file I/O, memory search, canvas, cron, git
- **Docker Sandbox** — Fail-closed execution isolation with resource limits (CPU, memory, timeout)
- **Approval Workflows** — Dangerous operations (bash, git) require explicit user approval
- **Configuration Management** — YAML config with hot-reload, no restart required for changes
- **Scheduling** — Heartbeat system (periodic checks) and cron jobs (at, every, cron expressions)
- **Extensible Skills** — Teach agents new capabilities via Markdown-based skill definitions

### Coming Soon
- **Skills System** — Community skill marketplace (local-first, optional hub)
- **Multi-Agent Teams** — Agent delegation and team coordination
- **Advanced LLM Features** — Extended thinking, multi-provider support
- **User Account Support** — selfbotjs for user account automation (Phase 3)
- **Web Dashboard** — Configuration UI, memory editor, session viewer

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Runtime** | Node.js 18+ / TypeScript |
| **Monorepo** | Turborepo + Yarn 4.13.0 |
| **Discord** | discord.js v14+ |
| **Gateway** | WebSocket server (native) |
| **LLM Providers** | Anthropic (primary), OpenAI-compatible |
| **Browser** | Puppeteer / Playwright |
| **Memory Index** | SQLite + vector embeddings |
| **Sandbox** | Docker containers |
| **Config** | YAML |
| **Skills** | Markdown + YAML frontmatter |

---

## Project Structure

```
disclaw/
├── apps/                            # Next.js apps (to be repurposed)
├── packages/                        # Monorepo packages (planned)
│   ├── types/                       # Shared TypeScript types
│   ├── config/                      # Configuration management
│   ├── bot/                         # Discord provider (discord.js)
│   ├── gateway/                     # Central control plane
│   ├── agent/                       # Agent runtime
│   ├── memory/                      # Memory system
│   ├── tools/                       # Built-in tools
│   ├── skills/                      # Skill system
│   └── sandbox/                     # Docker isolation
├── docs/                            # Documentation
│   ├── project-overview-pdr.md      # Project vision & requirements
│   ├── codebase-summary.md          # Monorepo structure
│   ├── code-standards.md            # Development standards
│   ├── system-architecture.md       # Architecture overview
│   └── disclaw/                     # Design documents (00-08)
└── README.md                        # This file
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn 4.13.0
- Docker (for sandbox execution)
- Discord Bot Token (get from [Discord Developer Portal](https://discord.com/developers/applications))
- LLM API Key (Anthropic or OpenAI-compatible provider)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/disclaw.git
cd disclaw

# Install dependencies
yarn install

# Build all packages
yarn build
```

### Configuration

1. Create configuration file:

```bash
mkdir -p ~/.disclaw
```

2. Create `~/.disclaw/disclaw.config.yaml`:

```yaml
provider:
  method: bot
  token: ${DISCORD_BOT_TOKEN}
  intents:
    - Guilds
    - GuildMessages
    - MessageContent
    - DirectMessages

agent:
  provider: anthropic
  model: claude-sonnet-4-20250514

gateway:
  port: 18789
  heartbeat:
    interval: 30m

sandbox:
  enabled: true
  runtime: docker
```

3. Set environment variables:

```bash
export DISCORD_BOT_TOKEN="your-bot-token"
export ANTHROPIC_API_KEY="your-api-key"
```

### Running

```bash
# Start development mode (all packages)
yarn dev

# Start specific package
yarn workspace @disclaw/gateway dev

# Build production
yarn build
```

---

## Documentation

Comprehensive documentation is available in `docs/`:

### Overview
- **[Project Overview & PDR](./docs/project-overview-pdr.md)** — Vision, requirements, success metrics
- **[Codebase Summary](./docs/codebase-summary.md)** — Monorepo structure, planned packages
- **[Code Standards](./docs/code-standards.md)** — Development standards, naming, testing

### Architecture
- **[System Architecture](./docs/system-architecture.md)** — System-level overview
- **[Design Documents](./docs/disclaw/)** — Detailed 9-part design spec:
  1. [Architecture Overview](./docs/disclaw/00-architecture-overview.md)
  2. [Discord Provider](./docs/disclaw/01-discord-provider.md)
  3. [Gateway](./docs/disclaw/02-gateway.md)
  4. [Agent Runtime](./docs/disclaw/03-agent-runtime.md)
  5. [Memory System](./docs/disclaw/04-memory-system.md)
  6. [Tools & Skills](./docs/disclaw/05-tools-skills-system.md)
  7. [Scheduling & Cron](./docs/disclaw/06-scheduling-cron.md)
  8. [Configuration](./docs/disclaw/07-configuration.md)
  9. [Security & Sandbox](./docs/disclaw/08-security-sandbox.md)

---

## Development

### Build

```bash
# Build all packages
yarn build

# Build specific package
yarn workspace @disclaw/agent build

# Watch mode
yarn dev
```

### Lint & Format

```bash
# Lint all packages
yarn lint

# Fix formatting (prettier)
yarn format
```

### Testing

```bash
# Run all tests
yarn test

# Run specific package tests
yarn workspace @disclaw/memory test

# Coverage
yarn test --coverage
```

### Code Quality

We follow strict TypeScript and code standards:

- **TypeScript strict mode** — Type safety always
- **ESLint** — Code quality and consistency
- **Prettier** — Code formatting
- **Jest** — Unit and integration tests (target >80% coverage)

See [code-standards.md](./docs/code-standards.md) for detailed guidelines.

---

## Architecture Highlights

### Hub-and-Spoke Gateway
Single always-on gateway routes all Discord events to sessions. Proven pattern from OpenClaw.

### Markdown-Based Memory
All persistent state stored as readable Markdown files. Enables human editing, transparency, and simple backups.

### Fail-Closed Sandbox
Docker sandbox required for tool execution. If unavailable, execution fails rather than silently falling back. Security over convenience.

### Streaming Responses
LLM responses streamed token-by-token to Discord for perceived speed and user feedback.

### Extensible Skills
Skills teach agents new capabilities without code changes. Markdown-based format compatible with OpenClaw.

---

## Deployment

### Self-Hosted

DisClaw is designed for self-hosted deployment on user infrastructure:

```
Your Server
├─ Node.js process (DisClaw)
├─ Docker daemon (sandbox)
├─ SQLite (memory index)
└─ Filesystem (config, memory)
```

**Requirements**: Linux/macOS/WSL2, Node.js 18+, Docker 20+

**Setup time**: <5 minutes from `git clone` to first message.

---

## Security

### Principles

- **Fail-closed**: Operations without sandbox fail if sandbox unavailable
- **Approval workflows**: Dangerous operations (bash, git) require user approval
- **Path validation**: File operations confined to workspace directory
- **Audit logging**: All security events logged for review
- **No secrets in code**: API keys via environment variables only

### Sandbox Isolation

- Docker containers with network isolation (no internet access)
- Resource limits: 512MB RAM, 0.5 CPU cores, 30s timeout
- Read-only filesystem (except workspace mount)
- Dropped Linux capabilities

See [08-security-sandbox.md](./docs/disclaw/08-security-sandbox.md) for details.

---

## Contributing

Contributions welcome! Please:

1. Read [code-standards.md](./docs/code-standards.md) for development guidelines
2. Follow conventional commits for clear history
3. Ensure >80% test coverage for new code
4. Update documentation as needed

---

## Roadmap

### Phase 1 (MVP — 3-4 months)
- Core components: provider, gateway, agent, memory, tools, sandbox
- Basic documentation and error handling
- Initial test suite (>80% coverage)
- Public release

### Phase 2 (2-3 months)
- Skills system implementation
- Multi-provider LLM support
- Performance optimization
- Community feedback integration

### Phase 3 (3-4 months)
- Multi-agent teams and delegation
- selfbotjs provider (user account support)
- Web dashboard
- Advanced RBAC and audit logging

---

## Support

- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Ask questions in GitHub Discussions
- **Documentation**: See `docs/` directory for comprehensive guides

---

## License

MIT License — see LICENSE file for details.

---

## Acknowledgments

DisClaw is inspired by OpenClaw's proven patterns for agent architecture, memory management, and skill systems. We thank the OpenClaw project for the design foundation.

---

## Getting Help

- Read the [documentation](./docs/)
- Check the [FAQ](./docs/project-overview-pdr.md) (coming soon)
- Open a GitHub issue
- Start a discussion in GitHub Discussions
