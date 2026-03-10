# DisClaw — Full Architecture Documentation

> **Project**: DisClaw
> **Language**: TypeScript / Node.js (Turborepo monorepo)
> **License**: MIT
> **Based on**: OpenClaw architecture patterns

---

## 1. Overview

DisClaw is a self-hosted autonomous AI agent built specifically for **Discord**. Unlike OpenClaw's 25+ channel approach, DisClaw focuses on a single platform with deep integration — treating Discord as its primary and only messaging interface.

DisClaw adopts OpenClaw's proven patterns (hub-and-spoke gateway, agent loop, markdown memory, skill system) but simplifies the channel layer to a single Discord provider with two connection methods.

---

## 2. High-Level Architecture

```
┌──────────────────────────────────────────────────────┐
│                   Discord Platform                    │
│          Guilds · Channels · DMs · Threads            │
└──────────────────────┬───────────────────────────────┘
                       │ Events (messages, interactions)
                       ▼
┌──────────────────────────────────────────────────────┐
│                  DISCORD PROVIDER                     │
│  ┌──────────────┐  ┌──────────────────────────────┐  │
│  │  discord.js   │  │  selfbotjs (placeholder)     │  │
│  │  (Bot API)    │  │  (User account, future)      │  │
│  └──────┬───────┘  └──────────────┬───────────────┘  │
│         └──────────┬──────────────┘                   │
│              Normalized Events                        │
└──────────────────────┬───────────────────────────────┘
                       │ InboundContext
                       ▼
┌──────────────────────────────────────────────────────┐
│                      GATEWAY                          │
│  ┌─────────┐ ┌──────────┐ ┌───────────┐ ┌─────────┐ │
│  │ Event   │ │ Session  │ │  Cron /   │ │ Config  │ │
│  │ Router  │ │ Manager  │ │ Heartbeat │ │ Manager │ │
│  └─────────┘ └──────────┘ └───────────┘ └─────────┘ │
└──────────────────────┬───────────────────────────────┘
                       │ SessionContext
                       ▼
┌──────────────────────────────────────────────────────┐
│                   AGENT RUNTIME                       │
│  ┌────────┐ ┌────────────┐ ┌────────┐ ┌───────────┐ │
│  │Context │ │  LLM Call  │ │  Tool  │ │  Reply    │ │
│  │Assembly│→│  (model)   │→│ Exec   │→│ Streaming │ │
│  └────────┘ └────────────┘ └────────┘ └───────────┘ │
│       ↕              ↕            ↕                   │
│  ┌────────┐   ┌──────────┐  ┌────────────┐           │
│  │ Memory │   │ Provider │  │ Sandboxing │           │
│  │ System │   │ (OpenAI/ │  │  (Docker)  │           │
│  │        │   │Anthropic)│  │            │           │
│  └────────┘   └──────────┘  └────────────┘           │
└──────────────────────────────────────────────────────┘
                       ↕
┌──────────────────────────────────────────────────────┐
│                   SKILLS / TOOLS                      │
│  Built-in: bash, browser, file, canvas, cron, git    │
│  Community: Markdown-based skills (SKILL.md)          │
│  Plugins:  Custom extensions via disclaw.plugin.json  │
└──────────────────────────────────────────────────────┘
```

---

## 3. Core Components — Detailed

### 3.1 Discord Provider

The Provider layer abstracts Discord connectivity behind a **unified interface**, supporting two connection methods:

| Method | Library | Status | Use Case |
|--------|---------|--------|----------|
| **Bot API** | discord.js | Active | Official bot account, slash commands, rich embeds, gateway intents |
| **Selfbot** | selfbotjs | Placeholder | User account automation, future development |

#### discord.js (Primary)
- Official Discord API via bot token (`DISCORD_BOT_TOKEN`)
- Full support: slash commands, message components, embeds, threads, voice
- Guild/channel-based permission system
- Gateway intents for selective event subscription

#### selfbotjs (Placeholder — Future)
- User account-based connection (against Discord ToS — use at own risk)
- Enables capabilities not available to bot accounts
- Will share the same `InboundContext` interface as discord.js
- **Not implemented yet** — interface reserved for future development

#### Provider Interface
Both methods normalize Discord events into a common `InboundContext`:

```typescript
interface InboundContext {
  source: 'discord';
  method: 'bot' | 'selfbot';
  guildId: string;
  channelId: string;
  userId: string;
  messageId: string;
  content: string;
  attachments: Attachment[];
  replyTo?: string;
  timestamp: Date;
}
```

### 3.2 Gateway

The Gateway is the **single always-on process** — central control plane for DisClaw.

| Aspect | Details |
|--------|---------|
| **Protocol** | WebSocket on configurable port (default 18789) |
| **Binding** | 127.0.0.1 (loopback) by default |
| **Heartbeat** | Configurable interval (default 30 min) |
| **Config** | YAML-based configuration files |

**Responsibilities:**
- Owns the Discord provider connection(s)
- Routes incoming events to the correct session (by guild/channel/user)
- Dispatches agent runtime execution
- Manages cron scheduler persistence under `~/.disclaw/cron/`
- Handles configuration hot-reload

### 3.3 Agent Runtime

The runtime executes the **agent loop** — identical pattern to OpenClaw:

```
receive → route → context + LLM + tools → stream → persist
```

**Step-by-step:**
1. Discord event hits provider → Gateway routes to session
2. Agent loads context (session history + memory + skills)
3. Assembled context sent to LLM (via configured provider)
4. Model returns tool calls → runtime executes against sandboxed environment
5. Reply streamed back through Discord (embeds, messages, threads)
6. Conversation + memory updates persisted to workspace

### 3.4 Memory System

All memory stored as **plain Markdown files** on the local filesystem.

#### File Structure
```
workspace/
├── MEMORY.md              # Long-term: decisions, preferences, durable facts
├── SOUL.md                # Immutable personality / operating instructions
├── AGENTS.md              # Agent configuration and instructions
├── HEARTBEAT.md           # Periodic check checklist
└── memory/
    ├── 2026-03-01.md      # Daily log (append-only)
    ├── 2026-03-02.md
    └── ...
```

#### Memory Layers
| Layer | File | Loaded When | Purpose |
|-------|------|-------------|---------|
| **Daily log** | `memory/YYYY-MM-DD.md` | Session start (today + yesterday) | Running context, day-to-day notes |
| **Long-term** | `MEMORY.md` | Main private session only | Curated facts, preferences, decisions |
| **Soul** | `SOUL.md` | Always | Immutable operating instructions |

#### Memory Tools (Agent-Facing)
- **`memory_search`**: Semantic recall over indexed snippets (vector search)
- **`memory_get`**: Targeted read of a specific Markdown file/line range

#### Vector Indexing
- SQLite-based per-agent index at `~/.disclaw/memory/<agentId>.sqlite`
- File watcher on `MEMORY.md` + `memory/` marks index dirty (1.5s debounce)
- Sync runs asynchronously: on session start, on search, or on interval

### 3.5 Tool / Skill System

#### Built-in Tools
- **Bash/Shell**: Command execution with approval workflows
- **Browser**: Chrome/Chromium automation (snapshots, actions, uploads)
- **File I/O**: Read, write, search within workspace
- **Canvas**: Visual/document creation
- **Cron**: Scheduled task management
- **Git**: Version control operations

#### Exec Tool & Approvals
- Commands run on host or in Docker sandbox via `SandboxContext`
- If `host=sandbox` requested but sandbox unavailable → **fails closed** (no silent fallback)
- Explicit approval workflows for dangerous operations

#### Skill Architecture (Markdown-Based)
A skill is a **directory containing a `SKILL.md`** with YAML frontmatter + instructions:

```markdown
---
name: my-skill
version: 1.0.0
description: Does something useful
tags: [productivity, automation]
tools: [bash, browser]
---

# My Skill

Instructions for the agent to follow when this skill is activated...
```

**Skill Precedence** (highest to lowest):
1. Workspace skills (project-level)
2. User-managed / local skills
3. Bundled skills (shipped with DisClaw)

### 3.6 Automation: Heartbeat & Cron

#### Heartbeat
- Periodic check running inside the agent's main session
- Reads `HEARTBEAT.md` from workspace to decide if anything needs attention
- Default interval: 30 minutes
- Handles routine monitoring: guild activity, channel updates

#### Cron Jobs
- Gateway's built-in scheduler
- Persists under `~/.disclaw/cron/` (survives restarts)
- Precise time-based scheduling (daily reports, weekly reviews, reminders)
- Can run in isolated sessions without affecting main context
- Output optionally delivered back to a Discord channel

---

## 4. Configuration

```yaml
# disclaw.config.yaml
provider:
  method: bot                    # 'bot' | 'selfbot'
  token: ${DISCORD_BOT_TOKEN}
  intents:
    - Guilds
    - GuildMessages
    - MessageContent
    - DirectMessages
  allowlist:
    guilds:
      - "123456789"              # guild IDs
    channels:
      - "987654321"              # channel IDs (optional filter)
    users:
      - "111222333"              # user IDs (optional filter)

agent:
  provider: anthropic
  model: claude-sonnet-4-20250514
  memorySearch:
    store:
      path: ~/.disclaw/memory/{agentId}.sqlite

gateway:
  port: 18789
  host: 127.0.0.1
  heartbeat:
    interval: 30m

sandbox:
  enabled: true
  runtime: docker
```

---

## 5. Technology Stack

| Component | Technology |
|-----------|-----------|
| **Runtime** | Node.js / TypeScript |
| **Monorepo** | Turborepo + Yarn |
| **Discord (Bot)** | discord.js v14+ |
| **Discord (Selfbot)** | selfbotjs (placeholder) |
| **Gateway** | WebSocket server |
| **Browser** | Puppeteer / Playwright |
| **Memory Index** | SQLite + vector embeddings |
| **Sandbox** | Docker containers |
| **Config** | YAML |
| **Skills** | Markdown + YAML frontmatter |

---

## 6. Key Differences from OpenClaw

| Aspect | OpenClaw | DisClaw |
|--------|----------|---------|
| **Channels** | 25+ (WhatsApp, Telegram, Discord, Slack...) | Discord only |
| **Connection methods** | One adapter per platform | Two methods: discord.js + selfbotjs |
| **Session routing** | Cross-platform continuity | Guild/channel/user-based routing |
| **Deployment** | Personal single-operator | Discord-native, cloud-ready |
| **Skill marketplace** | ClawHub (3,286+ skills, security concerns) | Local/bundled skills first, marketplace TBD |
| **Package manager** | npm | Yarn (Turborepo monorepo) |
| **Channel abstraction** | Heavy normalization layer for 25+ platforms | Thin provider interface, Discord-specific features preserved |

---

## 7. Architecture Decisions

1. **Single platform, deep integration** — By focusing on Discord only, DisClaw can leverage Discord-specific features (slash commands, embeds, threads, components, voice) without abstraction overhead
2. **Dual provider pattern** — The provider interface abstracts bot vs selfbot, allowing future selfbot development without touching Gateway or Runtime
3. **OpenClaw-compatible memory & skills** — Markdown-based memory and SKILL.md format maintained for potential skill portability
4. **Monorepo structure** — Turborepo enables clean separation of concerns (bot, gateway, runtime, skills) while sharing types and configs
5. **Sandbox-first for tools** — Docker sandboxing for tool execution, fail-closed policy inherited from OpenClaw
