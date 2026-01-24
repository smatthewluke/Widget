# Inbox

> All unprocessed items. Review and move to appropriate location.

---

```dataviewjs
const inbox = dv.pages('"inbox"')
  .sort(p => p.created, 'desc')

for (const page of inbox) {
  dv.header(3, page.file.link)
  dv.paragraph(`Created: ${page.created || 'unknown'} | Tags: ${(page.tags || []).join(', ') || 'none'}`)
  dv.paragraph('---')
}

if (inbox.length === 0) {
  dv.paragraph('*Inbox empty. Nice work.*')
}
```

---

## Quick Actions

- Move to actionables: Update `status: active` and move file
- Move to notes: Just move the file
- Archive: Move to outbox, set `status: archived`
