# Routinely

Plan your routine once, then just check things off each day.

1. **Activities** — the building blocks: workout, going to the office, prayers, career study, side projects…
2. **Day templates** — kinds of days (work day, weekend, vacation), each an ordered list of activities.
3. **Week templates** — drag day templates onto the seven days of a week. One is the default.
4. **This week** — pick which week template a calendar week uses, and swap individual days without touching the template.
5. **Today** — a checklist of the day's activities.

Built with React + Vite, Firebase Auth (Google sign-in) and the Realtime Database, hosted on Firebase Hosting.

## Develop

```bash
npm install
npm run dev
```

### Against local emulators (no real Google login needed)

```bash
npm run emulators   # Auth + RTDB emulators (needs Java 21+)
npm run dev:emu     # app wired to the emulators
```

## Deploy

```bash
npm run deploy   # vite build + firebase deploy (hosting and database rules)
```

## Data model

All data is private to the signed-in user under `users/{uid}` (see `database.rules.json`). Schema version 2:

| Path | Shape |
| --- | --- |
| `activities/{id}` | `{ name, emoji, color, order, createdAt }` |
| `dayTemplates/{id}` | `{ name, color, activities: [activityId], order, createdAt }` |
| `weekTemplates/{id}` | `{ name, days: { 0..6: dayTemplateId } }` — keyed by weekday, 0 = Sunday |
| `weeks/{YYYY-MM-DD}` | `{ templateId }` — key is the first day of that week |
| `dayOverrides/{YYYY-MM-DD}` | `dayTemplateId` or `"none"` — a one-off change for that date |
| `logs/{YYYY-MM-DD}` | `{ activityId: true }` |
| `snapshots/{YYYY-MM-DD}` | `{ dayTemplateId, name, color, items: [{ id, name, emoji, color }] }` — the checklist a day had, so editing templates later doesn't rewrite history |
| `settings` | `{ weekStartsOn: 0..6, defaultWeekTemplateId, schema }` |

Data from schema 1 (positional week slots, per-week overrides) is migrated automatically on first load.
