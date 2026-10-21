import { AnimatePresence, motion } from "framer-motion";
import { Save } from "lucide-react";
import { FACILITY_TYPES, FACILITY_TYPE_KEYS } from "../lib/facility";
import { Spinner } from "./Spinner";

export const emptyFacility = {
  name: "",
  area: "",
  type: "polyhouse",
  crop: "",
  variety: "",
  location: "",
  areaSqm: "",
  desc: "",
  lightHours: "",
  generation: "",
  totalGenerations: "",
  cycleDays: "",
  cycleStartedAt: "",
};

const dateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

export function facilityToForm(f) {
  return {
    name: f.name || "",
    type: f.type || "polyhouse",
    crop: f.crop || "",
    variety: f.variety || "",
    location: f.location || "",
    areaSqm: f.areaSqm ?? "",
    desc: f.desc || "",
    lightHours: f.photoperiod?.lightHours ?? "",
    generation: f.program?.generation ?? "",
    totalGenerations: f.program?.totalGenerations ?? "",
    cycleDays: f.program?.cycleDays ?? "",
    cycleStartedAt: dateInput(f.program?.cycleStartedAt),
  };
}

export function formToPayload(form) {
  const payload = {
    name: form.name,
    type: form.type,
    crop: form.crop,
    variety: form.variety,
    location: form.location,
    areaSqm: form.areaSqm,
    desc: form.desc,
    photoperiod: { lightHours: form.lightHours },
  };
  if (form.type === "speed_breeding") {
    payload.program = {
      generation: form.generation,
      totalGenerations: form.totalGenerations,
      cycleDays: form.cycleDays,
      cycleStartedAt: form.cycleStartedAt || undefined,
    };
  }
  return payload;
}

function Field({ id, label, children, hint }) {
  return (
    <div className="field">
      <label htmlFor={id}>
        {label} {hint && <span className="faint">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

// `areas` is passed only for super admins, who choose the area; area
// admins always create facilities in their own area.
export default function FacilityForm({ form, setForm, onSubmit, onCancel, saving, submitLabel, areas }) {
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <form className="stack" onSubmit={onSubmit}>
      <div className="type-picker" role="radiogroup" aria-label="Facility type">
        {FACILITY_TYPE_KEYS.map((key) => {
          const meta = FACILITY_TYPES[key];
          const active = form.type === key;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              className={`type-option${active ? " is-active" : ""}`}
              style={{ "--tone": meta.tone }}
              onClick={() => setForm((f) => ({ ...f, type: key }))}
            >
              <meta.icon size={18} />
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>

      {areas && (
        <Field id="f-area-id" label="Area">
          <select id="f-area-id" className="input" value={form.area} onChange={set("area")} required>
            <option value="" disabled>
              Choose an area
            </option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Field id="f-name" label="Name">
        <input
          id="f-name"
          className="input"
          placeholder="e.g. Polyhouse B · Capsicum"
          value={form.name}
          onChange={set("name")}
          required
        />
      </Field>

      <div className="form-grid">
        <Field id="f-crop" label="Crop">
          <input id="f-crop" className="input" placeholder="e.g. Wheat" value={form.crop} onChange={set("crop")} />
        </Field>
        <Field id="f-variety" label="Trial / variety">
          <input
            id="f-variety"
            className="input"
            placeholder="e.g. Heat tolerance screen"
            value={form.variety}
            onChange={set("variety")}
          />
        </Field>
        <Field id="f-location" label="Location">
          <input
            id="f-location"
            className="input"
            placeholder="e.g. North block, Bay 2"
            value={form.location}
            onChange={set("location")}
          />
        </Field>
        <Field id="f-area" label="Area" hint="(m²)">
          <input id="f-area" className="input" type="number" min="0" value={form.areaSqm} onChange={set("areaSqm")} />
        </Field>
      </div>

      <Field id="f-desc" label="Description">
        <textarea
          id="f-desc"
          className="textarea"
          placeholder="How the space is run and what is being studied"
          value={form.desc}
          onChange={set("desc")}
          required
        />
      </Field>

      <AnimatePresence initial={false}>
        {form.type !== "polyhouse" && (
          <motion.div
            key="photoperiod"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <Field id="f-light" label="Photoperiod" hint="(hours of light per day)">
              <input
                id="f-light"
                className="input"
                type="number"
                min="0"
                max="24"
                placeholder={form.type === "speed_breeding" ? "22" : "12"}
                value={form.lightHours}
                onChange={set("lightHours")}
              />
            </Field>
          </motion.div>
        )}

        {form.type === "speed_breeding" && (
          <motion.div
            key="program"
            className="form-grid"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            style={{ overflow: "hidden" }}
          >
            <Field id="f-gen" label="Current generation">
              <input id="f-gen" className="input" type="number" min="0" value={form.generation} onChange={set("generation")} />
            </Field>
            <Field id="f-total" label="Target generations">
              <input
                id="f-total"
                className="input"
                type="number"
                min="0"
                value={form.totalGenerations}
                onChange={set("totalGenerations")}
              />
            </Field>
            <Field id="f-days" label="Days per cycle">
              <input id="f-days" className="input" type="number" min="1" value={form.cycleDays} onChange={set("cycleDays")} />
            </Field>
            <Field id="f-start" label="Cycle started">
              <input id="f-start" className="input" type="date" value={form.cycleStartedAt} onChange={set("cycleStartedAt")} />
            </Field>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="modal-actions">
        <button type="button" className="btn btn-quiet" onClick={onCancel}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? <Spinner /> : <Save size={16} />} {submitLabel}
        </button>
      </div>
    </form>
  );
}
