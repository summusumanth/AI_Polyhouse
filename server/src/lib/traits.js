/*
  Plant traits a phenotyping station records, and the instrument behind
  each one. Mirrored in client/src/lib/facility.js (TRAITS).

    better  which way is "good" when ranking genotypes. A cooler canopy is
            a less stressed one, so canopy temperature ranks low-first.
*/
const TRAITS = [
  { key: "plantHeight", label: "Plant height", unit: "cm", range: [0, 1000], better: "high", device: "rgb_camera" },
  { key: "leafCount", label: "Leaf count", unit: "", range: [0, 10000], better: "high", device: "rgb_camera" },
  { key: "leafArea", label: "Leaf area", unit: "cm²", range: [0, 1e6], better: "high", device: "rgb_camera" },
  { key: "canopyCover", label: "Canopy cover", unit: "%", range: [0, 100], better: "high", device: "rgb_camera" },
  { key: "leafColor", label: "Leaf colour (greenness)", unit: "", range: [0, 100], better: "high", device: "rgb_camera" },
  { key: "canopyTemp", label: "Canopy temperature", unit: "°C", range: [-10, 70], better: "low", device: "thermal_camera" },
  { key: "ndvi", label: "NDVI", unit: "", range: [-1, 1], better: "high", device: "multispectral_camera" },
  { key: "stemDiameter", label: "Stem diameter", unit: "mm", range: [0, 500], better: "high", device: "stem_sensor" },
  { key: "biomass", label: "Biomass", unit: "g", range: [0, 1e6], better: "high", device: "weighing_scale" },
  { key: "fruitCount", label: "Fruit / pod count", unit: "", range: [0, 1e5], better: "high", device: "rgb_camera" },
  { key: "yieldWeight", label: "Fruit / seed yield", unit: "g", range: [0, 1e6], better: "high", device: "weighing_scale" },
];

// Conditions at the moment of measuring, kept with the observation so
// lines can be compared fairly: air temperature for the canopy-air
// difference, PPFD for growth under different light.
const CONTEXT = [
  { key: "airTemp", label: "Air temperature", unit: "°C", range: [-20, 70] },
  { key: "ppfd", label: "PPFD at the plants", unit: "µmol/m²/s", range: [0, 3000] },
];

const TRAIT_KEYS = TRAITS.map((t) => t.key);
const CONTEXT_KEYS = CONTEXT.map((t) => t.key);

const DAY_MS = 86400000;

/*
  Traits worked out from a genotype's observations rather than measured:
    growthRate     cm/day of height between the last two height records
    canopyDelta    canopy minus air temperature at the last thermal record;
                   above 0 suggests the plant has stopped cooling itself
                   (closed stomata, often water or heat stress)
    floweringDays  days from sowing (or the first record) to the first
                   record marked flowering
  `observations` are one genotype's, any order.
*/
function derived(observations, sowingDate) {
  const rows = [...observations].sort((a, b) => new Date(a.date) - new Date(b.date));
  const out = { growthRate: null, canopyDelta: null, floweringDays: null };

  const heights = rows.filter((o) => Number.isFinite(o.plantHeight));
  if (heights.length >= 2) {
    const [a, b] = heights.slice(-2);
    const days = (new Date(b.date) - new Date(a.date)) / DAY_MS;
    if (days > 0) out.growthRate = Number(((b.plantHeight - a.plantHeight) / days).toFixed(2));
  }

  const thermal = rows.filter((o) => Number.isFinite(o.canopyTemp) && Number.isFinite(o.airTemp)).pop();
  if (thermal) out.canopyDelta = Number((thermal.canopyTemp - thermal.airTemp).toFixed(1));

  const flowered = rows.find((o) => o.flowering);
  if (flowered && rows.length) {
    const from = sowingDate ? new Date(sowingDate) : new Date(rows[0].date);
    out.floweringDays = Math.max(0, Math.round((new Date(flowered.date) - from) / DAY_MS));
  }
  return out;
}

const DERIVED = [
  { key: "growthRate", label: "Growth rate", unit: "cm/day", better: "high", device: "rgb_camera" },
  { key: "canopyDelta", label: "Canopy − air temperature", unit: "°C", better: "low", device: "thermal_camera" },
  { key: "floweringDays", label: "Days to flowering", unit: "days", better: "low", device: "rgb_camera" },
];

module.exports = { TRAITS, TRAIT_KEYS, CONTEXT, CONTEXT_KEYS, DERIVED, derived };
