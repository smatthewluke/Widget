# Quick Start

## 1. Clone the Repo

```bash
git clone <your-repo-url>
```

## 2. Open in Obsidian

- Open Obsidian
- "Open folder as vault"
- Select the `/vault` folder inside the repo

## 3. Install Dataview

- Settings > Community Plugins > Browse
- Search "Dataview"
- Install & Enable
- In Dataview settings: Enable JavaScript Queries

## 4. (Optional) Install Obsidian Git

For auto-sync:
- Install "Obsidian Git" plugin
- Configure auto-pull/push intervals

## 5. Start Using

**Voice to Claude Code:**
- "Capture: I need to review the quarterly reports"
- "Task: Send email to team about deadline"
- "Complete: setup-obsidian-git-sync"
- "Status"

Claude will create/update files. Push to repo. Obsidian syncs. You read. Loop.

---

## Folder Reference

| Speak | Goes To |
|-------|---------|
| "Capture: ..." | `/inbox` |
| "Task: ..." | `/actionables` |
| "Note: ..." | `/notes` |
| "Complete: ..." | moves to `/outbox` |

---

*Read SYSTEM.md for full architecture.*
