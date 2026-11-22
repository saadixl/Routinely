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

## Deploy

```bash
npm run deploy   # vite build + firebase deploy (hosting and database rules)
```

## Data model

All data is private to the signed-in user under `users/{uid}` (see `database.rules.json`):

| Path | Shape |
| --- | --- |
| `activities/{id}` | `{ name, emoji, color, order, createdAt }` |
| `dayTemplates/{id}` | `{ name, color, activities: [activityId], order, createdAt }` |
| `weekTemplates/{id}` | `{ name, slots: { 0..6: dayTemplateId } }` |
| `weeks/{YYYY-MM-DD}` | `{ templateId, overrides: { 0..6: dayTemplateId \| "none" } }` — key is the first day of that week |
| `logs/{YYYY-MM-DD}` | `{ activityId: true }` |
| `settings` | `{ weekStartsOn: 0..6, defaultWeekTemplateId }` |

Slot `0` is the first day of the week as set in **Week templates → First day of the week**.
