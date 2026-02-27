import { loadState, saveState } from "./storage.js";
import {
  CAMPSITE_STATUSES,
  INVITEE_STATUSES,
  TRIP_STATUSES,
  ensureSingleBookedCampsite,
  escapeHtml,
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

const tripForm = document.getElementById("trip-form");
const tripFormTitle = document.getElementById("trip-form-title");
const cancelEditBtn = document.getElementById("cancel-edit-btn");
const saveTripBtn = document.getElementById("save-trip-btn");
const tripFormError = document.getElementById("trip-form-error");
const tripFilters = document.getElementById("trip-filters");
const tripList = document.getElementById("trip-list");
const stats = document.getElementById("stats");
const tripDetail = document.getElementById("trip-detail");

const appState = loadState();
let trips = appState.trips;
let selectedTripId = trips[0]?.id || null;
let editingTripId = null;
let activeFilter = "all";

bindGlobalEvents();
render();

if (appState.lastError) {
  showTripFormError(appState.lastError);
}

function bindGlobalEvents() {
  tripForm.addEventListener("submit", onTripFormSubmit);
  cancelEditBtn.addEventListener("click", resetTripForm);

  tripFilters.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-filter]");
    if (!button) return;
    activeFilter = button.dataset.filter;
    render();
  });

  tripList.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const { action, tripId } = button.dataset;
    if (!tripId) return;

    if (action === "select-trip") {
      selectedTripId = tripId;
      render();
      return;
    }

    if (action === "edit-trip") {
      startTripEdit(tripId);
      return;
    }

    if (action === "delete-trip") {
      deleteTrip(tripId);
    }
  });

  tripDetail.addEventListener("click", onTripDetailClick);
  tripDetail.addEventListener("change", onTripDetailChange);
}

function onTripFormSubmit(event) {
  event.preventDefault();
  hideTripFormError();

  const data = new FormData(tripForm);
  const payload = {
    name: String(data.get("name") || "").trim(),
    location: String(data.get("location") || "").trim(),
    startDate: String(data.get("startDate") || ""),
    endDate: String(data.get("endDate") || ""),
    status: normalizeTripStatus(String(data.get("status") || "planning")),
    type: String(data.get("type") || "Camping"),
    notes: String(data.get("notes") || "").trim(),
  };

  const validationError = validateTripPayload(payload);
  if (validationError) {
    showTripFormError(validationError);
    return;
  }

  if (editingTripId) {
    const trip = trips.find((item) => item.id === editingTripId);
    if (!trip) return;
    Object.assign(trip, payload, { updatedAt: new Date().toISOString() });
    persist();
    resetTripForm();
    render();
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

  trips.unshift(trip);
  selectedTripId = trip.id;
  persist();
  resetTripForm();
  render();
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

function startTripEdit(tripId) {
  hideTripFormError();

  const trip = trips.find((item) => item.id === tripId);
  if (!trip) return;

  editingTripId = tripId;
  tripFormTitle.textContent = "Edit Trip";
  saveTripBtn.textContent = "Update Trip";
  cancelEditBtn.classList.remove("hidden");

  setValue("tripId", trip.id);
  setValue("name", trip.name);
  setValue("location", trip.location);
  setValue("startDate", trip.startDate);
  setValue("endDate", trip.endDate);
  setValue("status", trip.status);
  setValue("type", trip.type);
  setValue("notes", trip.notes || "");
}

function resetTripForm() {
  editingTripId = null;
  tripForm.reset();
  hideTripFormError();
  tripFormTitle.textContent = "Add Trip";
  saveTripBtn.textContent = "Save Trip";
  cancelEditBtn.classList.add("hidden");
  setValue("status", "planning");
}

function showTripFormError(message) {
  tripFormError.textContent = message;
  tripFormError.classList.remove("hidden");
}

function hideTripFormError() {
  tripFormError.textContent = "";
  tripFormError.classList.add("hidden");
}

function deleteTrip(tripId) {
  trips = trips.filter((item) => item.id !== tripId);

  if (editingTripId === tripId) {
    resetTripForm();
  }

  if (selectedTripId === tripId) {
    selectedTripId = trips[0]?.id || null;
  }

  persist();
  render();
}

function persist() {
  saveState({ trips });
}

function render() {
  renderStats();
  renderFilterState();
  renderTripList();
  renderTripDetail();
}

function renderFilterState() {
  const buttons = tripFilters.querySelectorAll("button[data-filter]");
  for (const button of buttons) {
    button.classList.toggle("is-active", button.dataset.filter === activeFilter);
  }
}

function filterTrips(list) {
  if (activeFilter === "all") return list;
  if (activeFilter === "planning") {
    return list.filter((trip) => ["idea", "planning", "in_progress"].includes(trip.status));
  }
  if (activeFilter === "booked") {
    return list.filter((trip) => trip.status === "booked");
  }
  if (activeFilter === "completed") {
    return list.filter((trip) => trip.status === "completed");
  }
  return list;
}

function renderTripList() {
  if (!trips.length) {
    tripList.innerHTML = '<p class="state-message">No trips yet. Add your first trip above.</p>';
    return;
  }

  const filtered = filterTrips(sortTripsByDate(trips));
  if (!filtered.length) {
    tripList.innerHTML = '<p class="state-message">No trips match the selected filter.</p>';
    return;
  }

  tripList.innerHTML = filtered.map((trip) => renderTripCard(trip)).join("");
}

function renderTripCard(trip) {
  const selected = trip.id === selectedTripId ? " (Selected)" : "";
  const progress = getTripProgress(trip);
  const phaseLabel = getPhaseLabel(trip);
  const inviteeSummary = getInviteeSummary(trip);

  return `
    <article class="trip-card">
      <div class="trip-top">
        <div>
          <h3 class="trip-title">${escapeHtml(trip.name)}${selected}</h3>
          <p class="meta">${escapeHtml(trip.location)} | ${escapeHtml(trip.type)}</p>
          <p class="meta">${trip.startDate || "-"} to ${trip.endDate || "-"}</p>
          <p class="meta">Invitees: ${inviteeSummary.accepted} accepted, ${inviteeSummary.pending} pending, ${inviteeSummary.declined} declined</p>
          <span class="phase-tag">${escapeHtml(phaseLabel)}</span>
        </div>
        <span class="badge">${formatStatus(trip.status)}</span>
      </div>
      <p class="meta">Planning progress: ${progress}%</p>
      <div class="actions">
        <button class="small" type="button" data-action="select-trip" data-trip-id="${trip.id}">Open Details</button>
        <button class="small secondary" type="button" data-action="edit-trip" data-trip-id="${trip.id}">Edit Trip</button>
        <button class="small secondary" type="button" data-action="delete-trip" data-trip-id="${trip.id}">Delete Trip</button>
      </div>
    </article>
  `;
}

function renderTripDetail() {
  const trip = trips.find((item) => item.id === selectedTripId);
  if (!trip) {
    tripDetail.innerHTML = '<p class="detail-empty">Select a trip to manage campsites and itinerary.</p>';
    return;
  }

  const campsites = [...trip.campsites].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const itinerary = sortItinerary(trip.itinerary);
  const invitees = [...trip.invitees].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const inviteeSummary = getInviteeSummary(trip);

  tripDetail.innerHTML = `
    <div class="detail-grid">
      <div class="detail-columns">
        <div class="detail-block">
          <h3>Invitees</h3>
          <form id="invitee-form" class="inline-form" novalidate>
            <input id="inviteeId" name="inviteeId" type="hidden" />
            <label>
              Name
              <input name="name" placeholder="Person name" required />
            </label>
            <label>
              Status
              <select name="status">
                ${INVITEE_STATUSES.map((status) => `<option value="${status}">${formatStatus(status)}</option>`).join("")}
              </select>
            </label>
            <label class="full-row">
              Notes
              <textarea name="notes" rows="2" placeholder="Invite notes"></textarea>
            </label>
            <p id="invitee-error" class="form-error hidden" role="alert"></p>
            <div class="form-actions full-row">
              <button type="submit" class="small">Save Invitee</button>
              <button type="button" id="cancel-invitee-edit" class="small secondary hidden">Cancel</button>
            </div>
          </form>
          <p class="meta">${inviteeSummary.accepted} accepted, ${inviteeSummary.pending} pending, ${inviteeSummary.declined} declined</p>
          <div class="entity-list">
            ${invitees.length ? invitees.map((invitee) => renderInviteeItem(invitee)).join("") : '<p class="state-message">No invitees yet.</p>'}
          </div>
        </div>

        <div class="detail-block">
          <h3>Campsite Candidates</h3>
          <form id="campsite-form" class="inline-form" novalidate>
            <input id="campsiteId" name="campsiteId" type="hidden" />
            <label>
              Name
              <input name="name" placeholder="Campsite name" required />
            </label>
            <label>
              Source
              <input name="source" placeholder="URL or app" />
            </label>
            <label>
              Status
              <select name="status">
                ${CAMPSITE_STATUSES.map((status) => `<option value="${status}">${formatStatus(status)}</option>`).join("")}
              </select>
            </label>
            <label class="full-row">
              Notes
              <textarea name="notes" rows="2" placeholder="Notes"></textarea>
            </label>
            <p id="campsite-error" class="form-error hidden" role="alert"></p>
            <div class="form-actions full-row">
              <button type="submit" class="small">Save Campsite</button>
              <button type="button" id="cancel-campsite-edit" class="small secondary hidden">Cancel</button>
            </div>
          </form>
          <div class="entity-list">
            ${campsites.length ? campsites.map((site) => renderCampsiteItem(site)).join("") : '<p class="state-message">No campsite candidates yet.</p>'}
          </div>
        </div>
      </div>

      <div class="detail-block">
        <h3>Itinerary</h3>
        <form id="itinerary-form" class="inline-form" novalidate>
          <input id="itineraryId" name="itineraryId" type="hidden" />
          <label>
            Item
            <input name="title" placeholder="Plan item" required />
          </label>
          <label>
            Day #
            <input name="dayNumber" type="number" min="1" value="1" required />
          </label>
          <label class="full-row">
            Details
            <textarea name="details" rows="2" placeholder="Details"></textarea>
          </label>
          <p id="itinerary-error" class="form-error hidden" role="alert"></p>
          <div class="form-actions full-row">
            <button type="submit" class="small">Save Itinerary Item</button>
            <button type="button" id="cancel-itinerary-edit" class="small secondary hidden">Cancel</button>
          </div>
        </form>
        <p class="meta">Completion: ${itineraryCompletionPercent(trip)}%</p>
        <div class="entity-list">
          ${itinerary.length ? itinerary.map((item) => renderItineraryItem(item)).join("") : '<p class="state-message">No itinerary items yet.</p>'}
        </div>
      </div>
    </div>
  `;

  bindDetailForms(trip.id);
}

function bindDetailForms(tripId) {
  const inviteeForm = document.getElementById("invitee-form");
  const cancelInviteeEdit = document.getElementById("cancel-invitee-edit");
  const inviteeError = document.getElementById("invitee-error");
  const campsiteForm = document.getElementById("campsite-form");
  const cancelCampsiteEdit = document.getElementById("cancel-campsite-edit");
  const campsiteError = document.getElementById("campsite-error");
  const itineraryForm = document.getElementById("itinerary-form");
  const cancelItineraryEdit = document.getElementById("cancel-itinerary-edit");
  const itineraryError = document.getElementById("itinerary-error");

  if (inviteeForm) {
    inviteeForm.addEventListener("submit", (event) => {
      event.preventDefault();
      hideMessage(inviteeError);

      const trip = trips.find((item) => item.id === tripId);
      if (!trip) return;

      const data = new FormData(inviteeForm);
      const inviteeId = String(data.get("inviteeId") || "");
      const payload = {
        name: String(data.get("name") || "").trim(),
        status: normalizeInviteeStatus(String(data.get("status") || "pending")),
        notes: String(data.get("notes") || "").trim(),
      };

      if (!payload.name) {
        showMessage(inviteeError, "Invitee name is required.");
        return;
      }

      if (inviteeId) {
        const index = trip.invitees.findIndex((item) => item.id === inviteeId);
        if (index < 0) {
          showMessage(inviteeError, "Unable to edit invitee. Please try again.");
          return;
        }
        trip.invitees[index] = { ...trip.invitees[index], ...payload };
      } else {
        trip.invitees.push({
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          ...payload,
        });
      }

      trip.updatedAt = new Date().toISOString();
      persist();
      render();
    });

    cancelInviteeEdit.addEventListener("click", () => {
      inviteeForm.reset();
      inviteeForm.elements.inviteeId.value = "";
      cancelInviteeEdit.classList.add("hidden");
      hideMessage(inviteeError);
    });
  }

  if (campsiteForm) {
    campsiteForm.addEventListener("submit", (event) => {
      event.preventDefault();
      hideMessage(campsiteError);

      const trip = trips.find((item) => item.id === tripId);
      if (!trip) return;

      const data = new FormData(campsiteForm);
      const campsiteId = String(data.get("campsiteId") || "");
      const payload = {
        name: String(data.get("name") || "").trim(),
        source: String(data.get("source") || "").trim(),
        status: normalizeCampsiteStatus(String(data.get("status") || "unsearched")),
        notes: String(data.get("notes") || "").trim(),
      };

      if (!payload.name) {
        showMessage(campsiteError, "Campsite name is required.");
        return;
      }

      if (campsiteId) {
        const index = trip.campsites.findIndex((item) => item.id === campsiteId);
        if (index < 0) {
          showMessage(campsiteError, "Unable to edit campsite. Please try again.");
          return;
        }
        trip.campsites[index] = { ...trip.campsites[index], ...payload };
      } else {
        trip.campsites.push({
          id: crypto.randomUUID(),
          upvotes: 0,
          downvotes: 0,
          createdAt: new Date().toISOString(),
          ...payload,
        });
      }

      if (payload.status === "booked") {
        const targetId = campsiteId || trip.campsites[trip.campsites.length - 1].id;
        trip.campsites = ensureSingleBookedCampsite(trip.campsites, targetId);
      }

      trip.updatedAt = new Date().toISOString();
      persist();
      render();
    });

    cancelCampsiteEdit.addEventListener("click", () => {
      campsiteForm.reset();
      campsiteForm.elements.campsiteId.value = "";
      cancelCampsiteEdit.classList.add("hidden");
      hideMessage(campsiteError);
    });
  }

  if (itineraryForm) {
    itineraryForm.addEventListener("submit", (event) => {
      event.preventDefault();
      hideMessage(itineraryError);

      const trip = trips.find((item) => item.id === tripId);
      if (!trip) return;

      const data = new FormData(itineraryForm);
      const itineraryId = String(data.get("itineraryId") || "");
      const dayNumber = Math.max(1, Number(data.get("dayNumber")) || 1);
      const title = String(data.get("title") || "").trim();
      const details = String(data.get("details") || "").trim();

      if (!title) {
        showMessage(itineraryError, "Itinerary title is required.");
        return;
      }

      if (itineraryId) {
        const item = trip.itinerary.find((entry) => entry.id === itineraryId);
        if (!item) {
          showMessage(itineraryError, "Unable to edit itinerary item.");
          return;
        }
        item.dayNumber = dayNumber;
        item.title = title;
        item.details = details;
      } else {
        const maxSortOrder = trip.itinerary
          .filter((item) => item.dayNumber === dayNumber)
          .reduce((max, item) => Math.max(max, item.sortOrder), 0);

        trip.itinerary.push({
          id: crypto.randomUUID(),
          dayNumber,
          title,
          details,
          isComplete: false,
          sortOrder: maxSortOrder + 1,
          createdAt: new Date().toISOString(),
        });
      }

      trip.updatedAt = new Date().toISOString();
      persist();
      render();
    });

    cancelItineraryEdit.addEventListener("click", () => {
      itineraryForm.reset();
      itineraryForm.elements.itineraryId.value = "";
      itineraryForm.elements.dayNumber.value = "1";
      cancelItineraryEdit.classList.add("hidden");
      hideMessage(itineraryError);
    });
  }
}

function onTripDetailClick(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const action = button.dataset.action;
  const trip = trips.find((item) => item.id === selectedTripId);
  if (!trip) return;

  if (action === "delete-invitee") {
    trip.invitees = trip.invitees.filter((invitee) => invitee.id !== button.dataset.inviteeId);
    trip.updatedAt = new Date().toISOString();
    persist();
    render();
    return;
  }

  if (action === "edit-invitee") {
    const invitee = trip.invitees.find((item) => item.id === button.dataset.inviteeId);
    if (!invitee) return;

    const form = document.getElementById("invitee-form");
    form.elements.inviteeId.value = invitee.id;
    form.elements.name.value = invitee.name;
    form.elements.status.value = invitee.status;
    form.elements.notes.value = invitee.notes;
    document.getElementById("cancel-invitee-edit").classList.remove("hidden");
    return;
  }

  if (action === "delete-campsite") {
    trip.campsites = trip.campsites.filter((site) => site.id !== button.dataset.campsiteId);
    trip.updatedAt = new Date().toISOString();
    persist();
    render();
    return;
  }

  if (action === "edit-campsite") {
    const site = trip.campsites.find((item) => item.id === button.dataset.campsiteId);
    if (!site) return;

    const form = document.getElementById("campsite-form");
    form.elements.campsiteId.value = site.id;
    form.elements.name.value = site.name;
    form.elements.source.value = site.source;
    form.elements.status.value = site.status;
    form.elements.notes.value = site.notes;
    document.getElementById("cancel-campsite-edit").classList.remove("hidden");
    return;
  }

  if (action === "upvote-campsite" || action === "downvote-campsite") {
    const site = trip.campsites.find((item) => item.id === button.dataset.campsiteId);
    if (!site) return;
    if (action === "upvote-campsite") site.upvotes += 1;
    if (action === "downvote-campsite") site.downvotes += 1;
    trip.updatedAt = new Date().toISOString();
    persist();
    render();
    return;
  }

  if (action === "delete-itinerary") {
    trip.itinerary = trip.itinerary.filter((item) => item.id !== button.dataset.itineraryId);
    trip.updatedAt = new Date().toISOString();
    persist();
    render();
    return;
  }

  if (action === "edit-itinerary") {
    const item = trip.itinerary.find((entry) => entry.id === button.dataset.itineraryId);
    if (!item) return;

    const form = document.getElementById("itinerary-form");
    form.elements.itineraryId.value = item.id;
    form.elements.title.value = item.title;
    form.elements.dayNumber.value = String(item.dayNumber);
    form.elements.details.value = item.details;
    document.getElementById("cancel-itinerary-edit").classList.remove("hidden");
    return;
  }

  if (action === "move-itinerary-up" || action === "move-itinerary-down") {
    moveItineraryItem(trip, button.dataset.itineraryId, action === "move-itinerary-up" ? -1 : 1);
    trip.updatedAt = new Date().toISOString();
    persist();
    render();
  }
}

function onTripDetailChange(event) {
  const target = event.target;
  const trip = trips.find((item) => item.id === selectedTripId);
  if (!trip) return;

  if (target.matches("select[data-role='invitee-status']")) {
    const invitee = trip.invitees.find((item) => item.id === target.dataset.inviteeId);
    if (!invitee) return;
    invitee.status = normalizeInviteeStatus(target.value);
    trip.updatedAt = new Date().toISOString();
    persist();
    render();
    return;
  }

  if (target.matches("select[data-role='campsite-status']")) {
    const site = trip.campsites.find((item) => item.id === target.dataset.campsiteId);
    if (!site) return;

    site.status = normalizeCampsiteStatus(target.value);
    if (site.status === "booked") {
      trip.campsites = ensureSingleBookedCampsite(trip.campsites, site.id);
    }

    trip.updatedAt = new Date().toISOString();
    persist();
    render();
    return;
  }

  if (target.matches("input[data-role='itinerary-complete']")) {
    const item = trip.itinerary.find((entry) => entry.id === target.dataset.itineraryId);
    if (!item) return;
    item.isComplete = target.checked;
    trip.updatedAt = new Date().toISOString();
    persist();
    render();
  }
}

function moveItineraryItem(trip, itineraryId, direction) {
  const item = trip.itinerary.find((entry) => entry.id === itineraryId);
  if (!item) return;

  const sameDay = trip.itinerary
    .filter((entry) => entry.dayNumber === item.dayNumber)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const index = sameDay.findIndex((entry) => entry.id === itineraryId);
  if (index < 0) return;

  const swapIndex = index + direction;
  if (swapIndex < 0 || swapIndex >= sameDay.length) return;

  const other = sameDay[swapIndex];
  const currentOrder = item.sortOrder;
  item.sortOrder = other.sortOrder;
  other.sortOrder = currentOrder;
}

function renderInviteeItem(invitee) {
  return `
    <article class="entity-item">
      <div class="entity-head">
        <strong>${escapeHtml(invitee.name)}</strong>
        <select data-role="invitee-status" data-invitee-id="${invitee.id}">
          ${INVITEE_STATUSES.map((status) => `<option value="${status}" ${invitee.status === status ? "selected" : ""}>${formatStatus(status)}</option>`).join("")}
        </select>
      </div>
      ${invitee.notes ? `<p class="meta">${escapeHtml(invitee.notes)}</p>` : ""}
      <div class="actions">
        <button class="small secondary" type="button" data-action="edit-invitee" data-invitee-id="${invitee.id}">Edit</button>
        <button class="small secondary" type="button" data-action="delete-invitee" data-invitee-id="${invitee.id}">Delete</button>
      </div>
    </article>
  `;
}

function renderCampsiteItem(site) {
  return `
    <article class="entity-item">
      <div class="entity-head">
        <strong>${escapeHtml(site.name)}</strong>
        <select data-role="campsite-status" data-campsite-id="${site.id}">
          ${CAMPSITE_STATUSES.map((status) => `<option value="${status}" ${site.status === status ? "selected" : ""}>${formatStatus(status)}</option>`).join("")}
        </select>
      </div>
      <p class="meta">Source: ${escapeHtml(site.source || "-")}</p>
      ${site.notes ? `<p class="meta">${escapeHtml(site.notes)}</p>` : ""}
      <div class="actions">
        <div class="vote-wrap">
          <button class="small" type="button" data-action="upvote-campsite" data-campsite-id="${site.id}">+1</button>
          <span class="meta">${site.upvotes}</span>
          <button class="small secondary" type="button" data-action="downvote-campsite" data-campsite-id="${site.id}">-1</button>
          <span class="meta">${site.downvotes}</span>
        </div>
        <button class="small secondary" type="button" data-action="edit-campsite" data-campsite-id="${site.id}">Edit</button>
        <button class="small secondary" type="button" data-action="delete-campsite" data-campsite-id="${site.id}">Delete</button>
      </div>
    </article>
  `;
}

function renderItineraryItem(item) {
  return `
    <article class="entity-item">
      <div class="entity-head">
        <strong>Day ${item.dayNumber}: ${escapeHtml(item.title)}</strong>
        <label>
          <input type="checkbox" data-role="itinerary-complete" data-itinerary-id="${item.id}" ${item.isComplete ? "checked" : ""} />
          Done
        </label>
      </div>
      ${item.details ? `<p class="meta">${escapeHtml(item.details)}</p>` : ""}
      <div class="actions">
        <button class="small secondary" type="button" data-action="edit-itinerary" data-itinerary-id="${item.id}">Edit</button>
        <button class="small secondary" type="button" data-action="move-itinerary-up" data-itinerary-id="${item.id}">Move Up</button>
        <button class="small secondary" type="button" data-action="move-itinerary-down" data-itinerary-id="${item.id}">Move Down</button>
        <button class="small secondary" type="button" data-action="delete-itinerary" data-itinerary-id="${item.id}">Delete</button>
      </div>
    </article>
  `;
}

function renderStats() {
  const total = trips.length;
  const planning = trips.filter((trip) => ["idea", "planning", "in_progress"].includes(trip.status)).length;
  const booked = trips.filter((trip) => trip.status === "booked").length;
  const completed = trips.filter((trip) => trip.status === "completed").length;
  const campsiteDecisionComplete = trips.filter((trip) => trip.campsites.some((site) => site.status === "booked")).length;
  const avgItineraryCompletion = total
    ? Math.round(trips.reduce((sum, trip) => sum + itineraryCompletionPercent(trip), 0) / total)
    : 0;

  stats.innerHTML = [
    statCard("Total trips", total),
    statCard("Planning", planning),
    statCard("Booked", booked),
    statCard("Completed", completed),
    statCard("Booked site / Avg itinerary", `${campsiteDecisionComplete}/${total} | ${avgItineraryCompletion}%`),
  ].join("");
}

function statCard(label, value) {
  return `
    <article class="stat-card">
      <div class="stat-label">${label}</div>
      <div class="stat-value">${value}</div>
    </article>
  `;
}

function showMessage(element, message) {
  element.textContent = message;
  element.classList.remove("hidden");
}

function hideMessage(element) {
  element.textContent = "";
  element.classList.add("hidden");
}

function setValue(id, value) {
  const field = document.getElementById(id);
  if (field) field.value = value;
}

window.__trailPlannerDebug = {
  getTrips: () => trips,
  setTrips: (next) => {
    trips = next.map(normalizeTrip);
    selectedTripId = trips[0]?.id || null;
    persist();
    render();
  },
  statuses: {
    TRIP_STATUSES,
    CAMPSITE_STATUSES,
    INVITEE_STATUSES,
  },
};
