import {
  getTripProgress,
  getPhaseLabel,
  itineraryCompletionPercent,
  ensureSingleBookedCampsite,
  normalizeTrip,
} from "../src/utils.js";

const results = document.getElementById("results");
const rows = [];

function test(name, fn) {
  try {
    fn();
    rows.push(`<p class="pass">PASS: ${name}</p>`);
  } catch (error) {
    rows.push(`<p class="fail">FAIL: ${name}</p><pre>${String(error.message || error)}</pre>`);
  }
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

test("itinerary completion percent reflects completed items", () => {
  const trip = normalizeTrip({
    itinerary: [
      { id: "a", dayNumber: 1, title: "A", isComplete: true, sortOrder: 1 },
      { id: "b", dayNumber: 1, title: "B", isComplete: false, sortOrder: 2 },
    ],
  });
  expect(itineraryCompletionPercent(trip) === 50, "Expected 50%");
});

test("single booked campsite rule demotes others", () => {
  const campsites = [
    { id: "1", status: "booked" },
    { id: "2", status: "searching" },
  ];
  const next = ensureSingleBookedCampsite(campsites, "2");
  expect(next[0].status === "searching", "Expected old booked campsite to be demoted");
  expect(next[1].status === "booked", "Expected selected campsite to be booked");
});

test("phase label is complete when booked and itinerary done", () => {
  const trip = normalizeTrip({
    campsites: [{ id: "1", name: "A", status: "booked" }],
    itinerary: [{ id: "i1", dayNumber: 1, title: "A", isComplete: true, sortOrder: 1 }],
    invitees: [
      { id: "a", name: "Alex", status: "accepted" },
      { id: "b", name: "Taylor", status: "accepted" },
      { id: "c", name: "Jordan", status: "pending" }
    ],
  });

  expect(getPhaseLabel(trip) === "MVP planning complete", "Expected complete phase");
  expect(getTripProgress(trip) >= 90, "Expected high progress score");
});

results.innerHTML = rows.join("\n");
