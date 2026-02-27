# Smoke Test Checklist

Run these checks before each release candidate.

## 1. Trip form
- Create a trip with valid data and verify it appears in list.
- Try saving with end date before start date and verify inline error.
- Edit trip, update values, and verify persistence after refresh.

## 2. Filters and summary
- Verify filters (`all`, `planning`, `booked`, `completed`) update visible list.
- Verify summary cards update counts when status changes.

## 3. Campsite module
- Add multiple campsite candidates.
- Set one candidate to `booked` and verify no other candidate remains `booked`.
- Edit and delete a campsite entry.
- Use vote buttons and verify counts persist on refresh.

## 4. Itinerary module
- Add itinerary items across multiple days.
- Edit an itinerary item.
- Move item up/down and verify order updates.
- Toggle completion and verify percentage updates.
- Delete itinerary item and verify list updates.

## 5. Persistence and resilience
- Refresh page and verify data remains.
- Corrupt local storage manually and verify app recovers with warning message.

## 6. Layout checks
- Verify usability at desktop width.
- Verify forms and cards stack correctly on narrow/mobile width.
