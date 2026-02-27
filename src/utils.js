export const TRIP_STATUSES = ["idea", "planning", "booked", "in_progress", "completed", "cancelled"];
export const CAMPSITE_STATUSES = ["unsearched", "searching", "booked", "rejected"];
export const INVITEE_STATUSES = ["pending", "accepted", "declined"];

export function clampCount(value) {
  return Math.max(0, Number(value) || 0);
}

export function formatStatus(value) {
  return String(value)
    .split("_")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : ""))
    .join(" ");
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function normalizeTripStatus(status) {
  return TRIP_STATUSES.includes(status) ? status : "planning";
}

export function normalizeCampsiteStatus(status) {
  return CAMPSITE_STATUSES.includes(status) ? status : "unsearched";
}

export function normalizeInviteeStatus(status) {
  return INVITEE_STATUSES.includes(status) ? status : "pending";
}

export function normalizeCampsite(input = {}) {
  return {
    id: String(input.id || crypto.randomUUID()),
    name: String(input.name || "Untitled campsite"),
    source: String(input.source || ""),
    status: normalizeCampsiteStatus(String(input.status || "unsearched")),
    upvotes: clampCount(input.upvotes),
    downvotes: clampCount(input.downvotes),
    notes: String(input.notes || ""),
    createdAt: String(input.createdAt || new Date().toISOString()),
  };
}

export function normalizeItineraryItem(input = {}) {
  return {
    id: String(input.id || crypto.randomUUID()),
    dayNumber: Math.max(1, Number(input.dayNumber) || 1),
    title: String(input.title || "Untitled item"),
    details: String(input.details || ""),
    isComplete: Boolean(input.isComplete),
    sortOrder: Math.max(1, Number(input.sortOrder) || 1),
    createdAt: String(input.createdAt || new Date().toISOString()),
  };
}

export function normalizeInvitee(input = {}) {
  return {
    id: String(input.id || crypto.randomUUID()),
    name: String(input.name || "Unnamed invitee"),
    status: normalizeInviteeStatus(String(input.status || "pending")),
    notes: String(input.notes || ""),
    createdAt: String(input.createdAt || new Date().toISOString()),
  };
}

export function normalizeTrip(input = {}) {
  const invitees = input.invitees || {};
  const inviteeList = Array.isArray(invitees)
    ? invitees.map(normalizeInvitee)
    : migrateInviteeSummary(invitees);

  return {
    id: String(input.id || crypto.randomUUID()),
    name: String(input.name || "Untitled Trip"),
    location: String(input.location || ""),
    startDate: String(input.startDate || ""),
    endDate: String(input.endDate || ""),
    status: normalizeTripStatus(String(input.status || "planning")),
    type: String(input.type || "Camping"),
    notes: String(input.notes || ""),
    invitees: inviteeList,
    campsites: Array.isArray(input.campsites) ? input.campsites.map(normalizeCampsite) : [],
    itinerary: Array.isArray(input.itinerary)
      ? input.itinerary.map(normalizeItineraryItem)
      : [],
    createdAt: String(input.createdAt || new Date().toISOString()),
    updatedAt: String(input.updatedAt || new Date().toISOString()),
  };
}

function migrateInviteeSummary(inviteeSummary = {}) {
  const migrated = [];
  appendInvitees(migrated, clampCount(inviteeSummary.acceptedCount), "accepted");
  appendInvitees(migrated, clampCount(inviteeSummary.pendingCount), "pending");
  appendInvitees(migrated, clampCount(inviteeSummary.declinedCount), "declined");
  return migrated;
}

function appendInvitees(target, count, status) {
  for (let index = 0; index < count; index += 1) {
    target.push(
      normalizeInvitee({
        name: `${formatStatus(status)} invitee ${index + 1}`,
        status,
      })
    );
  }
}

export function ensureSingleBookedCampsite(campsites, bookedId) {
  return campsites.map((site) => {
    if (site.id === bookedId) return { ...site, status: "booked" };
    if (site.status === "booked") return { ...site, status: "searching" };
    return site;
  });
}

export function itineraryCompletionPercent(trip) {
  const total = trip.itinerary.length;
  if (!total) return 0;
  const done = trip.itinerary.filter((item) => item.isComplete).length;
  return Math.round((done / total) * 100);
}

export function campsitesBooked(trip) {
  return trip.campsites.some((site) => site.status === "booked");
}

export function getPhaseLabel(trip) {
  if (!trip.campsites.length) return "Add campsite candidates";
  if (!campsitesBooked(trip)) return "Choose and book a campsite";
  if (!trip.itinerary.length) return "Build itinerary";
  if (itineraryCompletionPercent(trip) < 100) return "Finalize itinerary";
  return "MVP planning complete";
}

export function getTripProgress(trip) {
  const hasCandidate = trip.campsites.length > 0 ? 20 : 0;
  const hasBooked = campsitesBooked(trip) ? 35 : 0;
  const itineraryScore = Math.round(itineraryCompletionPercent(trip) * 0.35);
  const inviteeScore = trip.invitees.length > 0 ? 10 : 0;

  return Math.min(100, hasCandidate + hasBooked + itineraryScore + inviteeScore);
}

export function parseIsoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function sortTripsByDate(trips) {
  return [...trips].sort((a, b) => {
    const aDate = parseIsoDate(a.startDate)?.getTime() || Number.MAX_SAFE_INTEGER;
    const bDate = parseIsoDate(b.startDate)?.getTime() || Number.MAX_SAFE_INTEGER;
    return aDate - bDate;
  });
}

export function sortItinerary(items) {
  return [...items].sort((a, b) => {
    if (a.dayNumber !== b.dayNumber) return a.dayNumber - b.dayNumber;
    return a.sortOrder - b.sortOrder;
  });
}

export function getInviteeSummary(trip) {
  return trip.invitees.reduce(
    (summary, invitee) => {
      if (invitee.status === "accepted") summary.accepted += 1;
      if (invitee.status === "pending") summary.pending += 1;
      if (invitee.status === "declined") summary.declined += 1;
      return summary;
    },
    { accepted: 0, pending: 0, declined: 0 }
  );
}
