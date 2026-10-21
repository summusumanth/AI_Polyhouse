/*
  Demo data for one area, Parlakhemundi:

    Facilities  Polyhouse A to E, a grow chamber and a speed breeding room,
                each with a week of sensor readings and climate targets.
                Polyhouse A, the chamber and the speed breeding room also
                carry a phenotyping trial.

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
    trial: "polyhouse",
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
    key: "chamber",
    kind: "chamber",
    trial: "chamber",
    targets: { re_temp: 30, re_humidity: 75, re_soilmoisture: 25 },
    doc: {
      name: "Grow Chamber GC-02 · Rice drought",
      type: "grow_chamber",
      crop: "Rice",
      variety: "Drought tolerance screen",
      location: "Phytotron, Room 2",
      areaSqm: 6,
      desc: "Walk-in growth chamber with LED lighting and CO2 control. Water is withheld from day 28 to compare drought-tolerant and susceptible rice lines; irrigation only rescues pots below 25% soil moisture.",
      photoperiod: { lightHours: 12 },
    },
  },
  {
    key: "speed",
    kind: "speed",
    trial: "speed",
    targets: { re_temp: 22, re_humidity: 65, re_soilmoisture: 55 },
    doc: {
      name: "Speed Breeding Room SB-01 · Wheat",
      type: "speed_breeding",
      crop: "Wheat",
      variety: "Rapid generation advance",
      location: "Breeding wing, Room 1",
      areaSqm: 18,
      desc: "22-hour photoperiod under full-spectrum LEDs at 22/17 °C to cycle wheat from seed to seed in about nine weeks, compressing six generations into one year.",
      photoperiod: { lightHours: 22 },
      program: {
        generation: 3,
        totalGenerations: 6,
        cycleStartedAt: daysAgo(38),
        cycleDays: 60,
      },
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

  let moisture = facility.kind === "chamber" ? 68 : c.refillTo || 62;
  let N = 180;
  let P = 62;
  let K = 210;
  let dayShift = 0;

  for (let i = steps; i >= 0; i -= 1) {
    const date = new Date(end - i * STEP_MIN * 60 * 1000);
    const hour = date.getHours() + date.getMinutes() / 60;
    const progress = 1 - i / steps; // 0 at the start of the week, 1 now
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
        temp: 21 + (c.tempOffset || 0) + 12 * Math.pow(sun, 1.2) + dayShift + noise(0.6),
        humidity: clamp(86 + (c.humOffset || 0) - 30 * sun + noise(2), 35, 97),
        moisture,
        co2: 470 - 70 * sun + noise(10),
      };
    } else if (facility.kind === "chamber") {
      // 12h LED day, tight climate control, and a deliberate drought.
      const lightsOn = hour >= 6 && hour < 18;
      moisture = 68 - 40 * progress + noise(0.6);
      row = {
        temp: (lightsOn ? 30 : 24) + noise(0.3),
        humidity: 75 + noise(1.5),
        moisture,
        co2: 420 + noise(8),
        lightInt: lightsOn ? 650 + noise(10) : 0,
      };
      N = 150 + noise(2);
      P = 50 + noise(1);
      K = 180 + noise(2);
    } else {
      // Speed breeding: lights off only 00:00-02:00.
      const lightsOn = !(hour >= 0 && hour < 2);
      moisture -= 0.5 * (STEP_MIN / 60);
      if (moisture < 52) moisture = 65 + noise(1);
      N -= 0.05;
      P -= 0.015;
      K -= 0.04;
      row = {
        temp: (lightsOn ? 22 : 17) + noise(0.4),
        humidity: 68 + noise(2),
        moisture,
        co2: 430 + noise(10),
        lightInt: lightsOn ? 480 + noise(10) : 0,
      };
    }

    const reading = {
      polyhsid: facilityId,
      date,
      temp: round(row.temp),
      humidity: round(row.humidity),
      moisture: round(clamp(row.moisture, 0, 100)),
      co2: Math.round(row.co2),
    };
    // A polyhouse has no light or N-P-K sensor; only chambers record them.
    if (facility.kind !== "polyhouse") {
      Object.assign(reading, {
        lightInt: Math.round(row.lightInt),
        N: Math.round(N),
        P: Math.round(P),
        K: Math.round(K),
      });
    }
    rows.push(reading);
  }
  return rows;
}

// ----------------------------------------------------------------------
// Phenotyping trials
// ----------------------------------------------------------------------

const TRIALS = {
  polyhouse: {
    startDaysAgo: 42,
    days: [7, 14, 21, 28, 35, 42],
    plotPrefix: "PH-A",
    stages: {
      7: "Vegetative",
      14: "Vegetative",
      21: "First truss",
      28: "Flowering",
      35: "Fruit set",
      42: "Fruit development",
    },
    genotypes: [
      { name: "Arka Rakshak", vigor: 1.08 },
      { name: "Arka Samrat", vigor: 1.0 },
      { name: "Abhinav", vigor: 0.95 },
      { name: "Pusa Ruby", vigor: 0.86 },
    ],
    traits: (d, v) => ({
      plantHeight: logistic(d, 170 * v, 0.12, 28),
      leafCount: logistic(d, 28 * v, 0.1, 22),
      leafArea: logistic(d, 5200 * v, 0.11, 28),
      canopyCover: Math.min(95, logistic(d, 88 * v, 0.13, 24)),
      ndvi: Math.min(0.88, 0.32 + 0.5 * Math.sqrt(v) * logistic(d, 1, 0.12, 18)),
      spad: 38 + 14 * v * logistic(d, 1, 0.1, 20),
      biomass: logistic(d, 1450 * v, 0.11, 32),
    }),
  },
  chamber: {
    startDaysAgo: 35,
    days: [7, 14, 21, 28, 35],
    plotPrefix: "GC2",
    stages: {
      7: "Seedling",
      14: "Tillering",
      21: "Tillering",
      28: "Maximum tillering",
      35: "Panicle initiation · drought",
    },
    // Tolerant lines hold their greenness once water is withheld.
    genotypes: [
      { name: "Sahbhagi Dhan", vigor: 0.98, tolerance: 0.95 },
      { name: "N22", vigor: 0.9, tolerance: 0.93 },
      { name: "IR64", vigor: 1.0, tolerance: 0.76 },
      { name: "Swarna", vigor: 1.04, tolerance: 0.72 },
    ],
    traits: (d, v, g) => {
      const stress = d > 28 ? g.tolerance : 1;
      return {
        plantHeight: logistic(d, 95 * v, 0.13, 20),
        leafCount: logistic(d, 42 * v, 0.12, 18),
        leafArea: logistic(d, 1800 * v, 0.12, 22) * stress,
        canopyCover: Math.min(95, logistic(d, 80 * v, 0.13, 20)) * stress,
        ndvi: Math.min(0.86, 0.3 + 0.52 * logistic(d, 1, 0.14, 14)) * stress,
        spad: (36 + 10 * logistic(d, 1, 0.12, 16)) * (0.5 + 0.5 * stress),
        biomass: logistic(d, 85 * v, 0.12, 24) * stress,
      };
    },
  },
  speed: {
    startDaysAgo: 38,
    days: [7, 14, 21, 28, 35],
    plotPrefix: "SB1",
    stages: {
      7: "BBCH 13 · 3 leaves",
      14: "BBCH 22 · Tillering",
      21: "BBCH 31 · Stem elongation",
      28: "BBCH 45 · Booting",
      35: "BBCH 55 · Heading",
    },
    genotypes: [
      { name: "HD 2967", vigor: 1.04 },
      { name: "DBW 187", vigor: 1.0 },
      { name: "PBW 343", vigor: 0.96 },
      { name: "Kharchia 65", vigor: 0.9 },
    ],
    traits: (d, v) => ({
      plantHeight: logistic(d, 88 * v, 0.14, 22),
      leafCount: logistic(d, 14 * v, 0.15, 14),
      leafArea: logistic(d, 420 * v, 0.14, 20),
      canopyCover: Math.min(95, logistic(d, 82 * v, 0.15, 18)),
      ndvi: Math.min(0.87, 0.3 + 0.55 * logistic(d, 1, 0.16, 14)),
      spad: 40 + 12 * logistic(d, 1, 0.13, 16),
      biomass: logistic(d, 22 * v, 0.13, 24),
    }),
  },
};

function observationsFor(trialKey, facilityId) {
  const trial = TRIALS[trialKey];
  if (!trial) return [];
  const rand = rng(hash(trialKey) ^ 104729);
  const jitter = (value, pct) => value * (1 + (rand() - 0.5) * 2 * pct);
  const rows = [];

  trial.genotypes.forEach((g, gi) => {
    for (const d of trial.days) {
      const t = trial.traits(d, g.vigor, g);
      rows.push({
        facility: facilityId,
        genotype: g.name,
        plot: `${trial.plotPrefix}/R${gi + 1}`,
        date: daysAgo(trial.startDaysAgo - d),
        growthStage: trial.stages[d],
        plantHeight: round(jitter(t.plantHeight, 0.03)),
        leafCount: Math.round(jitter(t.leafCount, 0.05)),
        leafArea: Math.round(jitter(t.leafArea, 0.04)),
        canopyCover: round(clamp(jitter(t.canopyCover, 0.03), 0, 100)),
        ndvi: round(clamp(jitter(t.ndvi, 0.02), 0, 1), 2),
        spad: round(jitter(t.spad, 0.03)),
        biomass: round(jitter(t.biomass, 0.04)),
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
      Phenotype.deleteMany({ facility: id, seeded: true }),
    ]);
    const readings = readingsFor(facility, id);
    const observations = facility.trial ? observationsFor(facility.trial, id) : [];
    await Promise.all([
      Reading.insertMany(readings),
      Threshold.create({ _id: id, ...facility.targets }),
      observations.length ? Phenotype.insertMany(observations) : null,
    ]);

    console.log(
      `  ${doc.name.padEnd(36)} ${id}  ${readings.length} readings` +
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
