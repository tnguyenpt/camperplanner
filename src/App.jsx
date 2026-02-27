import React, { useMemo, useState } from "react";
import { loadState, saveState } from "./storage.js";
import {
  CAMPSITE_STATUSES,
  INVITEE_STATUSES,
  ensureSingleBookedCampsite,
  formatStatus,
  getInviteeSummary,
  getPhaseLabel,
  getTripProgress,
  itineraryCompletionPercent,
  normalizeCampsiteStatus,
  normalizeInviteeStatus,
  normalizeTrip,
  normalizeTripStatus,
  sortItinerary,
  sortTripsByDate,
} from "./utils.js";

const EMPTY_TRIP_FORM = {
  id: "",
  name: "",
  location: "",
  startDate: "",
  endDate: "",
  status: "planning",
  type: "Camping",
  notes: "",
};

const EMPTY_INVITEE_FORM = {
  id: "",
  name: "",
  status: "pending",
  notes: "",
};

const EMPTY_CAMPSITE_FORM = {
  id: "",
  name: "",
  source: "",
  status: "unsearched",
  notes: "",
};

const EMPTY_ITINERARY_FORM = {
  id: "",
  title: "",
  dayNumber: "1",
  details: "",
};

export default function App() {
  const [initialState] = useState(() => loadState());
  const [trips, setTrips] = useState(initialState.trips);
  const [selectedTripId, setSelectedTripId] = useState(initialState.trips[0]?.id || null);
  const [activeFilter, setActiveFilter] = useState("all");
  const [tripForm, setTripForm] = useState(EMPTY_TRIP_FORM);
  const [tripFormError, setTripFormError] = useState(initialState.lastError || "");
  const [inviteeForm, setInviteeForm] = useState(EMPTY_INVITEE_FORM);
  const [inviteeError, setInviteeError] = useState("");
  const [campsiteForm, setCampsiteForm] = useState(EMPTY_CAMPSITE_FORM);
  const [campsiteError, setCampsiteError] = useState("");
  const [itineraryForm, setItineraryForm] = useState(EMPTY_ITINERARY_FORM);
  const [itineraryError, setItineraryError] = useState("");

  const selectedTrip = useMemo(
    () => trips.find((trip) => trip.id === selectedTripId) || null,
    [trips, selectedTripId]
  );

  const filteredTrips = useMemo(() => {
    const sorted = sortTripsByDate(trips);
    if (activeFilter === "all") return sorted;
    if (activeFilter === "planning") {
      return sorted.filter((trip) => ["idea", "planning", "in_progress"].includes(trip.status));
    }
    if (activeFilter === "booked") {
      return sorted.filter((trip) => trip.status === "booked");
    }
    if (activeFilter === "completed") {
      return sorted.filter((trip) => trip.status === "completed");
    }
    return sorted;
  }, [activeFilter, trips]);

  const stats = useMemo(() => {
    const total = trips.length;
    const planning = trips.filter((trip) => ["idea", "planning", "in_progress"].includes(trip.status)).length;
    const booked = trips.filter((trip) => trip.status === "booked").length;
    const completed = trips.filter((trip) => trip.status === "completed").length;
    const campsiteDecisionComplete = trips.filter((trip) => trip.campsites.some((site) => site.status === "booked")).length;
    const avgItineraryCompletion = total
      ? Math.round(trips.reduce((sum, trip) => sum + itineraryCompletionPercent(trip), 0) / total)
      : 0;

    return [
      { label: "Total trips", value: total },
      { label: "Planning", value: planning },
      { label: "Booked", value: booked },
      { label: "Completed", value: completed },
      { label: "Booked site / Avg itinerary", value: `${campsiteDecisionComplete}/${total} | ${avgItineraryCompletion}%` },
    ];
  }, [trips]);

  function commitTrips(updater) {
    setTrips((previous) => {
      const nextTrips = typeof updater === "function" ? updater(previous) : updater;
      saveState({ trips: nextTrips });
      return nextTrips;
    });
  }

  function resetTripForm() {
    setTripForm(EMPTY_TRIP_FORM);
    setTripFormError("");
  }

  function handleTripChange(event) {
    const { name, value } = event.target;
    setTripForm((current) => ({ ...current, [name]: value }));
  }

  function handleTripSubmit(event) {
    event.preventDefault();
    setTripFormError("");

    const payload = {
      name: tripForm.name.trim(),
      location: tripForm.location.trim(),
      startDate: tripForm.startDate,
      endDate: tripForm.endDate,
      status: normalizeTripStatus(tripForm.status),
      type: tripForm.type,
      notes: tripForm.notes.trim(),
    };

    const validationError = validateTripPayload(payload);
    if (validationError) {
      setTripFormError(validationError);
      return;
    }

    if (tripForm.id) {
      commitTrips((current) =>
        current.map((trip) =>
          trip.id === tripForm.id
            ? { ...trip, ...payload, updatedAt: new Date().toISOString() }
            : trip
        )
      );
      resetTripForm();
      return;
    }

    const trip = normalizeTrip({
      id: crypto.randomUUID(),
      ...payload,
      invitees: [],
      campsites: [],
      itinerary: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    commitTrips((current) => [trip, ...current]);
    setSelectedTripId(trip.id);
    resetTripForm();
  }

  function startTripEdit(tripId) {
    const trip = trips.find((item) => item.id === tripId);
    if (!trip) return;

    setTripForm({
      id: trip.id,
      name: trip.name,
      location: trip.location,
      startDate: trip.startDate,
      endDate: trip.endDate,
      status: trip.status,
      type: trip.type,
      notes: trip.notes,
    });
    setTripFormError("");
  }

  function deleteTrip(tripId) {
    const nextTrips = trips.filter((trip) => trip.id !== tripId);
    commitTrips(nextTrips);
    if (selectedTripId === tripId) {
      setSelectedTripId(nextTrips[0]?.id || null);
    }
    if (tripForm.id === tripId) {
      resetTripForm();
    }
  }

  function updateSelectedTrip(updater) {
    if (!selectedTrip) return;

    commitTrips((current) =>
      current.map((trip) => {
        if (trip.id !== selectedTrip.id) return trip;
        const updatedTrip = updater(trip);
        return { ...updatedTrip, updatedAt: new Date().toISOString() };
      })
    );
  }

  function handleInviteeSubmit(event) {
    event.preventDefault();
    setInviteeError("");

    const payload = {
      name: inviteeForm.name.trim(),
      status: normalizeInviteeStatus(inviteeForm.status),
      notes: inviteeForm.notes.trim(),
    };

    if (!payload.name) {
      setInviteeError("Invitee name is required.");
      return;
    }

    updateSelectedTrip((trip) => {
      const invitees = [...trip.invitees];
      if (inviteeForm.id) {
        const index = invitees.findIndex((invitee) => invitee.id === inviteeForm.id);
        if (index >= 0) {
          invitees[index] = { ...invitees[index], ...payload };
        }
      } else {
        invitees.push({ id: crypto.randomUUID(), createdAt: new Date().toISOString(), ...payload });
      }
      return { ...trip, invitees };
    });

    setInviteeForm(EMPTY_INVITEE_FORM);
  }

  function handleCampsiteSubmit(event) {
    event.preventDefault();
    setCampsiteError("");

    const payload = {
      name: campsiteForm.name.trim(),
      source: campsiteForm.source.trim(),
      status: normalizeCampsiteStatus(campsiteForm.status),
      notes: campsiteForm.notes.trim(),
    };

    if (!payload.name) {
      setCampsiteError("Campsite name is required.");
      return;
    }

    updateSelectedTrip((trip) => {
      let campsites = [...trip.campsites];
      let targetId = campsiteForm.id;

      if (campsiteForm.id) {
        const index = campsites.findIndex((site) => site.id === campsiteForm.id);
        if (index >= 0) {
          campsites[index] = { ...campsites[index], ...payload };
        }
      } else {
        targetId = crypto.randomUUID();
        campsites.push({
          id: targetId,
          upvotes: 0,
          downvotes: 0,
          createdAt: new Date().toISOString(),
          ...payload,
        });
      }

      if (payload.status === "booked") {
        campsites = ensureSingleBookedCampsite(campsites, targetId);
      }

      return { ...trip, campsites };
    });

    setCampsiteForm(EMPTY_CAMPSITE_FORM);
  }

  function handleItinerarySubmit(event) {
    event.preventDefault();
    setItineraryError("");

    const payload = {
      title: itineraryForm.title.trim(),
      dayNumber: Math.max(1, Number(itineraryForm.dayNumber) || 1),
      details: itineraryForm.details.trim(),
    };

    if (!payload.title) {
      setItineraryError("Itinerary title is required.");
      return;
    }

    updateSelectedTrip((trip) => {
      const itinerary = [...trip.itinerary];

      if (itineraryForm.id) {
        const index = itinerary.findIndex((item) => item.id === itineraryForm.id);
        if (index >= 0) {
          itinerary[index] = { ...itinerary[index], ...payload };
        }
      } else {
        const maxSortOrder = itinerary
          .filter((item) => item.dayNumber === payload.dayNumber)
          .reduce((max, item) => Math.max(max, item.sortOrder), 0);

        itinerary.push({
          id: crypto.randomUUID(),
          ...payload,
          isComplete: false,
          sortOrder: maxSortOrder + 1,
          createdAt: new Date().toISOString(),
        });
      }

      return { ...trip, itinerary };
    });

    setItineraryForm(EMPTY_ITINERARY_FORM);
  }

  function moveItineraryItem(itineraryId, direction) {
    updateSelectedTrip((trip) => {
      const itinerary = [...trip.itinerary];
      const item = itinerary.find((entry) => entry.id === itineraryId);
      if (!item) return trip;

      const sameDay = itinerary
        .filter((entry) => entry.dayNumber === item.dayNumber)
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const index = sameDay.findIndex((entry) => entry.id === itineraryId);
      const swapIndex = index + direction;
      if (index < 0 || swapIndex < 0 || swapIndex >= sameDay.length) return trip;

      const other = sameDay[swapIndex];
      const currentOrder = item.sortOrder;
      item.sortOrder = other.sortOrder;
      other.sortOrder = currentOrder;

      return { ...trip, itinerary };
    });
  }

  return (
    <main className="app-shell">
      <header>
        <h1>CamperPlanner</h1>
        <p>Plan campsites, itinerary, and trip readiness in one place.</p>
      </header>

      <section className="panel">
        <h2>{tripForm.id ? "Edit Trip" : "Add Trip"}</h2>
        <form className="trip-form" onSubmit={handleTripSubmit}>
          <input type="hidden" name="tripId" value={tripForm.id} />

          <label>
            Trip name
            <input name="name" type="text" required value={tripForm.name} onChange={handleTripChange} />
          </label>

          <label>
            Location
            <input name="location" type="text" required value={tripForm.location} onChange={handleTripChange} />
          </label>

          <label>
            Start date
            <input name="startDate" type="date" required value={tripForm.startDate} onChange={handleTripChange} />
          </label>

          <label>
            End date
            <input name="endDate" type="date" required value={tripForm.endDate} onChange={handleTripChange} />
          </label>

          <label>
            Status
            <select name="status" value={tripForm.status} onChange={handleTripChange}>
              <option value="idea">Idea</option>
              <option value="planning">Planning</option>
              <option value="booked">Booked</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <label>
            Trip type
            <select name="type" value={tripForm.type} onChange={handleTripChange}>
              <option value="Camping">Camping</option>
              <option value="Backpacking">Backpacking</option>
            </select>
          </label>

          <p className="form-hint">Invitees are managed from the trip detail view after the trip is created.</p>

          <label className="full-row">
            Notes
            <textarea name="notes" rows="3" value={tripForm.notes} onChange={handleTripChange} placeholder="Trip goals, trail notes, and reminders..." />
          </label>

          {tripFormError ? <p className="form-error">{tripFormError}</p> : null}

          <div className="form-actions full-row">
            <button type="submit">{tripForm.id ? "Update Trip" : "Save Trip"}</button>
            {tripForm.id ? (
              <button type="button" className="secondary" onClick={resetTripForm}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>
      </section>

      <section className="panel">
        <h2>Trip Summary</h2>
        <div className="stats">
          {stats.map((item) => (
            <article className="stat-card" key={item.label}>
              <div className="stat-label">{item.label}</div>
              <div className="stat-value">{item.value}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Your Trips</h2>
          <div className="filters" aria-label="Trip filters">
            {[
              { label: "All", value: "all" },
              { label: "Planning", value: "planning" },
              { label: "Booked", value: "booked" },
              { label: "Completed", value: "completed" },
            ].map((filter) => (
              <button
                key={filter.value}
                className={`small secondary ${activeFilter === filter.value ? "is-active" : ""}`.trim()}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="trip-list">
          {!trips.length ? <p className="state-message">No trips yet. Add your first trip above.</p> : null}
          {trips.length > 0 && !filteredTrips.length ? (
            <p className="state-message">No trips match the selected filter.</p>
          ) : null}
          {filteredTrips.map((trip) => {
            const inviteeSummary = getInviteeSummary(trip);
            return (
              <article className="trip-card" key={trip.id}>
                <div className="trip-top">
                  <div>
                    <h3 className="trip-title">
                      {trip.name}
                      {trip.id === selectedTripId ? " (Selected)" : ""}
                    </h3>
                    <p className="meta">{trip.location} | {trip.type}</p>
                    <p className="meta">{trip.startDate || "-"} to {trip.endDate || "-"}</p>
                    <p className="meta">
                      Invitees: {inviteeSummary.accepted} accepted, {inviteeSummary.pending} pending, {inviteeSummary.declined} declined
                    </p>
                    <span className="phase-tag">{getPhaseLabel(trip)}</span>
                  </div>
                  <span className="badge">{formatStatus(trip.status)}</span>
                </div>
                <p className="meta">Planning progress: {getTripProgress(trip)}%</p>
                <div className="actions">
                  <button className="small" type="button" onClick={() => setSelectedTripId(trip.id)}>
                    Open Details
                  </button>
                  <button className="small secondary" type="button" onClick={() => startTripEdit(trip.id)}>
                    Edit Trip
                  </button>
                  <button className="small secondary" type="button" onClick={() => deleteTrip(trip.id)}>
                    Delete Trip
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel">
        <h2>Trip Details</h2>
        {!selectedTrip ? (
          <p className="detail-empty">Select a trip to manage invitees, campsites, and itinerary.</p>
        ) : (
          <div className="detail-grid">
            <div className="detail-columns">
              <div className="detail-block">
                <h3>Invitees</h3>
                <form className="inline-form" onSubmit={handleInviteeSubmit}>
                  <input type="hidden" value={inviteeForm.id} />
                  <label>
                    Name
                    <input
                      value={inviteeForm.name}
                      onChange={(event) => setInviteeForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Person name"
                      required
                    />
                  </label>
                  <label>
                    Status
                    <select
                      value={inviteeForm.status}
                      onChange={(event) => setInviteeForm((current) => ({ ...current, status: event.target.value }))}
                    >
                      {INVITEE_STATUSES.map((status) => (
                        <option key={status} value={status}>{formatStatus(status)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="full-row">
                    Notes
                    <textarea
                      rows="2"
                      value={inviteeForm.notes}
                      onChange={(event) => setInviteeForm((current) => ({ ...current, notes: event.target.value }))}
                      placeholder="Invite notes"
                    />
                  </label>
                  {inviteeError ? <p className="form-error full-row">{inviteeError}</p> : null}
                  <div className="form-actions full-row">
                    <button type="submit" className="small">Save Invitee</button>
                    {inviteeForm.id ? (
                      <button type="button" className="small secondary" onClick={() => { setInviteeForm(EMPTY_INVITEE_FORM); setInviteeError(""); }}>
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>
                <p className="meta">
                  {getInviteeSummary(selectedTrip).accepted} accepted, {getInviteeSummary(selectedTrip).pending} pending, {getInviteeSummary(selectedTrip).declined} declined
                </p>
                <div className="entity-list">
                  {!selectedTrip.invitees.length ? <p className="state-message">No invitees yet.</p> : null}
                  {selectedTrip.invitees.map((invitee) => (
                    <article className="entity-item" key={invitee.id}>
                      <div className="entity-head">
                        <strong>{invitee.name}</strong>
                        <select
                          value={invitee.status}
                          onChange={(event) => updateSelectedTrip((trip) => ({
                            ...trip,
                            invitees: trip.invitees.map((item) => item.id === invitee.id ? { ...item, status: normalizeInviteeStatus(event.target.value) } : item),
                          }))}
                        >
                          {INVITEE_STATUSES.map((status) => (
                            <option key={status} value={status}>{formatStatus(status)}</option>
                          ))}
                        </select>
                      </div>
                      {invitee.notes ? <p className="meta">{invitee.notes}</p> : null}
                      <div className="actions">
                        <button className="small secondary" type="button" onClick={() => setInviteeForm({ id: invitee.id, name: invitee.name, status: invitee.status, notes: invitee.notes })}>
                          Edit
                        </button>
                        <button className="small secondary" type="button" onClick={() => updateSelectedTrip((trip) => ({ ...trip, invitees: trip.invitees.filter((item) => item.id !== invitee.id) }))}>
                          Delete
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>

              <div className="detail-block">
                <h3>Campsite Candidates</h3>
                <form className="inline-form" onSubmit={handleCampsiteSubmit}>
                  <label>
                    Name
                    <input value={campsiteForm.name} onChange={(event) => setCampsiteForm((current) => ({ ...current, name: event.target.value }))} placeholder="Campsite name" required />
                  </label>
                  <label>
                    Source
                    <input value={campsiteForm.source} onChange={(event) => setCampsiteForm((current) => ({ ...current, source: event.target.value }))} placeholder="URL or app" />
                  </label>
                  <label>
                    Status
                    <select value={campsiteForm.status} onChange={(event) => setCampsiteForm((current) => ({ ...current, status: event.target.value }))}>
                      {CAMPSITE_STATUSES.map((status) => (
                        <option key={status} value={status}>{formatStatus(status)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="full-row">
                    Notes
                    <textarea rows="2" value={campsiteForm.notes} onChange={(event) => setCampsiteForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Notes" />
                  </label>
                  {campsiteError ? <p className="form-error full-row">{campsiteError}</p> : null}
                  <div className="form-actions full-row">
                    <button type="submit" className="small">Save Campsite</button>
                    {campsiteForm.id ? (
                      <button type="button" className="small secondary" onClick={() => { setCampsiteForm(EMPTY_CAMPSITE_FORM); setCampsiteError(""); }}>
                        Cancel
                      </button>
                    ) : null}
                  </div>
                </form>
                <div className="entity-list">
                  {!selectedTrip.campsites.length ? <p className="state-message">No campsite candidates yet.</p> : null}
                  {selectedTrip.campsites.map((site) => (
                    <article className="entity-item" key={site.id}>
                      <div className="entity-head">
                        <strong>{site.name}</strong>
                        <select
                          value={site.status}
                          onChange={(event) => updateSelectedTrip((trip) => {
                            let campsites = trip.campsites.map((item) => item.id === site.id ? { ...item, status: normalizeCampsiteStatus(event.target.value) } : item);
                            if (event.target.value === "booked") {
                              campsites = ensureSingleBookedCampsite(campsites, site.id);
                            }
                            return { ...trip, campsites };
                          })}
                        >
                          {CAMPSITE_STATUSES.map((status) => (
                            <option key={status} value={status}>{formatStatus(status)}</option>
                          ))}
                        </select>
                      </div>
                      <p className="meta">Source: {site.source || "-"}</p>
                      {site.notes ? <p className="meta">{site.notes}</p> : null}
                      <div className="actions">
                        <div className="vote-wrap">
                          <button className="small" type="button" onClick={() => updateSelectedTrip((trip) => ({ ...trip, campsites: trip.campsites.map((item) => item.id === site.id ? { ...item, upvotes: item.upvotes + 1 } : item) }))}>+1</button>
                          <span className="meta">{site.upvotes}</span>
                          <button className="small secondary" type="button" onClick={() => updateSelectedTrip((trip) => ({ ...trip, campsites: trip.campsites.map((item) => item.id === site.id ? { ...item, downvotes: item.downvotes + 1 } : item) }))}>-1</button>
                          <span className="meta">{site.downvotes}</span>
                        </div>
                        <button className="small secondary" type="button" onClick={() => setCampsiteForm({ id: site.id, name: site.name, source: site.source, status: site.status, notes: site.notes })}>Edit</button>
                        <button className="small secondary" type="button" onClick={() => updateSelectedTrip((trip) => ({ ...trip, campsites: trip.campsites.filter((item) => item.id !== site.id) }))}>Delete</button>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>

            <div className="detail-block">
              <h3>Itinerary</h3>
              <form className="inline-form" onSubmit={handleItinerarySubmit}>
                <label>
                  Item
                  <input value={itineraryForm.title} onChange={(event) => setItineraryForm((current) => ({ ...current, title: event.target.value }))} placeholder="Plan item" required />
                </label>
                <label>
                  Day #
                  <input type="number" min="1" value={itineraryForm.dayNumber} onChange={(event) => setItineraryForm((current) => ({ ...current, dayNumber: event.target.value }))} required />
                </label>
                <label className="full-row">
                  Details
                  <textarea rows="2" value={itineraryForm.details} onChange={(event) => setItineraryForm((current) => ({ ...current, details: event.target.value }))} placeholder="Details" />
                </label>
                {itineraryError ? <p className="form-error full-row">{itineraryError}</p> : null}
                <div className="form-actions full-row">
                  <button type="submit" className="small">Save Itinerary Item</button>
                  {itineraryForm.id ? (
                    <button type="button" className="small secondary" onClick={() => { setItineraryForm(EMPTY_ITINERARY_FORM); setItineraryError(""); }}>
                      Cancel
                    </button>
                  ) : null}
                </div>
              </form>
              <p className="meta">Completion: {itineraryCompletionPercent(selectedTrip)}%</p>
              <div className="entity-list">
                {!selectedTrip.itinerary.length ? <p className="state-message">No itinerary items yet.</p> : null}
                {sortItinerary(selectedTrip.itinerary).map((item) => (
                  <article className="entity-item" key={item.id}>
                    <div className="entity-head">
                      <strong>Day {item.dayNumber}: {item.title}</strong>
                      <label>
                        <input
                          type="checkbox"
                          checked={item.isComplete}
                          onChange={(event) => updateSelectedTrip((trip) => ({
                            ...trip,
                            itinerary: trip.itinerary.map((entry) => entry.id === item.id ? { ...entry, isComplete: event.target.checked } : entry),
                          }))}
                        />
                        Done
                      </label>
                    </div>
                    {item.details ? <p className="meta">{item.details}</p> : null}
                    <div className="actions">
                      <button className="small secondary" type="button" onClick={() => setItineraryForm({ id: item.id, title: item.title, dayNumber: String(item.dayNumber), details: item.details })}>Edit</button>
                      <button className="small secondary" type="button" onClick={() => moveItineraryItem(item.id, -1)}>Move Up</button>
                      <button className="small secondary" type="button" onClick={() => moveItineraryItem(item.id, 1)}>Move Down</button>
                      <button className="small secondary" type="button" onClick={() => updateSelectedTrip((trip) => ({ ...trip, itinerary: trip.itinerary.filter((entry) => entry.id !== item.id) }))}>Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function validateTripPayload(payload) {
  if (!payload.name) return "Trip name is required.";
  if (!payload.location) return "Location is required.";
  if (!payload.startDate || !payload.endDate) return "Start and end dates are required.";
  if (new Date(payload.endDate) < new Date(payload.startDate)) {
    return "End date must be the same as or after the start date.";
  }
  return null;
}

