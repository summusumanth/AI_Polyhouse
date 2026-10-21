import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Droplets, Lock, Save, Sprout, Thermometer, Wind } from "lucide-react";
import { api } from "../../lib/api";
import { formatDateTime, round } from "../../lib/format";
import { measuresLightAndNutrients } from "../../lib/facility";
import { useToast } from "../Toast";
import { Spinner } from "../Spinner";
import MetricTile from "../MetricTile";
import ActuatorPanel from "../ActuatorPanel";
import { ClimateChart, LightChart } from "../ReadingsChart";
import RangeToggle from "./RangeToggle";

const panelIn = (delay) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay },
});

export default function ClimateTab({
  facilityId,
  facilityType,
  latest,
  readings,
  series,
  hours,
  setHours,
  state,
  canOperate,
  onSaved,
}) {
  const toast = useToast();
  const threshold = state?.threshold;
  const showLight = measuresLightAndNutrients(facilityType);
  const [targets, setTargets] = useState({ re_temp: "", re_humidity: "", re_soilmoisture: "" });
  const [saving, setSaving] = useState(false);

  // Fill the form once targets arrive; later polls must not overwrite typing.
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!seeded && threshold) {
      setTargets({
        re_temp: String(threshold.re_temp),
        re_humidity: String(threshold.re_humidity),
        re_soilmoisture: String(threshold.re_soilmoisture),
      });
      setSeeded(true);
    }
  }, [threshold, seeded]);

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.saveThreshold(facilityId, targets);
      toast.success("Targets saved. Relays update on the next device poll.");
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const field = (key, label, placeholder) => (
    <div className="field">
      <label htmlFor={`t-${key}`}>{label}</label>
      <input
        id={`t-${key}`}
        className="input"
        type="number"
        min="0"
        max="100"
        step="0.5"
        placeholder={placeholder}
        value={targets[key]}
        onChange={(e) => setTargets((t) => ({ ...t, [key]: e.target.value }))}
        required
      />
    </div>
  );

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="grid metrics">
        <MetricTile icon={Thermometer} label="Air temperature" value={latest?.temp} unit="°C" tone="var(--amber)" max={45} target={threshold?.re_temp} />
        <MetricTile icon={Droplets} label="Relative humidity" value={latest?.humidity} unit="%" tone="var(--cyan)" target={threshold?.re_humidity} delay={0.06} />
        <MetricTile icon={Sprout} label="Soil moisture" value={latest?.moisture} unit="%" tone="var(--accent)" target={threshold?.re_soilmoisture} delay={0.12} />
        <MetricTile icon={Wind} label="CO₂" value={latest?.co2} unit="ppm" tone="var(--violet)" max={1500} digits={0} delay={0.18} />
      </div>

      <div className="grid detail-grid">
        <motion.section className="panel" {...panelIn(0.08)}>
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Climate</h2>
              <span className="faint">averaged over {hours <= 24 ? "the last day" : "the last week"}</span>
            </div>
            <RangeToggle hours={hours} setHours={setHours} />
          </div>
          <ClimateChart data={series} hours={hours} />
          {showLight && (
            <div style={{ marginTop: 22 }}>
              <h3 className="panel-subtitle">Light</h3>
              <LightChart data={series} hours={hours} />
            </div>
          )}
        </motion.section>

        <motion.section className="panel" {...panelIn(0.14)}>
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Target climate</h2>
              <span className="faint">what the relays work toward</span>
            </div>
            {!canOperate && (
              <span className="pill">
                <Lock size={12} /> View only
              </span>
            )}
          </div>

          {canOperate ? (
            <form className="stack" onSubmit={save}>
              {field("re_temp", "Temperature (°C)", "e.g. 30")}
              {field("re_humidity", "Humidity (%)", "e.g. 65")}
              {field("re_soilmoisture", "Soil moisture (%)", "e.g. 45")}
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? <Spinner /> : <Save size={16} />} Save targets
              </button>
            </form>
          ) : (
            <div className="targets-readonly">
              {[
                ["Temperature", threshold?.re_temp, "°C"],
                ["Humidity", threshold?.re_humidity, "%"],
                ["Soil moisture", threshold?.re_soilmoisture, "%"],
              ].map(([label, value, unit]) => (
                <div key={label} className="row-between">
                  <span className="muted">{label}</span>
                  <strong className="mono">{value ?? "--"} {value !== undefined && unit}</strong>
                </div>
              ))}
              <span className="faint">You have view access. Targets drive real hardware, so changing them needs Operate access from your area admin.</span>
            </div>
          )}

          <div style={{ marginTop: 24 }}>
            <h3 className="panel-subtitle">Relays</h3>
            <ActuatorPanel actuators={state?.actuators} message={state?.message} />
          </div>
        </motion.section>
      </div>

      <motion.section className="panel" {...panelIn(0.2)}>
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Latest readings</h2>
            <span className="faint">newest first, as the sensor node sent them</span>
          </div>
        </div>

        {readings.length === 0 ? (
          <div className="empty">
            <span>Nothing recorded yet.</span>
            <span className="faint">Open “Device setup” to connect a sensor node.</span>
          </div>
        ) : (
          <div className="table-scroll">
            <table className="data">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Temp °C</th>
                  <th>RH %</th>
                  <th>Soil %</th>
                  <th>CO₂</th>
                  {showLight && (
                    <>
                      <th>PPFD</th>
                      <th>N</th>
                      <th>P</th>
                      <th>K</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {readings.map((r) => (
                  <tr key={r._id}>
                    <td>{formatDateTime(r.date)}</td>
                    <td>{round(r.temp)}</td>
                    <td>{round(r.humidity)}</td>
                    <td>{round(r.moisture)}</td>
                    <td>{round(r.co2, 0)}</td>
                    {showLight && (
                      <>
                        <td>{round(r.lightInt, 0)}</td>
                        <td>{round(r.N, 0)}</td>
                        <td>{round(r.P, 0)}</td>
                        <td>{round(r.K, 0)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.section>
    </div>
  );
}
