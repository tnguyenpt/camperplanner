# MVP Product Spec

## 1. Problem statement
Trip planning details are currently fragmented across notes, texts, and booking sites. The product should provide one place to track campsite decisions, itinerary progress, and readiness status.

## 2. Target users
- Primary (MVP): one planner managing all trip prep
- Secondary (future): small groups collaborating on decisions and plans

## 3. Success criteria (MVP)
- A trip can be created in under 2 minutes
- Campsite options can be compared and one selected
- A day-by-day itinerary can be built and reordered
- Planner can understand trip readiness from one dashboard

## 4. Core entities

### Trip
- `id`
- `name`
- `location`
- `startDate`
- `endDate`
- `notes`
- `status` (`idea`, `planning`, `booked`, `in_progress`, `completed`, `cancelled`)
- `invitees`
  - `id`
  - `name`
  - `status` (`pending`, `accepted`, `declined`)
  - `notes`
- `createdAt`
- `updatedAt`

### CampsiteCandidate
- `id`
- `tripId`
- `name`
- `source` (free text URL/app name)
- `status` (`unsearched`, `searching`, `booked`, `rejected`)
- `upvotes`
- `downvotes`
- `notes`

### ItineraryItem
- `id`
- `tripId`
- `dayNumber`
- `title`
- `details`
- `isComplete`
- `sortOrder`

## 5. User flows

### Flow A: Create trip
1. User opens app and creates trip
2. User enters trip basics and save
3. Trip appears in dashboard with `planning` status

### Flow B: Decide campsite
1. User adds candidate campsites
2. User sets candidate statuses and vote totals
3. User marks one candidate `booked`
4. Trip phase updates to reflect campsite decision completion

### Flow C: Build itinerary
1. User adds itinerary items by day
2. User reorders items
3. User marks items complete while planning

### Flow D: Check readiness
1. Dashboard shows per-trip progress
2. Planner sees missing steps and current phase

## 6. Functional requirements
- Trip CRUD
- Campsite candidate CRUD within trip
- Itinerary item CRUD + reorder
- Progress indicators based on planning completion
- Local persistence (`localStorage`) with schema version key

## 7. Non-functional requirements
- Mobile-friendly layout
- Input validation for dates and required fields
- No external API dependencies for MVP

## 8. Explicit non-goals
- Multi-account login
- Real-time collaborative editing
- Automated booking/alert integrations
- Drag-and-drop UI interactions
