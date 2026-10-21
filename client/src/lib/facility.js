import { Box, Warehouse, Zap } from "lucide-react";

export const FACILITY_TYPES = {
  polyhouse: {
    label: "Polyhouse",
    plural: "Polyhouses",
    icon: Warehouse,
    tone: "var(--accent)",
    blurb: "Naturally lit, ventilated protected cultivation: temperature and irrigation control.",
  },
  grow_chamber: {
    label: "Grow chamber",
    plural: "Grow chambers",
    icon: Box,
    tone: "var(--cyan)",
    blurb: "Fully controlled light, temperature, humidity and CO2 for repeatable experiments.",
  },
  speed_breeding: {
    label: "Speed breeding",
    plural: "Speed breeding",
    icon: Zap,
    tone: "var(--violet)",
    blurb: "A 22-hour photoperiod that cycles a crop from seed to seed in weeks, not seasons.",
  },
};

export const FACILITY_TYPE_KEYS = Object.keys(FACILITY_TYPES);

export const typeMeta = (type) => FACILITY_TYPES[type] || FACILITY_TYPES.polyhouse;

// Light and N-P-K are measured only in grow chambers and speed breeding rooms.
// A polyhouse runs on temperature, humidity and soil moisture. The server
// applies the same rule (server/src/lib/readings.js).
export const measuresLightAndNutrients = (type) => (type || "polyhouse") !== "polyhouse";

export const TRAITS = {
  plantHeight: { label: "Plant height", unit: "cm", digits: 1 },
  leafCount: { label: "Leaf count", unit: "", digits: 0 },
  leafArea: { label: "Leaf area", unit: "cm²", digits: 0 },
  canopyCover: { label: "Canopy cover", unit: "%", digits: 1 },
  ndvi: { label: "NDVI", unit: "", digits: 2 },
  spad: { label: "SPAD chlorophyll", unit: "", digits: 1 },
  biomass: { label: "Biomass", unit: "g", digits: 1 },
};

export const TRAIT_KEYS = Object.keys(TRAITS);

// Distinct, theme-safe line colours for comparing genotypes.
export const GENOTYPE_COLORS = ["#10b981", "#0ea5e9", "#8b5cf6", "#f59e0b", "#f43f5e", "#14b8a6"];

export function formatTrait(key, value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "--";
  const meta = TRAITS[key];
  return Number(value).toFixed(meta ? meta.digits : 1);
}

// Where a speed breeding cycle is, and what that means per year.
export function cycleProgress(program) {
  if (!program?.cycleStartedAt || !program?.cycleDays) return null;
  const day = Math.max(
    0,
    Math.floor((Date.now() - new Date(program.cycleStartedAt).getTime()) / 86400000)
  );
  const pct = Math.min(100, (day / program.cycleDays) * 100);
  return {
    day,
    pct,
    daysLeft: Math.max(0, program.cycleDays - day),
    generationsPerYear: Math.floor(365 / program.cycleDays),
  };
}
