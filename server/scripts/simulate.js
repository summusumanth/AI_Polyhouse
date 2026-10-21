/*
  Fake sensor nodes.

  Posts readings through the same device endpoint a NodeMCU uses, so the
  dashboard stays live before (or without) real hardware.

    npm run simulate -- --all                 every facility, every 20 s
    npm run simulate -- <facility-id> --watch one facility, every 20 s
    npm run simulate -- <facility-id>         one reading, then exit

  Readings follow each facility's regime: the sun drives a polyhouse, a
<<<<<<< HEAD
  speed breeding room follows its photoperiod and reports all ten of its
  sensors, and a phenotyping station reports PAR, air and stem diameter.
  Each value drifts from the facility's latest stored reading, so live data
  continues the seeded history smoothly.
=======
  grow chamber follows its LED photoperiod, and a speed breeding room is lit
  for all but a couple of hours. Each value drifts from the facility's
  latest stored reading, so live data continues the seeded history smoothly.
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
*/

const mongoose = require("mongoose");
const { connectDatabase } = require("../src/config/db");
const { port, deviceKey } = require("../src/config/env");
const Polyhouse = require("../src/models/Polyhouse");
const Reading = require("../src/models/Reading");

const API = process.env.API_URL || `http://localhost:${port}`;
const INTERVAL_MS = 20000;

const args = process.argv.slice(2);
const all = args.includes("--all");
const watch = all || args.includes("--watch");
const singleId = args.find((a) => !a.startsWith("--"));

if (!all && !singleId) {
  console.error("Usage: npm run simulate -- --all");
  console.error("       npm run simulate -- <facility-id> [--watch]");
  process.exit(1);
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const noise = (amp) => (Math.random() - 0.5) * 2 * amp;
// Move a fraction of the way toward a target, so values glide rather than jump.
const approach = (from, to, rate, jitter) => from + (to - from) * rate + noise(jitter);

// What the climate is heading toward right now, for this kind of facility.
function regime(facility, hour) {
<<<<<<< HEAD
  const sun = Math.max(0, Math.sin((Math.PI * (hour - 6)) / 12));

  if (facility.type === "speed_breeding") {
    const lightHours = facility.photoperiod?.lightHours ?? 22;
    const onAt = Number(String(facility.photoperiod?.lightsOnAt ?? `${24 - lightHours}:00`).split(":")[0]);
    const lit = (hour - onAt + 24) % 24 < lightHours;
    return {
      temp: (lit ? 21.5 : 17) + sun,
      humidity: lit ? 64 : 70,
      light: lit ? 480 + 350 * sun : 0,
      co2: 800,
      substrate: lit ? 20 : 18,
      wet: lit ? 12 : 45,
    };
  }
  if (facility.type === "phenotyping") {
    const lit = hour >= 6 && hour < 20;
    return { temp: lit ? 22 : 18, humidity: lit ? 56 : 70, light: lit ? 600 : 0 };
  }
=======
  const lightHours = facility.photoperiod?.lightHours ?? 12;

  if (facility.type === "speed_breeding") {
    const lit = hour >= 24 - lightHours;
    return { temp: lit ? 22 : 17, humidity: 68, light: lit ? 480 : 0, co2: 430 };
  }
  if (facility.type === "grow_chamber") {
    const lit = hour >= 6 && hour < 6 + lightHours;
    return { temp: lit ? 30 : 24, humidity: 75, light: lit ? 650 : 0, co2: 420 };
  }
  const sun = Math.max(0, Math.sin((Math.PI * (hour - 6)) / 12));
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  return { temp: 21 + 12 * sun, humidity: 86 - 30 * sun, light: 1350 * sun, co2: 470 - 70 * sun };
}

function nextReading(facility, prev) {
  const now = new Date();
  const hour = now.getHours() + now.getMinutes() / 60;
  const target = regime(facility, hour);
<<<<<<< HEAD
  const p = prev || { temp: target.temp, humidity: target.humidity, moisture: 55, waterLevel: 90, stemDia: 3 };

  const reading = {
    polyhsid: String(facility._id),
    temp: Number(clamp(approach(p.temp ?? target.temp, target.temp, 0.2, 0.3), -5, 50).toFixed(1)),
    humidity: Number(clamp(approach(p.humidity ?? target.humidity, target.humidity, 0.2, 1), 20, 99).toFixed(1)),
  };

  if (facility.type === "phenotyping") {
    // PAR at the plants and an electronic stem-diameter sensor.
    reading.lightInt = Math.round(Math.max(0, target.light + noise(target.light ? 12 : 0)));
    reading.stemDia = Number(((p.stemDia ?? 3) + (target.light ? -0.002 : 0.003) + noise(0.003)).toFixed(2));
    return reading;
  }

  // Soil dries steadily and irrigation tops it up below 40%.
  let moisture = (p.moisture ?? 55) - 0.15 + noise(0.1);
  let flow = 0;
  if (moisture < 40) {
    moisture = 66;
    flow = 2.4 + noise(0.2);
  }
  reading.moisture = Number(clamp(moisture, 0, 100).toFixed(1));
  reading.co2 = Math.round(approach(p.co2 ?? target.co2, target.co2, 0.3, 6));

  if (facility.type === "speed_breeding") {
    let tank = (p.waterLevel ?? 90) - (flow ? 2 : 0.02);
    if (tank < 20) tank = 95;
    Object.assign(reading, {
      lightInt: Math.round(Math.max(0, target.light + noise(target.light ? 12 : 0))),
      substrateTemp: Number(approach(p.substrateTemp ?? target.substrate, target.substrate, 0.2, 0.2).toFixed(1)),
      waterLevel: Math.round(clamp(tank, 0, 100)),
      flowRate: Number(flow.toFixed(2)),
      leafWetness: Math.round(clamp(approach(p.leafWetness ?? target.wet, target.wet, 0.2, 2), 0, 100)),
=======
  const p = prev || { temp: target.temp, humidity: target.humidity, moisture: 55, N: 160, P: 55, K: 190 };

  // Soil dries steadily and is topped up by irrigation below 40%.
  let moisture = (p.moisture ?? 55) - 0.15 + noise(0.1);
  if (moisture < 40) moisture = 66;

  const reading = {
    polyhsid: String(facility._id),
    temp: Number(clamp(approach(p.temp, target.temp, 0.2, 0.3), -5, 50).toFixed(1)),
    humidity: Number(clamp(approach(p.humidity, target.humidity, 0.2, 1), 20, 99).toFixed(1)),
    moisture: Number(clamp(moisture, 0, 100).toFixed(1)),
    co2: Math.round(approach(p.co2 ?? target.co2, target.co2, 0.3, 6)),
  };

  // A polyhouse sensor board has no light or N-P-K sensor.
  if (facility.type !== "polyhouse") {
    Object.assign(reading, {
      lightInt: Math.round(Math.max(0, target.light + noise(target.light ? 12 : 0))),
      N: Math.round(clamp((p.N ?? 160) - 0.02, 40, 400)),
      P: Math.round(clamp((p.P ?? 55) - 0.01, 10, 200)),
      K: Math.round(clamp((p.K ?? 190) - 0.02, 40, 400)),
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
    });
  }
  return reading;
}

async function post(reading) {
  const headers = { "Content-Type": "application/json" };
  if (deviceKey) headers["X-Device-Key"] = deviceKey;
  const res = await fetch(`${API}/api/device/readings`, {
    method: "POST",
    headers,
    body: JSON.stringify(reading),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${res.status} ${json.message || ""}`.trim());
}

async function tick(facilities, last) {
  for (const facility of facilities) {
    const id = String(facility._id);
    const reading = nextReading(facility, last.get(id));
    try {
      await post(reading);
      last.set(id, reading);
      console.log(
        `  ${facility.name.slice(0, 34).padEnd(34)}  ${String(reading.temp).padStart(5)} °C  ` +
<<<<<<< HEAD
          `${String(reading.humidity).padStart(5)} %RH` +
          (reading.moisture !== undefined ? `  soil ${reading.moisture}%` : "") +
          (reading.lightInt !== undefined ? `  PPFD ${reading.lightInt}` : "") +
          (reading.waterLevel !== undefined ? `  tank ${reading.waterLevel}%` : "") +
          (reading.stemDia !== undefined ? `  stem ${reading.stemDia} mm` : "")
=======
          `${String(reading.humidity).padStart(5)} %RH  soil ${reading.moisture}%` +
          (reading.lightInt !== undefined ? `  light ${reading.lightInt}` : "")
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
      );
    } catch (error) {
      const unreachable = /fetch failed|ECONNREFUSED/.test(error.message);
      console.error(
        `  ${facility.name}: ${unreachable ? `cannot reach ${API} - is the server running?` : error.message}`
      );
    }
  }
}

async function main() {
  await connectDatabase();

  const query = all ? {} : { _id: singleId };
  if (!all && !mongoose.isValidObjectId(singleId)) {
    throw new Error(`"${singleId}" is not a facility id. Copy it from the facility page.`);
  }
  const facilities = await Polyhouse.find(query).lean();
  if (!facilities.length) {
    throw new Error(all ? "No facilities yet. Run npm run seed first." : `No facility with id ${singleId}`);
  }

  // Continue from what is already stored, so the charts do not jump.
  const last = new Map();
  for (const f of facilities) {
    const latest = await Reading.findOne({ polyhsid: String(f._id) }).sort({ date: -1 }).lean();
    if (latest) last.set(String(f._id), latest);
  }

  console.log(`Sending to ${API} for ${facilities.length} facilit${facilities.length === 1 ? "y" : "ies"}`);
  await tick(facilities, last);

  if (!watch) {
    await mongoose.disconnect();
    return;
  }
  console.log(`Every ${INTERVAL_MS / 1000} s. Ctrl+C to stop.`);
  setInterval(() => tick(facilities, last), INTERVAL_MS);
}

main().catch(async (error) => {
  console.error(error.message);
  await mongoose.disconnect();
  process.exit(1);
});
