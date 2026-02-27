# CamperPlanner

A web app to plan camping and backpacking trips with clear progress tracking.

## MVP status
The current implementation includes the full MVP planning workflow:
- Trip CRUD with status and invitee tracking
- Campsite candidate planning with votes and status flow
- Single-booked-campsite enforcement
- Itinerary CRUD with completion and reorder controls
- Dashboard stats, phase labels, and quick filters
- Local persistence with schema-versioned storage and migration guard

## Product direction
- MVP is single-user (you) with a collaboration-ready data model.
- The long-term target is group planning where everyone can see status and align on next steps.

## Out of scope for MVP
- Authentication and multi-user sync
- Campflare integrations and booking alerts
- Weather integrations
- Drag-and-drop itinerary interactions

## Working docs
- [MVP Spec](./docs/mvp-spec.md)
- [Implementation Backlog](./docs/backlog.md)
- [MVP Scope Summary](./docs/mvp-scope.md)
- [Smoke Test Checklist](./docs/smoke-test-checklist.md)

## Quick start
1. Open `src/index.html` in your browser.
2. Create a trip and open trip details.
3. Add campsite options, set booking status, and build itinerary.

## Basic tests
1. Open `tests/test-runner.html` in your browser.
2. Confirm all utility tests show PASS.

