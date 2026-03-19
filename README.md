# CamperPlanner

Local-first trip planning for camping + backpacking groups.

## Product Lens (PM framing)

**Problem:** group trip planning gets fragmented across notes, texts, and scattered links.

**Who it's for:** small groups planning outdoor trips who need one place to manage attendees, campsite options, and itinerary.

**Job to be done:** *"Help me move from trip idea to booked + ready without losing context."*

**MVP Success Criteria:**
- Create/manage complete trip plans in one session
- Keep all planning data locally without account setup
- Recover data safely via backup export/import

## What I built

- Trip CRUD (name, location, dates, status, notes)
- Invitee management with per-person status
- Campsite candidate tracking with voting + booking state
- Itinerary management with ordering + completion
- Dashboard stats + quick filters
- Schema-versioned local storage + migration guard
- One-click JSON backup export/import

## Architecture

- **Frontend:** React 18 + Vite
- **Storage:** Browser `localStorage` (local-first)
- **Data safety:** JSON backup export/import + migration guard
- **Testing:** utility test runner (`tests/test-runner.html`)

## Tradeoffs

- **Chose local-first** for zero friction and fast iteration
- **No backend/auth** in MVP to reduce complexity
- **Single-file UI in early phase** for speed; planned component split next

## Quickstart

Prerequisite: Node.js 20+

```bash
cd /home/clawed/projects/camperplanner
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

Open: `http://127.0.0.1:5173`

## Feature test checklist

1. Create a trip
2. Add/edit invitees
3. Add campsite candidates and vote
4. Mark one campsite as booked
5. Add itinerary items and reorder
6. Export backup JSON
7. Refresh app, import backup JSON, verify restore

## Working docs

- [MVP Spec](./docs/mvp-spec.md)
- [Implementation Backlog](./docs/backlog.md)
- [MVP Scope Summary](./docs/mvp-scope.md)
- [Smoke Test Checklist](./docs/smoke-test-checklist.md)

## Next iteration (portfolio roadmap)

- Break UI into dedicated feature components
- Add lightweight analytics + event logs
- Add optional cloud sync mode (while preserving local-first default)
- Add end-to-end tests for core workflows
