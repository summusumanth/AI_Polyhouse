/*
  Demo data for one area, Parlakhemundi:

    Facilities  Polyhouse A to E           a week of climate readings, targets
                Speed breeding SB-01, SB-02  all ten speed breeding sensors,
                                             fixed targets, photoperiod
                Phenotyping PS-01, PB-01     PAR and stem sensors, and a
                                             phenotyping trial each

    People      Super Admin   super admin (all areas)
                Sumanth       area admin of Parlakhemundi
                Ramu          Polyhouse A (operate)
                Shamitha      Polyhouse B (operate)
                Deepthi Sri   Polyhouse A (operate), B and C (view)

    npm run seed

  Safe to re-run:
    - Facilities it created are updated in place, so their ids (which may
      already be flashed into sensor boards) never change. Their readings,
      targets and trials are regenerated.
    - Facilities and readings you made yourself are never touched, except
      that any facility without an area joins Parlakhemundi.
    - Accounts that already exist keep their password. New demo accounts get
      SEED_PASSWORD (default below) as their starting password.
*/

const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { connectDatabase } = require("../src/config/db");
const { migrate } = require("../src/config/migrate");
const Area = require("../src/models/Area");
const User = require("../src/models/User");
const Polyhouse = require("../src/models/Polyhouse");
const Reading = require("../src/models/Reading");
const Threshold = require("../src/models/Threshold");
const Phenotype = require("../src/models/Phenotype");
const ControlState = require("../src/models/ControlState");

const DAY_MS = 24 * 3600 * 1000;
const STEP_MIN = 30;
const HISTORY_DAYS = 7;
const DEMO_PASSWORD = process.env.SEED_PASSWORD || "polyhouse123";

// Deterministic randomness, so every seed produces the same curves.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A stable number from a string, to seed rng() per facility.
const hash = (str) => [...str].reduce((h, c) => (Math.imul(h, 31) + c.charCodeAt(0)) >>> 0, 7);

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round = (v, places = 1) => Number(v.toFixed(places));
const logistic = (t, k, r, t0) => k / (1 + Math.exp(-r * (t - t0)));
const daysAgo = (n) => new Date(Date.now() - n * DAY_MS);

// ----------------------------------------------------------------------
// The area and its facilities
// ----------------------------------------------------------------------

const AREA = { name: "Parlakhemundi", description: "Gajapati district, Odisha" };

// kind picks the climate model in readingsFor(); climate gives each
// polyhouse its own character; trial names a phenotyping trial in TRIALS.
const FACILITIES = [
  {
    key: "poly-a",
    kind: "polyhouse",
    climate: { tempOffset: 0, humOffset: 0, dryAt: 38, refillTo: 68, thirst: 1 },
    targets: { re_temp: 30, re_humidity: 65, re_soilmoisture: 45 },
    doc: {
      name: "Polyhouse A · Tomato hybrids",
      type: "polyhouse",
      crop: "Tomato",
      variety: "Hybrid evaluation, 4 lines",
      location: "North block, Bay 1",
      areaSqm: 504,
      desc: "Naturally ventilated polyhouse with fan-pad cooling, misting and drip irrigation. Evaluating four tomato lines for yield and heat tolerance under protected cultivation.",
    },
  },
  {
    key: "poly-b",
    kind: "polyhouse",
    climate: { tempOffset: -1.5, humOffset: 2, dryAt: 45, refillTo: 72, thirst: 0.9 },
    targets: { re_temp: 28, re_humidity: 65, re_soilmoisture: 50 },
    doc: {
      name: "Polyhouse B · Capsicum",
      type: "polyhouse",
      crop: "Capsicum",
      variety: "Coloured bell pepper",
      location: "North block, Bay 2",
      areaSqm: 504,
      desc: "Coloured capsicum for the local market. A shade net takes the edge off the midday heat.",
    },
  },
  {
    key: "poly-c",
    kind: "polyhouse",
    climate: { tempOffset: 0.8, humOffset: 4, dryAt: 52, refillTo: 75, thirst: 1.35 },
    targets: { re_temp: 30, re_humidity: 70, re_soilmoisture: 55 },
    doc: {
      name: "Polyhouse C · Cucumber",
      type: "polyhouse",
      crop: "Cucumber",
      variety: "Parthenocarpic, trellised",
      location: "South block, Bay 1",
      areaSqm: 400,
      desc: "Cucumber on vertical trellis. A thirsty crop, so drip irrigation runs several times a day.",
    },
  },
  {
    key: "poly-d",
    kind: "polyhouse",
    climate: { tempOffset: -2.5, humOffset: -5, dryAt: 42, refillTo: 66, thirst: 0.8 },
    targets: { re_temp: 26, re_humidity: 60, re_soilmoisture: 45 },
    doc: {
      name: "Polyhouse D · Gerbera",
      type: "polyhouse",
      crop: "Gerbera",
      variety: "Cut flowers",
      location: "South block, Bay 2",
      areaSqm: 300,
      desc: "Gerbera for cut flowers, kept cooler and drier than the vegetable houses to hold off fungal disease.",
    },
  },
  {
    key: "poly-e",
    kind: "polyhouse",
    climate: { tempOffset: -0.5, humOffset: 7, dryAt: 48, refillTo: 70, thirst: 0.7 },
    targets: { re_temp: 28, re_humidity: 75, re_soilmoisture: 50 },
    doc: {
      name: "Polyhouse E · Nursery",
      type: "polyhouse",
      crop: "Vegetable seedlings",
      variety: "Tomato, capsicum, cucumber",
      location: "Nursery block",
      areaSqm: 250,
      desc: "Raises tomato, capsicum and cucumber seedlings for the other houses. Misting keeps the air humid for young plants.",
    },
  },
  {
    key: "speed",
    kind: "speed",
    climate: { day: 21.4, night: 17, humidity: 66, light: 480, co2: 820 },
    targets: {
      re_temp: 22,
      re_humidity: 65,
      re_soilmoisture: 55,
      re_co2: 800,
      re_light: 450,
      re_shade: 1100,
      re_watermin: 15,
      re_substrate: 20,
      re_leafwet: 60,
    },
    doc: {
      name: "Speed Breeding Room SB-01 · Wheat",
      type: "speed_breeding",
      crop: "Wheat",
      variety: "Rapid generation advance",
      location: "Breeding wing, Room 1",
      areaSqm: 18,
      desc: "22-hour photoperiod under full-spectrum LEDs at 22/17 °C to cycle wheat from seed to seed in about nine weeks, compressing six generations into one year. Lines move to Phenotyping Station PS-01 for measurement.",
      photoperiod: { lightHours: 22, lightsOnAt: "02:00" },
      program: {
        generation: 3,
        totalGenerations: 6,
        cycleStartedAt: daysAgo(38),
        cycleDays: 60,
      },
    },
  },
  {
    key: "speed-2",
    kind: "speed",
    climate: { day: 23.3, night: 20, humidity: 60, light: 520, co2: 780, lightsOnAt: 4, lightHours: 20 },
    targets: {
      re_temp: 24,
      re_humidity: 60,
      re_soilmoisture: 50,
      re_co2: 750,
      re_light: 500,
      re_shade: 1100,
      re_watermin: 15,
      re_substrate: 22,
      re_leafwet: 60,
    },
    doc: {
      name: "Speed Breeding Room SB-02 · Chickpea",
      type: "speed_breeding",
      crop: "Chickpea",
      variety: "Wilt resistance backcross",
      location: "Breeding wing, Room 2",
      areaSqm: 14,
      desc: "20-hour photoperiod at 24/20 °C for chickpea, which flowers early under long days. Backcrossing a wilt-resistance gene into an elite line.",
      photoperiod: { lightHours: 20, lightsOnAt: "04:00" },
      program: {
        generation: 2,
        totalGenerations: 5,
        cycleStartedAt: daysAgo(21),
        cycleDays: 75,
      },
    },
  },
  {
    key: "pheno-wheat",
    kind: "pheno",
    trial: "wheat",
    climate: { day: 22, night: 18, light: 600, stem: 3.2 },
    doc: {
      name: "Phenotyping Station PS-01 · Wheat lines",
      type: "phenotyping",
      crop: "Wheat",
      variety: "Generation 3 lines from SB-01",
      location: "Breeding wing, Imaging bay",
      areaSqm: 12,
      desc: "Imaging gantry with RGB, thermal and multispectral cameras over the wheat lines of the current speed breeding generation. Plants are weighed at harvest to pick the lines that go forward.",
      sowingDate: daysAgo(38),
      phenoDevices: ["rgb_camera", "par_sensor", "thermal_camera", "multispectral_camera", "stem_sensor", "weighing_scale"],
    },
  },
  {
    key: "pheno-tomato",
    kind: "pheno",
    trial: "tomato",
    climate: { day: 28, night: 21, light: 900, stem: 9.5 },
    doc: {
      name: "Phenotyping Bay PB-01 · Tomato hybrids",
      type: "phenotyping",
      crop: "Tomato",
      variety: "Hybrid evaluation, 4 lines",
      location: "North block, beside Polyhouse A",
      areaSqm: 20,
      desc: "Weekly imaging and weighing of four tomato lines grown in Polyhouse A, for yield and heat tolerance.",
      sowingDate: daysAgo(48),
      phenoDevices: ["rgb_camera", "par_sensor", "thermal_camera", "stem_sensor", "weighing_scale"],
    },
  },
];

// Who gets what. Access entries refer to facility keys above.
const PEOPLE = [
  { name: "Super Admin", email: "superadmin@polyhouse.test", role: "super_admin" },
  // Sumanth's own account is kept as it is (password included) and made the
  // admin of this area.
  { name: "Sumanth", email: "sumanthmandavalli608@gmail.com", role: "area_admin" },
  { name: "Ramu", email: "ramu@polyhouse.test", role: "user", access: [["poly-a", "operate"]] },
  { name: "Shamitha", email: "shamitha@polyhouse.test", role: "user", access: [["poly-b", "operate"]] },
  {
    name: "Deepthi Sri",
    email: "deepthi.sri@polyhouse.test",
    role: "user",
    access: [
      ["poly-a", "operate"],
      ["poly-b", "view"],
      ["poly-c", "view"],
    ],
  },
];

// ----------------------------------------------------------------------
// Sensor readings: one per 30 minutes for a week, ending a moment ago.
// Each facility follows the physics of how it is run.
// ----------------------------------------------------------------------

function readingsFor(facility, facilityId) {
  const rand = rng(hash(facility.key));
  const noise = (amp) => (rand() - 0.5) * 2 * amp;
  const steps = (HISTORY_DAYS * 24 * 60) / STEP_MIN;
  const end = Date.now() - 2 * 60 * 1000;
  const c = facility.climate || {};
  const rows = [];

  let moisture = c.refillTo || 62;
  let tank = 92;
  let dayShift = 0;
  let stem = c.stem || 3;

  for (let i = steps; i >= 0; i -= 1) {
    const date = new Date(end - i * STEP_MIN * 60 * 1000);
    const hour = date.getHours() + date.getMinutes() / 60;
    if (date.getHours() === 0 && date.getMinutes() < STEP_MIN) dayShift = noise(1.5);

    let row;

    if (facility.kind === "polyhouse") {
      // Sunlight drives everything: hot and dry at noon. Drip irrigation
      // refills the soil whenever it falls to this house's threshold.
      const sun = Math.max(0, Math.sin((Math.PI * (hour - 6)) / 12));
      const evapotranspiration = (0.3 + 0.8 * sun) * (c.thirst || 1);
      moisture -= evapotranspiration * (STEP_MIN / 60);
      if (moisture < (c.dryAt || 38)) moisture = (c.refillTo || 68) + noise(2);
      row = {
        temp: round(21 + (c.tempOffset || 0) + 12 * Math.pow(sun, 1.2) + dayShift + noise(0.6)),
        humidity: round(clamp(86 + (c.humOffset || 0) - 30 * sun + noise(2), 35, 97)),
        moisture: round(clamp(moisture, 0, 100)),
        co2: Math.round(470 - 70 * sun + noise(10)),
      };
    } else if (facility.kind === "speed") {
      // Held to fixed targets under LEDs. The dark period follows the room's
      // photoperiod; sunlight through the roof adds to the LEDs at midday.
      const onAt = c.lightsOnAt ?? 2;
      const hoursLit = c.lightHours ?? 22;
      const lightsOn = (hour - onAt + 24) % 24 < hoursLit;
      const sun = Math.max(0, Math.sin((Math.PI * (hour - 6)) / 12));
      // Drip irrigation draws the tank down; it is topped up every few days.
      let flow = 0;
      moisture -= 0.5 * (STEP_MIN / 60);
      if (moisture < (facility.targets.re_soilmoisture || 55) - 2) {
        moisture = (facility.targets.re_soilmoisture || 55) + 10 + noise(1);
        flow = 2.4 + noise(0.2);
        tank -= 3.5;
      }
      if (tank < 22) tank = 95;
      const lit = lightsOn ? c.light + 380 * Math.pow(sun, 1.5) : 0;
      const humid = (c.humidity || 65) + noise(2) + (lightsOn ? 0 : 6);
      row = {
        temp: round((lightsOn ? c.day : c.night) + 1.2 * sun + noise(0.4)),
        humidity: round(clamp(humid, 30, 99)),
        moisture: round(clamp(moisture, 0, 100)),
        co2: Math.round((c.co2 || 800) + noise(25) - (lightsOn ? 30 : 0)),
        lightInt: Math.round(Math.max(0, lit + (lit ? noise(12) : 0))),
        substrateTemp: round((lightsOn ? c.day - 1.5 : c.night + 1) + noise(0.3)),
        waterLevel: Math.round(clamp(tank + noise(0.5), 0, 100)),
        flowRate: Number(Math.max(0, flow).toFixed(2)),
        // Wet leaves after the dark period's humidity peak, drying as the
        // lights warm the canopy.
        leafWetness: Math.round(clamp((lightsOn ? 12 : 48) + noise(6), 0, 100)),
      };
    } else {
      // Phenotyping station: a PAR sensor, air temperature and humidity for
      // the canopy-air difference, and a stem-diameter sensor on one plant.
      // Stems shrink a little by day as the plant loses water, and recover
      // and grow at night.
      const lightsOn = hour >= 6 && hour < 20;
      stem += 0.0015 + (lightsOn ? -0.004 : 0.006);
      row = {
        temp: round((lightsOn ? c.day : c.night) + noise(0.5)),
        humidity: round(clamp(62 + (lightsOn ? -6 : 8) + noise(2), 30, 99)),
        lightInt: Math.round(lightsOn ? c.light + noise(15) : 0),
        stemDia: Number((stem + noise(0.01)).toFixed(2)),
      };
    }

    rows.push({ polyhsid: facilityId, date, ...row });
  }
  return rows;
}

// ----------------------------------------------------------------------
// Phenotyping trials
// ----------------------------------------------------------------------

// Each trial: when it was sown, the days after sowing it was measured on,
// the lines in it, and a growth model per trait. `vigor` scales growth;
// `cooling` is how well a line keeps its canopy below air temperature
// (transpiration), which is what the thermal camera picks up.
const TRIALS = {
  wheat: {
    sownDaysAgo: 38,
    days: [7, 14, 21, 28, 35],
    plotPrefix: "PS1",
    airTemp: 22,
    ppfd: 600,
    stages: {
      7: "BBCH 13 · 3 leaves",
      14: "BBCH 22 · Tillering",
      21: "BBCH 31 · Stem elongation",
      28: "BBCH 45 · Booting",
      35: "BBCH 61 · Flowering",
    },
    genotypes: [
      { name: "HD 2967", vigor: 1.04, cooling: 1.1, floweringDay: 35 },
      { name: "DBW 187", vigor: 1.0, cooling: 1.0, floweringDay: 35 },
      { name: "PBW 343", vigor: 0.96, cooling: 0.85, floweringDay: 35 },
      { name: "Kharchia 65", vigor: 0.9, cooling: 0.6 },
    ],
    traits: (d, g) => ({
      plantHeight: logistic(d, 88 * g.vigor, 0.14, 22),
      leafCount: logistic(d, 14 * g.vigor, 0.15, 14),
      leafArea: logistic(d, 420 * g.vigor, 0.14, 20),
      canopyCover: Math.min(95, logistic(d, 82 * g.vigor, 0.15, 18)),
      leafColor: 28 + 20 * g.vigor * logistic(d, 1, 0.15, 12),
      canopyTemp: 22 - 2.4 * g.cooling * logistic(d, 1, 0.2, 12),
      ndvi: Math.min(0.87, 0.3 + 0.55 * logistic(d, 1, 0.16, 14)),
      stemDiameter: logistic(d, 3.6 * g.vigor, 0.13, 16),
      biomass: logistic(d, 22 * g.vigor, 0.13, 24),
      fruitCount: d >= 35 ? 4 + 2.5 * g.vigor : undefined, // spikes per plant
    }),
  },
  tomato: {
    sownDaysAgo: 48,
    days: [14, 21, 28, 35, 42, 48],
    plotPrefix: "PB1",
    airTemp: 28,
    ppfd: 900,
    stages: {
      14: "Vegetative",
      21: "Vegetative",
      28: "First truss · flowering",
      35: "Fruit set",
      42: "Fruit development",
      48: "First harvest",
    },
    genotypes: [
      { name: "Arka Rakshak", vigor: 1.08, cooling: 1.05, floweringDay: 28 },
      { name: "Arka Samrat", vigor: 1.0, cooling: 1.0, floweringDay: 28 },
      { name: "Abhinav", vigor: 0.95, cooling: 0.9, floweringDay: 35 },
      { name: "Pusa Ruby", vigor: 0.86, cooling: 0.7, floweringDay: 35 },
    ],
    traits: (d, g) => ({
      plantHeight: logistic(d, 150 * g.vigor, 0.12, 28),
      leafCount: logistic(d, 28 * g.vigor, 0.1, 22),
      leafArea: logistic(d, 5200 * g.vigor, 0.11, 28),
      canopyCover: Math.min(95, logistic(d, 88 * g.vigor, 0.13, 24)),
      leafColor: 30 + 16 * g.vigor * logistic(d, 1, 0.12, 18),
      canopyTemp: 28 + 1.2 - 3.2 * g.cooling * logistic(d, 1, 0.15, 18),
      ndvi: Math.min(0.88, 0.32 + 0.5 * Math.sqrt(g.vigor) * logistic(d, 1, 0.12, 18)),
      stemDiameter: logistic(d, 12 * g.vigor, 0.12, 22),
      biomass: logistic(d, 1450 * g.vigor, 0.11, 32),
      fruitCount: d >= 35 ? (d - 30) * 1.4 * g.vigor : undefined,
      yieldWeight: d >= 48 ? 820 * Math.pow(g.vigor, 2) : undefined,
    }),
  },
};

function observationsFor(trialKey, facilityId) {
  const trial = TRIALS[trialKey];
  if (!trial) return [];
  const rand = rng(hash(trialKey) ^ 104729);
  const jitter = (value, pct) => value * (1 + (rand() - 0.5) * 2 * pct);
  const keep = (value, places, pct = 0.03, lo = 0, hi = Infinity) =>
    value === undefined ? undefined : round(clamp(jitter(value, pct), lo, hi), places);
  const rows = [];

  trial.genotypes.forEach((g, gi) => {
    for (const d of trial.days) {
      const t = trial.traits(d, g);
      const airTemp = round(trial.airTemp + (rand() - 0.5));
      rows.push({
        facility: facilityId,
        genotype: g.name,
        plot: `${trial.plotPrefix}/R${gi + 1}`,
        date: daysAgo(trial.sownDaysAgo - d),
        growthStage: trial.stages[d],
        flowering: Boolean(g.floweringDay && d >= g.floweringDay),
        plantHeight: keep(t.plantHeight, 1),
        leafCount: keep(t.leafCount, 0, 0.05),
        leafArea: keep(t.leafArea, 0, 0.04),
        canopyCover: keep(t.canopyCover, 1, 0.03, 0, 100),
        leafColor: keep(t.leafColor, 1, 0.03, 0, 100),
        canopyTemp: round(t.canopyTemp + (airTemp - trial.airTemp) + (rand() - 0.5) * 0.4),
        airTemp,
        ppfd: Math.round(jitter(trial.ppfd, 0.03)),
        ndvi: keep(t.ndvi, 2, 0.02, 0, 1),
        stemDiameter: keep(t.stemDiameter, 2, 0.04),
        biomass: keep(t.biomass, 1, 0.04),
        fruitCount: keep(t.fruitCount, 0, 0.08),
        yieldWeight: keep(t.yieldWeight, 0, 0.05),
        seeded: true,
      });
    }
  });
  return rows;
}

// ----------------------------------------------------------------------

async function seedFacilities(areaId) {
  const ids = {};

  for (const facility of FACILITIES) {
    // Update in place when it exists, so the id stays the same.
    let doc = await Polyhouse.findOne({ seeded: true, name: facility.doc.name });
    if (doc) {
      doc.set({ ...facility.doc, area: areaId });
      await doc.save();
    } else {
      doc = await Polyhouse.create({ ...facility.doc, area: areaId, seeded: true });
    }
    const id = String(doc._id);
    ids[facility.key] = id;

    await Promise.all([
      Reading.deleteMany({ polyhsid: id }),
      Threshold.deleteOne({ _id: id }),
      ControlState.deleteOne({ _id: id }),
      Phenotype.deleteMany({ facility: id, seeded: true }),
    ]);
    const readings = readingsFor(facility, id);
    const observations = facility.trial ? observationsFor(facility.trial, id) : [];
    await Promise.all([
      Reading.insertMany(readings),
      // A phenotyping station controls nothing, so it has no targets.
      facility.targets ? Threshold.create({ _id: id, ...facility.targets }) : null,
      observations.length ? Phenotype.insertMany(observations) : null,
    ]);

    console.log(
      `  ${doc.name.padEnd(40)} ${id}  ${readings.length} readings` +
        (observations.length ? `, ${observations.length} observations` : "")
    );
  }

  // Seeded facilities from an older demo layout that is no longer listed.
  const stale = await Polyhouse.find({ seeded: true, _id: { $nin: Object.values(ids) } })
    .select("_id name")
    .lean();
  for (const f of stale) {
    const id = String(f._id);
    await Promise.all([
      Reading.deleteMany({ polyhsid: id }),
      Threshold.deleteOne({ _id: id }),
      ControlState.deleteOne({ _id: id }),
      Phenotype.deleteMany({ facility: id }),
      User.updateMany({}, { $pull: { access: { facility: f._id } } }),
      Polyhouse.deleteOne({ _id: f._id }),
    ]);
    console.log(`  removed old demo facility ${f.name}`);
  }
  return ids;
}

async function seedPeople(areaId, facilityIds) {
  const rows = [];
  for (const person of PEOPLE) {
    let user = await User.findOne({ email: person.email });
    const created = !user;
    if (created) {
      user = new User({
        name: person.name,
        email: person.email,
        password: await bcrypt.hash(DEMO_PASSWORD, 10),
      });
    }
    user.role = person.role;
    user.area = person.role === "super_admin" ? undefined : areaId;
    user.access = (person.access || []).map(([key, level]) => ({ facility: facilityIds[key], level }));
    await user.save();
    rows.push({ person, created });
  }
  return rows;
}

const ROLE_LABEL = { super_admin: "super admin", area_admin: "area admin", user: "user" };

async function main() {
  await connectDatabase();
  await migrate();

  const area = await Area.findOneAndUpdate(
    { name: AREA.name },
    { $setOnInsert: AREA },
    { upsert: true, new: true }
  );
  console.log(`Area ${area.name}`);

  const facilityIds = await seedFacilities(area._id);

  // Anything created by hand before areas existed joins this area too.
  const adopted = await Polyhouse.updateMany(
    { $or: [{ area: { $exists: false } }, { area: null }] },
    { $set: { area: area._id } }
  );
  if (adopted.modifiedCount) {
    console.log(`  ${adopted.modifiedCount} existing facility(ies) moved into ${area.name}`);
  }

  console.log("\nAccounts");
  const short = Object.fromEntries(FACILITIES.map((f) => [f.key, f.doc.name.split(" · ")[0]]));
  for (const { person, created } of await seedPeople(area._id, facilityIds)) {
    const access = (person.access || []).map(([key, level]) => `${short[key]} (${level})`).join(", ");
    console.log(
      `  ${person.name.padEnd(12)} ${person.email.padEnd(32)} ${ROLE_LABEL[person.role].padEnd(12)}` +
        `${access}${created ? "  [new]" : ""}`
    );
  }
  console.log(`\nNew demo accounts start with the password "${DEMO_PASSWORD}" (set SEED_PASSWORD to change it).`);
  console.log("Existing accounts kept their own password.");

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Seed failed:", error.message);
  await mongoose.disconnect();
  process.exit(1);
});
