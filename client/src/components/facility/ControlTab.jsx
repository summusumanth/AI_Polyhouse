import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CircleAlert, Lock, Save, TriangleAlert } from "lucide-react";
import { EQUIPMENT, TARGET_FIELDS, TARGET_GROUPS, dli, hasChannel } from "../../lib/facility";
import { api } from "../../lib/api";
import { useToast } from "../Toast";
import { Spinner } from "../Spinner";
import ActuatorPanel from "../ActuatorPanel";

const panelIn = (delay) => ({
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay },
});

// Targets that matter to this facility: the required three, any whose
// sensor reports, any already set, and any whose equipment is fitted.
const NEEDS_EQUIPMENT = { re_co2: "co2Valve", re_light: "lights", re_shade: "shade" };

export function AlertList({ alerts }) {
  if (!alerts?.length) return null;
  return (
    <div className="alert-list">
      {alerts.map((a) => (
        <div key={a.key} className={`alert-item alert-${a.level}`}>
          {a.level === "danger" ? <CircleAlert size={16} /> : <TriangleAlert size={16} />}
          <div>
            <strong>{a.title}</strong>
            <span>{a.detail}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ControlTab({ facility, facilityId, latest, state, canOperate, onSaved }) {
  const toast = useToast();
  const threshold = state?.threshold;
  const fitted = new Set((state?.equipment || []).map((e) => e.key));
  const [targets, setTargets] = useState(() => Object.fromEntries(TARGET_FIELDS.map((f) => [f.key, ""])));
  const [saving, setSaving] = useState(false);

  // Fill the form once targets arrive; later polls must not overwrite typing.
  const [seeded, setSeeded] = useState(false);
  useEffect(() => {
    if (!seeded && threshold) {
      setTargets(
        Object.fromEntries(
          // An unset optional target stays an empty box, which clears it on save.
          TARGET_FIELDS.map((f) => [f.key, threshold[f.key] == null ? "" : String(threshold[f.key])])
        )
      );
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

  const relevant = (f) =>
    f.required ||
    hasChannel(latest, f.reading) ||
    targets[f.key] !== "" ||
    (NEEDS_EQUIPMENT[f.key] && fitted.has(NEEDS_EQUIPMENT[f.key])) ||
    (facility.type === "speed_breeding" && ["re_watermin", "re_substrate", "re_leafwet"].includes(f.key));
  const visible = TARGET_FIELDS.filter(relevant);

  const photo = state?.photoperiod;
  const lightDli = dli(targets.re_light, photo?.lightHours);

  const field = (f) => (
    <div className="field" key={f.key}>
      <label htmlFor={`t-${f.key}`}>
        {f.label} <span className="faint">({f.unit})</span>
        {!f.required && <span className="faint"> · optional</span>}
      </label>
      <input
        id={`t-${f.key}`}
        className="input"
        type="number"
        min="0"
        max={f.max}
        step={f.step}
        placeholder={f.placeholder}
        value={targets[f.key]}
        onChange={(e) => setTargets((t) => ({ ...t, [f.key]: e.target.value }))}
        required={f.required}
      />
      {f.drives && <span className="faint">Drives the {f.drives}.</span>}
    </div>
  );

  return (
    <div className="grid detail-grid">
      <motion.section className="panel" {...panelIn(0.04)}>
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Fixed targets</h2>
            <span className="faint">what the equipment holds the room at</span>
          </div>
          {!canOperate && (
            <span className="pill">
              <Lock size={12} /> View only
            </span>
          )}
        </div>

        {canOperate ? (
          <form className="stack" onSubmit={save}>
            {TARGET_GROUPS.map((g) => {
              const fields = visible.filter((f) => f.group === g.id);
              if (!fields.length) return null;
              return (
                <fieldset key={g.id} className="target-group">
                  <legend>
                    {g.title}
                    {g.note && <span className="faint"> · {g.note}</span>}
                  </legend>
                  <div className="form-grid">{fields.map(field)}</div>
                  {g.id === "light" && lightDli !== null && (
                    <span className="faint">
                      {targets.re_light} µmol/m²/s for {photo.lightHours} h is a daily light integral of{" "}
                      <strong className="mono">{lightDli.toFixed(1)} mol/m²/day</strong>.
                    </span>
                  )}
                </fieldset>
              );
            })}
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? <Spinner /> : <Save size={16} />} Save targets
            </button>
          </form>
        ) : (
          <div className="targets-readonly">
            {TARGET_FIELDS.filter((f) => threshold?.[f.key] != null).map((f) => (
              <div key={f.key} className="row-between">
                <span className="muted">{f.label}</span>
                <strong className="mono">
                  {threshold[f.key]} {f.unit}
                </strong>
              </div>
            ))}
            <span className="faint">
              You have view access. Targets drive real hardware, so changing them needs Operate access from your area admin.
            </span>
          </div>
        )}
      </motion.section>

      <div className="stack" style={{ gap: 20 }}>
        <motion.section className="panel" {...panelIn(0.1)}>
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Equipment</h2>
              <span className="faint">exactly what the motor node is told, refreshed every 20 s</span>
            </div>
          </div>
          <ActuatorPanel actuators={state?.actuators} equipment={state?.equipment} message={state?.message} />
          {fitted.size === 0 && <span className="faint">No relays fitted. Tick the equipment on the facility's details.</span>}
        </motion.section>

        {state?.alerts?.length > 0 && (
          <motion.section className="panel" {...panelIn(0.14)}>
            <div className="panel-head">
              <div>
                <h2 className="panel-title">Needs attention</h2>
                <span className="faint">alerts never switch anything by themselves</span>
              </div>
            </div>
            <AlertList alerts={state.alerts} />
          </motion.section>
        )}

        <motion.section className="panel" {...panelIn(0.18)}>
          <div className="panel-head">
            <div>
              <h2 className="panel-title">How each relay decides</h2>
              <span className="faint">dead bands stop relays chattering around a target</span>
            </div>
          </div>
          <div className="rule-list">
            {(state?.equipment || []).map((e) => {
              const Icon = EQUIPMENT[e.key]?.icon;
              return (
                <div key={e.key} className="rule-row">
                  {Icon && <Icon size={15} />}
                  <strong>{e.label}</strong>
                  <span className="faint">{EQUIPMENT[e.key]?.rule}</span>
                </div>
              );
            })}
          </div>
        </motion.section>
      </div>
    </div>
  );
}
