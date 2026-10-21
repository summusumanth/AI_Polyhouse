/*
  The light schedule (the "RTC" controller). The server's clock decides when
  the grow lights are allowed on, so every board follows the same schedule
  and a board that reboots does not lose track of the day.

  A facility stores lightHours and lightsOnAt (HH:MM). Times are read in
  TIMEZONE from server/.env, defaulting to the server computer's own zone.
*/
const { timezone } = require("../config/env");

const DAY_MIN = 24 * 60;

const toMinutes = (hhmm) => {
  const [h, m] = String(hhmm).split(":").map(Number);
  return h * 60 + m;
};

const toHHMM = (minutes) => {
  const m = ((Math.round(minutes) % DAY_MIN) + DAY_MIN) % DAY_MIN;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

// Minutes since local midnight in the configured zone.
function minutesNow(now = new Date(), tz = timezone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return get("hour") * 60 + get("minute");
}

// Without a start time the dark period sits just before midnight is over:
// 22 h of light means dark 00:00-02:00, lights on at 02:00. That is how the
// earlier version scheduled speed breeding rooms, so nothing shifts.
const defaultLightsOnAt = (lightHours) => toHHMM((24 - lightHours) * 60);

/*
  Returns null when no photoperiod is set, otherwise:
    { lightHours, lightsOnAt, lightsOffAt, lightsOn, minutesNow,
      minutesToChange, timezone }
*/
function schedule(photoperiod, now = new Date(), tz = timezone) {
  const lightHours = Number(photoperiod?.lightHours);
  if (!Number.isFinite(lightHours)) return null;

  const lightsOnAt = photoperiod.lightsOnAt || defaultLightsOnAt(lightHours);
  const start = toMinutes(lightsOnAt);
  const duration = Math.round(lightHours * 60);
  const nowMin = minutesNow(now, tz);
  const sinceStart = (nowMin - start + DAY_MIN) % DAY_MIN;

  let lightsOn;
  let minutesToChange;
  if (duration >= DAY_MIN) {
    lightsOn = true;
    minutesToChange = null;
  } else if (duration <= 0) {
    lightsOn = false;
    minutesToChange = null;
  } else {
    lightsOn = sinceStart < duration;
    minutesToChange = lightsOn ? duration - sinceStart : DAY_MIN - sinceStart;
  }

  return {
    lightHours,
    lightsOnAt,
    lightsOffAt: toHHMM(start + duration),
    lightsOn,
    minutesNow: nowMin,
    minutesToChange,
    timezone: tz,
  };
}

module.exports = { schedule, minutesNow, defaultLightsOnAt, toHHMM };
