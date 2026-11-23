# Routinely

Plan your routine once, then just check things off each day.

1. **Activities** — the building blocks: workout, going to the office, prayers, career study, side projects…
2. **Day templates** — kinds of days (work day, weekend, vacation). Drag activities into Morning, Afternoon, Evening or Night; the same one can appear more than once, each with its own duration.
3. **Week templates** — drag day templates onto the seven days of a week. One is the default.
4. **This week** — pick which week template a calendar week uses, and swap individual days without touching the template.
5. **Today** — a checklist of the day's activities, in part-of-day order.

Built with React + Vite, Firebase Auth (Google sign-in) and the Realtime Database, hosted on Firebase Hosting.

## Develop

```bash
npm install
cp .env.example .env.local   # then fill in your Firebase web app config
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

All data is private to the signed-in user under `users/{uid}` (see `database.rules.json`). Schema version 3:

| Path | Shape |
| --- | --- |
| `activities/{id}` | `{ name, emoji, color, order, createdAt }` |
| `dayTemplates/{id}` | `{ name, color, items: [{ id, activityId, minutes?, part? }], order, createdAt }` — an ordered list of entries grouped by part of day (`morning`, `afternoon`, `evening`, `night`; none = anytime); the same activity can appear more than once |
| `weekTemplates/{id}` | `{ name, days: { 0..6: dayTemplateId } }` — keyed by weekday, 0 = Sunday |
| `weeks/{YYYY-MM-DD}` | `{ templateId }` — key is the first day of that week |
| `dayOverrides/{YYYY-MM-DD}` | `dayTemplateId` or `"none"` — a one-off change for that date |
| `logs/{YYYY-MM-DD}` | `{ entryId: true }` |
| `snapshots/{YYYY-MM-DD}` | `{ dayTemplateId, name, color, items: [{ id, activityId, name, emoji, color, minutes?, part? }] }` or `{ rest: true }` — the checklist a day had, so editing templates later doesn't rewrite history. Every past day gets one when the app next opens, ticked or not |
| `settings` | `{ weekStartsOn: 0..6, defaultWeekTemplateId, schema, closedThrough }` |

Older data (schema 1: positional week slots and per-week overrides; schema 2: activity id lists with a durations map) is migrated automatically on first load.
