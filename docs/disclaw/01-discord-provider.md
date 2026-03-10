# 01 - Discord Provider

The provider layer abstracts Discord connectivity behind a unified interface, supporting two connection methods: the official Discord Bot API (discord.js) and a user account approach (selfbotjs placeholder).

---

## 1. Provider Interface

Both connection methods normalize Discord events into a common `InboundContext`:

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

This abstraction allows the Gateway to route events uniformly, regardless of connection method.

---

## 2. Discord.js (Primary)

The official Discord API via bot token.

### Capabilities
| Feature | Supported |
|---------|-----------|
| **Guild/channel-based messaging** | Yes |
| **Slash commands** | Yes |
| **Rich embeds** | Yes |
| **Threads** | Yes |
| **Message components** (buttons, select menus) | Yes |
| **Gateway intents** | Yes (selective subscription) |
| **Voice channels** | Yes (future) |
| **DMs** | Yes |

### Configuration
```yaml
provider:
  method: bot
  token: ${DISCORD_BOT_TOKEN}
  intents:
    - Guilds
    - GuildMessages
    - MessageContent
    - DirectMessages
```

### Event Flow
1. Bot receives message / interaction on Discord gateway
2. discord.js client emits event
3. Provider normalizes to `InboundContext`
4. Gateway routes by session key (guild/channel/user)

---

## 3. Selfbotjs (Placeholder — Future)

User account-based connection for future development.

### Status
- **Not implemented yet** — interface reserved for future
- Against Discord ToS — use at own risk
- Will share same `InboundContext` interface

### Future Capabilities
- Access to non-bot-accessible channels
- User account automation features
- Parallel to discord.js (multi-method support)

### Configuration (when implemented)
```yaml
provider:
  method: selfbot
  token: ${DISCORD_USER_TOKEN}
```

---

## 4. Gateway Intents

Discord.js requires explicit gateway intents for selective event subscription.

| Intent | Events | Default |
|--------|--------|---------|
| `Guilds` | Guild create/update/delete | Enabled |
| `GuildMessages` | Message create/update/delete | Enabled |
| `MessageContent` | Full message content (required for prefix commands) | Enabled |
| `DirectMessages` | DM message events | Enabled |
| `GuildMembers` | Member join/leave events | Disabled |
| `GuildVoiceStates` | Voice channel state changes | Disabled |

Intents are configured in `disclaw.config.yaml` and passed to discord.js during initialization.

---

## 5. Allowlist System

Restricts agent activity to approved Discord entities.

```yaml
provider:
  method: bot
  token: ${DISCORD_BOT_TOKEN}
  allowlist:
    guilds:
      - "123456789"              # Guild IDs
    channels:
      - "987654321"              # Channel IDs (optional filter)
    users:
      - "111222333"              # User IDs (optional filter)
```

### Validation
- Events from non-allowlisted guild → ignored
- Events from non-allowlisted channel (if list present) → ignored
- Events from non-allowlisted user (if list present) → ignored

---

## 6. Event Routing

When `InboundContext` arrives at Gateway, it is routed to a session based on scope:

```
sessionKey = "{agentId}:{scope}"

Scopes (in order of priority):
1. guild+channel+user → "{agentId}:guild:{guildId}:channel:{channelId}:user:{userId}"
2. guild+channel → "{agentId}:guild:{guildId}:channel:{channelId}"
3. guild+user (DM in a guild context) → "{agentId}:guild:{guildId}:user:{userId}"
4. guild → "{agentId}:guild:{guildId}"
5. user (DM outside guild) → "{agentId}:user:{userId}"
```

Each session key maintains its own conversation history and state.

---

## 7. Outbound Replies

Agent responses are sent back to Discord through the provider.

### Message Types
- **Text messages** — Standard Discord messages (max 2000 chars, split if needed)
- **Embeds** — Rich formatted messages with title, description, fields, images
- **Threads** — Reply in conversation thread
- **Reactions** — Message reactions for feedback

### Reply Destination
```typescript
interface ReplyTarget {
  channelId: string;
  messageId?: string;  // for thread reply
  threadId?: string;   // for thread creation
}
```

The provider sends constructed messages back to the exact channel/thread where the event originated.

---

## 8. File Reference

**Planned files** (not yet implemented):

| File | Purpose |
|------|---------|
| `packages/bot/discord-js-provider.ts` | discord.js client init, event listeners, InboundContext normalization |
| `packages/bot/selfbotjs-provider.ts` | selfbotjs client init (placeholder) |
| `packages/bot/provider-interface.ts` | Unified provider interface definition |
| `packages/bot/allowlist.ts` | Guild/channel/user allowlist validation |
| `packages/bot/event-router.ts` | Event routing by guild/channel/user scope |
| `packages/bot/reply.ts` | Outbound message construction and sending |

---

## Cross-References

- [00-architecture-overview.md](./00-architecture-overview.md) — Architecture diagram
- [02-gateway.md](./02-gateway.md) — Gateway routing using InboundContext
- [07-configuration.md](./07-configuration.md) — Provider configuration in disclaw.config.yaml
