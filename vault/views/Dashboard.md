# Dashboard

> Quick overview of the entire system.

---

## Inbox (Unprocessed)

```dataviewjs
const inbox = dv.pages('"inbox"')
dv.table(["Item", "Created"],
  inbox.sort(p => p.created, 'desc')
    .map(p => [p.file.link, p.created])
)
```

**Count:** `= length(filter(pages, (p) => contains(p.file.path, "inbox")))`

---

## Active Actionables

```dataviewjs
const tasks = dv.pages('"actionables"')
  .where(p => p.status === "active")
  .sort(p => p.priority || 5, 'asc')
dv.table(["Task", "Priority", "Due"],
  tasks.map(p => [p.file.link, p.priority || "-", p.due || "-"])
)
```

---

## Recently Modified

```dataviewjs
const recent = dv.pages()
  .where(p => !p.file.path.includes("views"))
  .sort(p => p.modified, 'desc')
  .limit(5)
dv.table(["File", "Modified", "Status"],
  recent.map(p => [p.file.link, p.modified, p.status || "-"])
)
```

---

## Stats

- **Total Inbox:** `$= dv.pages('"inbox"').length`
- **Active Tasks:** `$= dv.pages('"actionables"').where(p => p.status === "active").length`
- **Completed (Outbox):** `$= dv.pages('"outbox"').length`
- **Notes:** `$= dv.pages('"notes"').length`
