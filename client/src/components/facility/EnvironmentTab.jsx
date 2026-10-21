import { motion } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import { CHANNELS, CHART_GROUPS, SPEED_BREEDING_SENSORS, hasChannel, seriesHasChannel } from "../../lib/facility";
import MetricTile from "../MetricTile";
import { ChannelChart } from "../ReadingsChart";
import RangeToggle from "./RangeToggle";

// Which target sits on which tile, and what to call it there.
const TILE_TARGETS = {
  temp: ["re_temp", "target"],
  humidity: ["re_humidity", "target"],
  moisture: ["re_soilmoisture", "target"],
  co2: ["re_co2", "target"],
  lightInt: ["re_light", "target"],
  substrateTemp: ["re_substrate", "target"],
  waterLevel: ["re_watermin", "min"],
  leafWetness: ["re_leafwet", "alert"],
};

// The tiles a facility always shows, reporting or not, so a sensor that has
// gone quiet is noticed. Anything else appears once the board reports it.
const BASE_TILES = {
  polyhouse: ["temp", "humidity", "moisture", "co2"],
  speed_breeding: SPEED_BREEDING_SENSORS.map((s) => s.key).filter((k) => CHANNELS[k]),
  phenotyping: ["lightInt", "temp", "humidity", "stemDia"],
};

function PhotoperiodTile({ photo, delay }) {
  const on = photo?.lightsOn;
  return (
    <motion.div
      className="panel panel-hover metric"
      style={{ "--tone": "var(--violet)" }}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
    >
      <div className="metric-top">
        <span className="metric-icon">{on ? <Sun size={18} /> : <Moon size={18} />}</span>
        {photo && <span className={`pill ${on ? "pill-on" : ""}`}>{on ? "lights on" : "dark"}</span>}
      </div>
      <div className="metric-value">
        {photo ? photo.lightHours : "--"}
        <small>h light</small>
      </div>
      <div className="metric-label">Photoperiod (RTC)</div>
      <div className="metric-note faint">
        {photo ? `${photo.lightsOnAt} to ${photo.lightsOffAt}` : "set on the facility"}
      </div>
    </motion.div>
  );
}

export default function EnvironmentTab({ facility, latest, series, hours, setHours, state }) {
  const threshold = state?.threshold;
  const reports = (key) => hasChannel(latest, key) || seriesHasChannel(series, key);
  const base = BASE_TILES[facility.type] || BASE_TILES.polyhouse;
  const tiles = [...base, ...Object.keys(CHANNELS).filter((k) => !base.includes(k) && reports(k))];
  const groups = CHART_GROUPS.filter((g) => g.keys.some(reports));
  const isSpeed = facility.type === "speed_breeding";

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="grid metrics">
        {tiles.map((key, i) => {
          const c = CHANNELS[key];
          const [targetKey, targetLabel] = TILE_TARGETS[key] || [];
          return (
            <MetricTile
              key={key}
              icon={c.icon}
              label={c.label}
              value={latest?.[key]}
              unit={c.unit}
              tone={c.tone}
              max={c.max}
              digits={c.digits}
              target={targetKey ? threshold?.[targetKey] : undefined}
              targetLabel={targetLabel}
              note={hasChannel(latest, key) ? null : "not reporting"}
              delay={Math.min(i * 0.04, 0.4)}
            />
          );
        })}
        {isSpeed && <PhotoperiodTile photo={state?.photoperiod} delay={0.4} />}
      </div>

      {groups.length === 0 ? (
        <div className="panel empty">
          <span>No readings in this window.</span>
          <span className="faint">Charts appear as soon as the sensor node reports in. See Device setup.</span>
        </div>
      ) : (
        <div className="grid chart-grid">
          {groups.map((g, i) => (
            <motion.section
              key={g.id}
              className={`panel${g.id === "climate" ? " chart-wide" : ""}`}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 + i * 0.05 }}
            >
              <div className="panel-head">
                <div>
                  <h2 className="panel-title">{g.title}</h2>
                  <span className="faint">{g.sub}</span>
                </div>
                {i === 0 && <RangeToggle hours={hours} setHours={setHours} />}
              </div>
              <ChannelChart data={series} keys={g.keys} hours={hours} height={g.height} />
            </motion.section>
          ))}
        </div>
      )}
    </div>
  );
}
