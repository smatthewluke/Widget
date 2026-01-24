# Actionables

> All tasks. Sorted by priority then due date.

---

## Active

```dataviewjs
const active = dv.pages('"actionables"')
  .where(p => p.status === "active")
  .sort(p => p.priority || 5, 'asc')
  .sort(p => p.due || '9999-99-99', 'asc')

dv.table(["Task", "Priority", "Due", "Created"],
  active.map(p => [
    p.file.link,
    p.priority || "-",
    p.due || "-",
    p.created
  ])
)

if (active.length === 0) {
  dv.paragraph('*No active tasks.*')
}
```

---

## Waiting

```dataviewjs
const waiting = dv.pages('"actionables"')
  .where(p => p.status === "waiting")

dv.table(["Task", "Waiting For", "Created"],
  waiting.map(p => [p.file.link, p.waiting_for || "-", p.created])
)

if (waiting.length === 0) {
  dv.paragraph('*Nothing waiting.*')
}
```

---

## Overdue

```dataviewjs
const today = dv.date('today')
const overdue = dv.pages('"actionables"')
  .where(p => p.status === "active" && p.due && dv.date(p.due) < today)

dv.table(["Task", "Was Due", "Priority"],
  overdue.map(p => [p.file.link, p.due, p.priority || "-"])
)

if (overdue.length === 0) {
  dv.paragraph('*Nothing overdue.*')
}
```
