<<<<<<< HEAD
import {
  Activity,
  Camera,
  CloudFog,
  CloudRain,
  Droplets,
  Fan,
  FlaskConical,
  Flame,
  Gauge,
  Lightbulb,
  Microscope,
  PanelTop,
  Ruler,
  Scale,
  ScanLine,
  Snowflake,
  Sprout,
  Sun,
  SunDim,
  Thermometer,
  ThermometerSun,
  Waves,
  Wind,
  Warehouse,
  Zap,
} from "lucide-react";

// ----------------------------------------------------------------- types
=======
import { Box, Warehouse, Zap } from "lucide-react";
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

export const FACILITY_TYPES = {
  polyhouse: {
    label: "Polyhouse",
    plural: "Polyhouses",
    icon: Warehouse,
    tone: "var(--accent)",
    blurb: "Naturally lit, ventilated protected cultivation: temperature and irrigation control.",
  },
<<<<<<< HEAD
=======
  grow_chamber: {
    label: "Grow chamber",
    plural: "Grow chambers",
    icon: Box,
    tone: "var(--cyan)",
    blurb: "Fully controlled light, temperature, humidity and CO2 for repeatable experiments.",
  },
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  speed_breeding: {
    label: "Speed breeding",
    plural: "Speed breeding",
    icon: Zap,
    tone: "var(--violet)",
<<<<<<< HEAD
    blurb: "A sealed room held to fixed targets on a long photoperiod, to advance generations in weeks.",
  },
  phenotyping: {
    label: "Phenotyping",
    plural: "Phenotyping",
    icon: Microscope,
    tone: "var(--cyan)",
    blurb: "A measuring station: cameras and instruments that record plant traits. It controls nothing.",
=======
    blurb: "A 22-hour photoperiod that cycles a crop from seed to seed in weeks, not seasons.",
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  },
};

export const FACILITY_TYPE_KEYS = Object.keys(FACILITY_TYPES);

export const typeMeta = (type) => FACILITY_TYPES[type] || FACILITY_TYPES.polyhouse;

<<<<<<< HEAD
export const isControlled = (type) => type !== "phenotyping";

// --------------------------------------------------------------- sensors

// Every value a sensor node can report. Mirrors server/src/lib/channels.js.
// `max` sets the full scale of the metric tile's meter.
export const CHANNELS = {
  temp: { label: "Air temperature", unit: "°C", icon: Thermometer, tone: "var(--amber)", color: "#f59e0b", digits: 1, max: 45 },
  humidity: { label: "Relative humidity", unit: "%", icon: Droplets, tone: "var(--cyan)", color: "#0ea5e9", digits: 1, max: 100 },
  co2: { label: "CO₂", unit: "ppm", icon: Wind, tone: "var(--violet)", color: "#8b5cf6", digits: 0, max: 1500 },
  lightInt: { label: "Light (PPFD)", unit: "µmol/m²/s", icon: Sun, tone: "var(--amber)", color: "#d946ef", digits: 0, max: 1500 },
  moisture: { label: "Soil moisture", unit: "%", icon: Sprout, tone: "var(--accent)", color: "#10b981", digits: 1, max: 100 },
  substrateTemp: { label: "Substrate temperature", unit: "°C", icon: ThermometerSun, tone: "var(--rose)", color: "#f43f5e", digits: 1, max: 40 },
  waterLevel: { label: "Water tank level", unit: "%", icon: Waves, tone: "var(--cyan)", color: "#0284c7", digits: 0, max: 100 },
  flowRate: { label: "Irrigation flow", unit: "L/min", icon: Activity, tone: "var(--accent)", color: "#14b8a6", digits: 2, max: 10 },
  leafWetness: { label: "Leaf wetness", unit: "%", icon: CloudRain, tone: "var(--violet)", color: "#6366f1", digits: 0, max: 100 },
  stemDia: { label: "Stem diameter", unit: "mm", icon: Ruler, tone: "var(--accent)", color: "#22c55e", digits: 2, max: 20 },
  N: { label: "Nitrogen (N)", unit: "mg/kg", icon: FlaskConical, tone: "var(--accent)", color: "#10b981", digits: 0, max: 300 },
  P: { label: "Phosphorus (P)", unit: "mg/kg", icon: FlaskConical, tone: "var(--cyan)", color: "#0ea5e9", digits: 0, max: 150 },
  K: { label: "Potassium (K)", unit: "mg/kg", icon: FlaskConical, tone: "var(--violet)", color: "#8b5cf6", digits: 0, max: 300 },
};

// The ten speed breeding sensors, as the room's sensor list shows them.
// The photoperiod ("light duration controller / RTC") is the server clock,
// so it appears as the schedule rather than as a reading.
export const SPEED_BREEDING_SENSORS = [
  { key: "temp", why: "Holds the crop's target temperature" },
  { key: "humidity", why: "Prevents excess humidity, supports healthy growth" },
  { key: "lightInt", why: "Light available for photosynthesis" },
  { key: "photoperiod", label: "Photoperiod (RTC)", unit: "h", why: "Keeps the day/night schedule" },
  { key: "co2", why: "CO₂ available for photosynthesis" },
  { key: "moisture", why: "Drives irrigation" },
  { key: "substrateTemp", why: "Temperature around the roots" },
  { key: "waterLevel", why: "Stops the pump running dry" },
  { key: "flowRate", why: "Confirms water is delivered" },
  { key: "leafWetness", why: "Conditions linked to fungal disease" },
];

// Charts on the Environment tab: one panel per group, shown when the board
// reports at least one of its channels.
export const CHART_GROUPS = [
  { id: "climate", title: "Air", sub: "temperature and humidity", keys: ["temp", "humidity"], height: 240 },
  { id: "co2", title: "CO₂", sub: "ppm", keys: ["co2"], height: 160 },
  { id: "light", title: "Light", sub: "PPFD at the canopy", keys: ["lightInt"], height: 160 },
  { id: "root", title: "Root zone", sub: "soil moisture and substrate temperature", keys: ["moisture", "substrateTemp"], height: 220 },
  { id: "tank", title: "Water tank", sub: "level; irrigation stops below the minimum", keys: ["waterLevel"], height: 160 },
  { id: "flow", title: "Irrigation flow", sub: "each spike is one irrigation", keys: ["flowRate"], height: 160 },
  { id: "leaf", title: "Leaf wetness", sub: "fungal disease risk", keys: ["leafWetness"], height: 160 },
  { id: "stem", title: "Stem diameter", sub: "daily shrink and recovery shows water status", keys: ["stemDia"], height: 180 },
  { id: "nutrients", title: "Soil nutrients", sub: "rises mark a fertigation event", keys: ["N", "P", "K"], height: 220 },
];

export const hasChannel = (latest, key) =>
  latest != null && latest[key] !== null && latest[key] !== undefined;

// True when any recent reading carried the channel, so a panel does not
// blink out because one reading happened to miss it.
export const seriesHasChannel = (series, key) =>
  Array.isArray(series) && series.some((row) => row[key] !== null && row[key] !== undefined);

// --------------------------------------------------------------- targets

// Every target the server accepts, in the order the form shows them.
// Mirrors server/src/models/Threshold.js. `group` sorts them into the
// form's sections; `drives` says what the target switches.
export const TARGET_FIELDS = [
  { key: "re_temp", reading: "temp", label: "Air temperature", unit: "°C", max: 70, step: 0.5, placeholder: "22", required: true, group: "air", drives: "fans, heater, vents" },
  { key: "re_humidity", reading: "humidity", label: "Relative humidity", unit: "%", max: 100, step: 1, placeholder: "65", required: true, group: "air", drives: "humidifier, dehumidifier" },
  { key: "re_co2", reading: "co2", label: "CO₂", unit: "ppm", max: 10000, step: 10, placeholder: "800", group: "air", drives: "CO₂ injection" },
  { key: "re_light", reading: "lightInt", label: "Light (PPFD)", unit: "µmol/m²/s", max: 3000, step: 10, placeholder: "450", group: "light", drives: "grow lights" },
  { key: "re_shade", reading: "lightInt", label: "Shade above (PPFD)", unit: "µmol/m²/s", max: 3000, step: 10, placeholder: "1100", group: "light", drives: "shade screen" },
  { key: "re_soilmoisture", reading: "moisture", label: "Soil moisture", unit: "%", max: 100, step: 1, placeholder: "55", required: true, group: "water", drives: "irrigation" },
  { key: "re_watermin", reading: "waterLevel", label: "Minimum tank level", unit: "%", max: 100, step: 1, placeholder: "15", group: "water", drives: "pump dry-run cut-out" },
  { key: "re_substrate", reading: "substrateTemp", label: "Substrate temperature", unit: "°C", max: 60, step: 0.5, placeholder: "20", group: "watch", alertOnly: true },
  { key: "re_leafwet", reading: "leafWetness", label: "Leaf wetness alert above", unit: "%", max: 100, step: 1, placeholder: "60", group: "watch", alertOnly: true },
  { key: "re_N", reading: "N", label: "Nitrogen (N)", unit: "mg/kg", max: 5000, step: 1, placeholder: "150", group: "watch", alertOnly: true },
  { key: "re_P", reading: "P", label: "Phosphorus (P)", unit: "mg/kg", max: 5000, step: 1, placeholder: "50", group: "watch", alertOnly: true },
  { key: "re_K", reading: "K", label: "Potassium (K)", unit: "mg/kg", max: 5000, step: 1, placeholder: "180", group: "watch", alertOnly: true },
];

export const TARGET_GROUPS = [
  { id: "air", title: "Air" },
  { id: "light", title: "Light" },
  { id: "water", title: "Water" },
  { id: "watch", title: "Watch only", note: "These raise an alert; nothing is switched." },
];

// ------------------------------------------------------------- actuators

// Relays a climate-controlled facility can drive. Mirrors EQUIPMENT in
// server/src/models/Polyhouse.js; `rule` is how lib/control.js decides it.
export const EQUIPMENT = {
  fan: { label: "Cooling / exhaust fans", icon: Fan, rule: "On above the temperature target." },
  cooler: { label: "Evaporative cooler", icon: Snowflake, rule: "Second cooling stage, 3 °C above target." },
  heater: { label: "Heating system", icon: Flame, rule: "On 1 °C below the temperature target." },
  vents: { label: "Ventilation windows", icon: PanelTop, rule: "Open above the temperature target, or to let humid air out." },
  mister: { label: "Humidifier / fogger", icon: CloudFog, rule: "On 5 % below the humidity target." },
  dehumidifier: { label: "Dehumidifier", icon: Gauge, rule: "On 5 % above the humidity target." },
  irrigation: { label: "Irrigation pump & valves", icon: Droplets, rule: "On below the soil moisture target; held off when the tank is low." },
  co2Valve: { label: "CO₂ injection solenoid", icon: Wind, rule: "Below the CO₂ target; held off while venting." },
  lights: { label: "LED grow lights", icon: Lightbulb, rule: "Follow the photoperiod; top up light when short of target." },
  shade: { label: "Shade screen", icon: SunDim, rule: "Closes above the shade level, reopens at 60 % of it." },
};

export const EQUIPMENT_KEYS = Object.keys(EQUIPMENT);

export const DEFAULT_EQUIPMENT = {
  polyhouse: ["fan", "cooler", "mister", "irrigation", "co2Valve", "lights"],
  speed_breeding: ["fan", "heater", "vents", "mister", "dehumidifier", "irrigation", "co2Valve", "lights", "shade"],
  phenotyping: [],
};

export const equipmentOf = (facility) =>
  Array.isArray(facility?.equipment) ? facility.equipment : DEFAULT_EQUIPMENT[facility?.type] || [];

// --------------------------------------------------------------- cameras

export const CAMERA_ROLES = {
  polyhouse: [],
  speed_breeding: ["room"],
  phenotyping: ["rgb", "thermal", "multispectral"],
};

export const CAMERA_LABELS = {
  room: "Room camera",
  rgb: "RGB camera",
  thermal: "Thermal camera",
  multispectral: "Multispectral camera",
};

export const CAMERA_FORMATS = [
  { key: "auto", label: "Detect from URL" },
  { key: "rtsp", label: "RTSP stream (via gateway)" },
  { key: "mjpeg", label: "MJPEG stream" },
  { key: "snapshot", label: "Snapshot image (refreshed)" },
  { key: "hls", label: "HLS (.m3u8)" },
  { key: "video", label: "Video file / stream" },
  { key: "page", label: "Camera web page" },
];

// Same rules as server/src/lib/cameras.js, to show the guess in the form.
export function detectCameraFormat(url) {
  const u = String(url || "").trim().toLowerCase();
  if (!u) return null;
  if (/^rtsps?:\/\//.test(u)) return "rtsp";
  const path = u.split(/[?#]/)[0];
  if (path.endsWith(".m3u8")) return "hls";
  if (/\.(mp4|webm|ogg|ogv|mov)$/.test(path)) return "video";
  if (/(mjpe?g|video\.cgi|videostream\.cgi|faststream|action=stream|\/stream$)/.test(u)) return "mjpeg";
  if (/\.(jpe?g|png|bmp)$/.test(path) || /(snapshot|snap\.cgi|image\.cgi|still|picture|action=snapshot)/.test(u)) {
    return "snapshot";
  }
  return "page";
}

// --------------------------------------------------- phenotyping devices

// The six instruments of a phenotyping station. Mirrors PHENO_DEVICES on
// the server; `camera` names the camera slot that carries its URL.
export const PHENO_DEVICES = {
  rgb_camera: {
    label: "RGB camera",
    icon: Camera,
    level: "Essential",
    camera: "rgb",
    use: "Fixed, USB or industrial IP camera",
    measures: "Plant height, leaf count, canopy size, growth rate and visible symptoms.",
  },
  par_sensor: {
    label: "PAR / PPFD sensor",
    icon: Sun,
    level: "Recommended",
    use: "Wired to the station's sensor node",
    measures: "Photosynthetic light reaching the plants (µmol/m²/s), to compare growth under different lighting.",
  },
  thermal_camera: {
    label: "Thermal camera",
    icon: ThermometerSun,
    level: "Advanced",
    camera: "thermal",
    use: "Radiometric thermal camera",
    measures: "Leaf and canopy temperature, to spot heat stress and possible water stress.",
  },
  multispectral_camera: {
    label: "Multispectral camera",
    icon: ScanLine,
    level: "Advanced",
    camera: "multispectral",
    use: "Red and near-infrared bands",
    measures: "Vegetation indices such as NDVI, an indicator of plant vigour.",
  },
  stem_sensor: {
    label: "Digital caliper / stem sensor",
    icon: Ruler,
    level: "Recommended",
    use: "Caliper by hand, or an electronic sensor on the sensor node",
    measures: "Stem thickness and its change over time.",
  },
  weighing_scale: {
    label: "Digital weighing scale",
    icon: Scale,
    level: "Recommended",
    use: "Bench scale",
    measures: "Harvested biomass, fruit weight or seed weight, for yield.",
  },
};

export const PHENO_DEVICE_KEYS = Object.keys(PHENO_DEVICES);

// ----------------------------------------------------------------- traits

// Mirrors server/src/lib/traits.js. `better` says which way ranks first.
export const TRAITS = {
  plantHeight: { label: "Plant height", unit: "cm", digits: 1, better: "high", device: "rgb_camera" },
  leafCount: { label: "Leaf count", unit: "", digits: 0, better: "high", device: "rgb_camera" },
  leafArea: { label: "Leaf area", unit: "cm²", digits: 0, better: "high", device: "rgb_camera" },
  canopyCover: { label: "Canopy cover", unit: "%", digits: 1, better: "high", device: "rgb_camera", max: 100 },
  leafColor: { label: "Leaf colour (greenness)", unit: "", digits: 1, better: "high", device: "rgb_camera", max: 100 },
  canopyTemp: { label: "Canopy temperature", unit: "°C", digits: 1, better: "low", device: "thermal_camera" },
  ndvi: { label: "NDVI", unit: "", digits: 2, better: "high", device: "multispectral_camera", min: -1, max: 1 },
  stemDiameter: { label: "Stem diameter", unit: "mm", digits: 2, better: "high", device: "stem_sensor" },
  biomass: { label: "Biomass", unit: "g", digits: 1, better: "high", device: "weighing_scale" },
  fruitCount: { label: "Fruit / pod count", unit: "", digits: 0, better: "high", device: "rgb_camera" },
  yieldWeight: { label: "Fruit / seed yield", unit: "g", digits: 0, better: "high", device: "weighing_scale" },
};

// Worked out from the observations rather than measured.
export const DERIVED = {
  growthRate: { label: "Growth rate", unit: "cm/day", digits: 2, better: "high", device: "rgb_camera" },
  canopyDelta: { label: "Canopy − air temp", unit: "°C", digits: 1, better: "low", device: "thermal_camera" },
  floweringDays: { label: "Days to flowering", unit: "days", digits: 0, better: "low", device: "rgb_camera" },
};

export const TRAIT_KEYS = Object.keys(TRAITS);
export const ALL_TRAITS = { ...TRAITS, ...DERIVED };
export const ALL_TRAIT_KEYS = Object.keys(ALL_TRAITS);

// Conditions recorded with each observation.
export const CONTEXT_FIELDS = {
  airTemp: { label: "Air temperature", unit: "°C" },
  ppfd: { label: "PPFD at the plants", unit: "µmol/m²/s" },
};

// "What can the portal measure": trait, the device or method, and the
// devices a station needs for it.
export const MEASUREMENT_MAP = [
  { trait: "Plant height", method: "RGB camera or distance sensor", needs: ["rgb_camera"], keys: ["plantHeight"] },
  { trait: "Leaf count", method: "RGB camera + computer vision", needs: ["rgb_camera"], keys: ["leafCount"] },
  { trait: "Leaf area", method: "RGB camera + image segmentation", needs: ["rgb_camera"], keys: ["leafArea", "canopyCover"] },
  { trait: "Leaf colour", method: "RGB camera (greenness index)", needs: ["rgb_camera"], keys: ["leafColor"] },
  { trait: "Growth rate", method: "Repeated images over time", needs: ["rgb_camera"], keys: ["growthRate"] },
  { trait: "Heat stress indicators", method: "Thermal camera (canopy − air)", needs: ["thermal_camera"], keys: ["canopyTemp", "canopyDelta"] },
  { trait: "Plant vigour", method: "Multispectral camera (NDVI)", needs: ["multispectral_camera"], keys: ["ndvi"] },
  { trait: "Stem thickness", method: "Digital caliper or stem sensor", needs: ["stem_sensor"], keys: ["stemDiameter"] },
  { trait: "Flowering time", method: "Camera + flowering detection", needs: ["rgb_camera"], keys: ["floweringDays"] },
  { trait: "Fruit / seed yield", method: "Camera and weighing scale", needs: ["rgb_camera", "weighing_scale"], keys: ["fruitCount", "yieldWeight"] },
];
=======
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
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

// Distinct, theme-safe line colours for comparing genotypes.
export const GENOTYPE_COLORS = ["#10b981", "#0ea5e9", "#8b5cf6", "#f59e0b", "#f43f5e", "#14b8a6"];

export function formatTrait(key, value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "--";
<<<<<<< HEAD
  const meta = ALL_TRAITS[key];
  return Number(value).toFixed(meta ? meta.digits : 1);
}

export function formatChannel(key, value) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return "--";
  return Number(value).toFixed(CHANNELS[key]?.digits ?? 1);
}

// Best-first comparator for a trait.
export const traitOrder = (key) => (a, b) =>
  ALL_TRAITS[key]?.better === "low" ? a[key] - b[key] : b[key] - a[key];

// ------------------------------------------------------- speed breeding

// Where a speed breeding cycle is, and what that means per year.
export function cycleProgress(program) {
  if (!program?.cycleStartedAt || !program?.cycleDays) return null;
  const day = Math.max(0, Math.floor((Date.now() - new Date(program.cycleStartedAt).getTime()) / 86400000));
=======
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
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  const pct = Math.min(100, (day / program.cycleDays) * 100);
  return {
    day,
    pct,
    daysLeft: Math.max(0, program.cycleDays - day),
    generationsPerYear: Math.floor(365 / program.cycleDays),
  };
}
<<<<<<< HEAD

// Daily light integral: PPFD held for the photoperiod, in mol/m²/day.
export const dli = (ppfd, lightHours) =>
  Number.isFinite(Number(ppfd)) && Number.isFinite(Number(lightHours))
    ? (Number(ppfd) * Number(lightHours) * 3600) / 1e6
    : null;
=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
