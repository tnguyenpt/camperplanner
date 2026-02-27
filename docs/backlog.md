# Implementation Backlog

## Phase 0: Foundation
1. Define app state shape for `Trip`, `CampsiteCandidate`, and `ItineraryItem`.
2. Add `STORAGE_KEY` versioning and migration guard for persisted data.
3. Create utility modules for date/status/progress calculations.
4. Add empty-state and error-state patterns for each major panel.

## Phase 1: Trip Management
5. Expand trip form fields to include explicit `status` and invitee counts.
6. Implement trip edit capability (currently only create/delete).
7. Add form validation and inline error messages.
8. Add trip detail view container to host campsite and itinerary modules.

## Phase 2: Campsite Decision Module
9. Add campsite candidate list UI within a selected trip.
10. Implement add/edit/delete for campsite candidates.
11. Add status controls (`unsearched`, `searching`, `booked`, `rejected`).
12. Add upvote/downvote controls and count display.
13. Add rule: only one candidate can be marked `booked` per trip.
14. Reflect campsite decision completion in trip progress.

## Phase 3: Itinerary Module
15. Add itinerary list by day for selected trip.
16. Implement add/edit/delete for itinerary items.
17. Implement non-drag reorder controls (move up/down).
18. Add completion toggles for itinerary items.
19. Reflect itinerary completion percentage in trip progress.

## Phase 4: Dashboard and Progress
20. Add trip dashboard cards with phase-oriented progress labels.
21. Add quick filters (`all`, `planning`, `booked`, `completed`).
22. Add summary stats: trips by status, campsite decision complete, itinerary completion.
23. Improve responsive layout for mobile and tablet widths.

## Phase 5: Hardening
24. Add defensive parsing for corrupted local storage entries.
25. Add basic unit tests for progress and status logic.
26. Add smoke-test checklist in `docs/` for manual QA before each release.
27. Update README with finalized run and feature notes.

## First implementation slice (start here)
1. Task 5
2. Task 6
3. Task 9
4. Task 10
5. Task 15
