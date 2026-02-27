# CamperPlanner

A local-first camping and backpacking planning app.

## Current workflow
The app now targets a real frontend development stack:
- React 18
- Vite dev server with hot reload
- localStorage persistence for local-first iteration

## Why this setup
- Faster UI iteration than manual static file reloads
- Cleaner component structure as the app grows
- Still keeps your current local-only workflow and saved browser state

## Features in the current MVP
- Trip CRUD with status and notes
- Invitee tracking with per-person status
- Campsite candidate planning with voting and booking state
- Itinerary CRUD with move up/down ordering and completion tracking
- Dashboard stats, phase labels, and quick filters
- Schema-versioned local storage with migration guard

## Prerequisite
Install Node.js 20+ so `npm` is available.

## Start locally
Option 1:
1. Run `./start.ps1`

Option 2:
1. Run `npm.cmd install`
2. Run `npm.cmd run dev`

Vite will serve the app at `http://127.0.0.1:5173/`.

## Local data
Trip data is still stored in the browser using `localStorage`.
That means reopening the app in the same browser profile keeps your saved data.

## Working docs
- [MVP Spec](./docs/mvp-spec.md)
- [Implementation Backlog](./docs/backlog.md)
- [MVP Scope Summary](./docs/mvp-scope.md)
- [Smoke Test Checklist](./docs/smoke-test-checklist.md)

## Utility tests
Open `tests/test-runner.html` in a browser to run the utility tests for the shared data logic.