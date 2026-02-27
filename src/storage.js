import { normalizeTrip } from "./utils.js";

const STORAGE_KEY = "trail_planner_state";
const SCHEMA_VERSION = 1;
const LEGACY_KEYS = ["trail_planner_state", "trail_planner_trips_v2", "trail_planner_trips_v1"];

export function loadState() {
  const base = {
    schemaVersion: SCHEMA_VERSION,
    trips: [],
    lastError: null,
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isStateObject(parsed)) {
        return {
          schemaVersion: SCHEMA_VERSION,
          trips: parsed.trips.map(normalizeTrip),
          lastError: null,
        };
      }
    }

    for (const key of LEGACY_KEYS) {
      const legacyRaw = localStorage.getItem(key);
      if (!legacyRaw) continue;
      const legacyParsed = JSON.parse(legacyRaw);

      if (Array.isArray(legacyParsed)) {
        const migrated = {
          schemaVersion: SCHEMA_VERSION,
          trips: legacyParsed.map(normalizeTrip),
          lastError: null,
        };
        saveState(migrated);
        return migrated;
      }

      if (isStateObject(legacyParsed)) {
        const migrated = {
          schemaVersion: SCHEMA_VERSION,
          trips: legacyParsed.trips.map(normalizeTrip),
          lastError: null,
        };
        saveState(migrated);
        return migrated;
      }
    }

    return base;
  } catch {
    return {
      ...base,
      lastError: "Saved data looked corrupted. Starting with a clean state.",
    };
  }
}

export function saveState(state) {
  const payload = {
    schemaVersion: SCHEMA_VERSION,
    trips: state.trips,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function isStateObject(value) {
  return Boolean(
    value &&
      typeof value === "object" &&
      Array.isArray(value.trips) &&
      typeof value.schemaVersion === "number"
  );
}
