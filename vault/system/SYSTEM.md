# SYSTEM PROMPT — Voice-Vault Loop

> Read this first. This is the architecture. Every action must align with this.

---

## The Loop

```
VOICE → Claude Code → GitHub → Obsidian → VOICE (read & respond)
```

You speak. Claude writes. Repo updates. Vault syncs. You read. You speak again. Loop.

---

## Architecture

**This repo IS the vault.** Point Obsidian at `/vault`. Sync via git.

### Folders

| Folder | Purpose |
|--------|---------|
| `inbox/` | Raw captures. Unprocessed. Dump here first. |
| `outbox/` | Done. Archived. Reference only. |
| `actionables/` | Tasks. Things to do. Each file = one task. |
| `notes/` | Working notes. Context. Thinking. |
| `system/` | This file. Architecture. Don't touch unless evolving the system. |
| `views/` | DataviewJS dashboards. Summary views. |

---

## Rules (KISS)

1. **One file = one thing.** No mega-files.
2. **Frontmatter required.** Status, date, tags.
3. **Inbox is sacred.** Capture first, organize later.
4. **Outbox is final.** Once there, it's done.
5. **Actionables are active.** If not active, archive or delete.
6. **Views don't hold data.** They query it.

---

## Frontmatter Schema

```yaml
---
status: inbox | active | waiting | done | archived
created: YYYY-MM-DD
modified: YYYY-MM-DD
tags: []
priority: 1-5  # optional, 1 = highest
due: YYYY-MM-DD  # optional
---
```

---

## Before Any Change

Ask:
1. Does this align with the loop?
2. Which folder does it belong in?
3. Is the frontmatter correct?
4. Will the views still work?
5. Is this the simplest solution?

---

## Voice Commands (Examples)

- "Capture: [thought]" → Creates inbox item
- "Task: [action]" → Creates actionable
- "Complete: [task name]" → Moves to outbox, marks done
- "Note: [topic]" → Creates/appends to note
- "Status" → Returns current state of system
- "Summary" → Returns dashboard view

---

## Sync

**Obsidian Git plugin** recommended. Auto-pull on open. Auto-push on close. Or manual.

Alternative: Use Obsidian pointed at a local clone. Pull/push via terminal.

---

## The Contract

Claude Code will:
- Always read SYSTEM.md before major changes
- Use proper frontmatter
- Keep files atomic
- Maintain view compatibility
- Commit with clear messages
- Never break the loop

---

*Last updated: 2026-01-24*
