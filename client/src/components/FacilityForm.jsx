import { AnimatePresence, motion } from "framer-motion";
import { Check, Save, Video } from "lucide-react";
import {
  CAMERA_FORMATS,
  CAMERA_LABELS,
  CAMERA_ROLES,
  DEFAULT_EQUIPMENT,
  EQUIPMENT,
  EQUIPMENT_KEYS,
  FACILITY_TYPES,
  FACILITY_TYPE_KEYS,
  PHENO_DEVICES,
  PHENO_DEVICE_KEYS,
  detectCameraFormat,
} from "../lib/facility";
import { Spinner } from "./Spinner";

const emptyCamera = () => ({ url: "", format: "auto", snapshotUrl: "" });
const emptyCameras = () => ({ room: emptyCamera(), rgb: emptyCamera(), thermal: emptyCamera(), multispectral: emptyCamera() });

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
  lightsOnAt: "",
  generation: "",
  totalGenerations: "",
  cycleDays: "",
  cycleStartedAt: "",
  sowingDate: "",
  // null = the type's default set, until someone ticks a box.
  equipment: null,
  phenoDevices: ["rgb_camera", "par_sensor"],
  cameras: emptyCameras(),
};

const dateInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : "");

export function facilityToForm(f) {
  const cameras = emptyCameras();
  for (const role of Object.keys(cameras)) {
    const cam = f.cameras?.[role];
    if (cam?.url) cameras[role] = { url: cam.url, format: cam.format || "auto", snapshotUrl: cam.snapshotUrl || "" };
  }
  return {
    name: f.name || "",
    type: f.type || "polyhouse",
    crop: f.crop || "",
    variety: f.variety || "",
    location: f.location || "",
    areaSqm: f.areaSqm ?? "",
    desc: f.desc || "",
    lightHours: f.photoperiod?.lightHours ?? "",
    lightsOnAt: f.photoperiod?.lightsOnAt ?? "",
    generation: f.program?.generation ?? "",
    totalGenerations: f.program?.totalGenerations ?? "",
    cycleDays: f.program?.cycleDays ?? "",
    cycleStartedAt: dateInput(f.program?.cycleStartedAt),
    sowingDate: dateInput(f.sowingDate),
    equipment: Array.isArray(f.equipment) ? f.equipment : null,
    phenoDevices: Array.isArray(f.phenoDevices) ? f.phenoDevices : [],
    cameras,
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
  };
  if (form.type !== "phenotyping") {
    payload.photoperiod = { lightHours: form.lightHours, lightsOnAt: form.lightsOnAt };
    if (form.equipment) payload.equipment = form.equipment;
  }
  if (form.type === "speed_breeding") {
    payload.program = {
      generation: form.generation,
      totalGenerations: form.totalGenerations,
      cycleDays: form.cycleDays,
      cycleStartedAt: form.cycleStartedAt || undefined,
    };
  }
  if (form.type === "phenotyping") {
    payload.sowingDate = form.sowingDate;
    payload.phenoDevices = form.phenoDevices;
  }
  // Only this type's camera slots. A phenotyping camera whose device is not
  // ticked is cleared.
  const cameras = {};
  for (const role of CAMERA_ROLES[form.type] || []) {
    const device = Object.entries(PHENO_DEVICES).find(([, d]) => d.camera === role)?.[0];
    const fitted = form.type !== "phenotyping" || form.phenoDevices.includes(device);
    cameras[role] = fitted ? form.cameras[role] : { url: "" };
  }
  if (Object.keys(cameras).length) payload.cameras = cameras;
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

function Section({ id, title, note, children }) {
  return (
    <motion.section
      key={id}
      className="form-section"
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      style={{ overflow: "hidden" }}
    >
      <div className="form-section-head">
        <h3 className="panel-subtitle">{title}</h3>
        {note && <span className="faint">{note}</span>}
      </div>
      {children}
    </motion.section>
  );
}

const hhmm = (minutes) => {
  const m = ((Math.round(minutes) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
};

// When the lights go off. Without a start time the server starts the day
// so that the dark period ends at midnight (22 h: on 02:00, off 00:00).
const schedulePreview = (on, hours) => {
  const h = Number(hours);
  if (hours === "" || !Number.isFinite(h)) return null;
  const start = on ? on.split(":").map(Number).reduce((a, b, i) => (i ? a + b : b * 60), 0) : (24 - h) * 60;
  return { on: hhmm(start), off: hhmm(start + h * 60) };
};

const FORMAT_HELP = {
  rtsp: "Plays through the MediaMTX gateway as WebRTC. Most IP cameras and NVRs offer RTSP.",
  mjpeg: "Relayed by the server, so the camera's address and password stay private.",
  snapshot: "Relayed by the server and refreshed every 5 seconds.",
  hls: "Played straight from the camera or NVR by the browser.",
  video: "Played straight from its address by the browser.",
  page: "The camera's own viewer, shown in a frame. Its address is visible to viewers.",
};

// URL, format and an optional still-image URL for one camera slot.
export function CameraFields({ role, value, onChange, analysis = false }) {
  const set = (key) => (e) => onChange({ ...value, [key]: e.target.value });
  const detected = detectCameraFormat(value.url);
  const resolved = value.format === "auto" ? detected : value.format;
  const id = `cam-${role}`;

  return (
    <div className="camera-fields">
      <div className="form-grid camera-fields-main">
        <Field id={`${id}-url`} label={`${CAMERA_LABELS[role]} URL`}>
          <input
            id={`${id}-url`}
            className="input mono-input"
            placeholder="rtsp://user:pass@192.168.1.64:554/Streaming/Channels/101"
            value={value.url}
            onChange={set("url")}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Field id={`${id}-format`} label="Stream type">
          <select id={`${id}-format`} className="input" value={value.format} onChange={set("format")}>
            {CAMERA_FORMATS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.key === "auto" && detected ? `Detect (${CAMERA_FORMATS.find((x) => x.key === detected)?.label})` : f.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {value.url && resolved && <span className="faint camera-help">{FORMAT_HELP[resolved]}</span>}
      {value.url && (analysis || ["rtsp", "hls", "video", "page"].includes(resolved)) && (
        <Field
          id={`${id}-snap`}
          label="Snapshot URL"
          hint={analysis ? "(optional, a still image for plant image analysis)" : "(optional, a still image of the same camera)"}
        >
          <input
            id={`${id}-snap`}
            className="input mono-input"
            placeholder="http://192.168.1.64/ISAPI/Streaming/channels/101/picture"
            value={value.snapshotUrl}
            onChange={set("snapshotUrl")}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
      )}
    </div>
  );
}

function ToggleCard({ active, onClick, icon: Icon, title, sub }) {
  return (
    <button type="button" role="checkbox" aria-checked={active} className={`toggle-card${active ? " is-active" : ""}`} onClick={onClick}>
      <span className="toggle-card-icon">
        <Icon size={16} />
      </span>
      <span className="toggle-card-text">
        <strong>{title}</strong>
        {sub && <span className="faint">{sub}</span>}
      </span>
      <span className="toggle-card-check">{active && <Check size={13} />}</span>
    </button>
  );
}

// `areas` is passed only for super admins, who choose the area; area
// admins always create facilities in their own area.
export default function FacilityForm({ form, setForm, onSubmit, onCancel, saving, submitLabel, areas }) {
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setCamera = (role) => (value) => setForm((f) => ({ ...f, cameras: { ...f.cameras, [role]: value } }));
  const equipment = form.equipment || DEFAULT_EQUIPMENT[form.type] || [];
  const toggle = (list, key) => (list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);
  const preview = schedulePreview(form.lightsOnAt, form.lightHours);

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
              onClick={() => setForm((f) => ({ ...f, type: key, equipment: f.type === key ? f.equipment : null }))}
            >
              <meta.icon size={18} />
              <span>{meta.label}</span>
            </button>
          );
        })}
      </div>
      <p className="faint type-blurb">{FACILITY_TYPES[form.type].blurb}</p>

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
          placeholder={
            form.type === "speed_breeding"
              ? "e.g. Speed Breeding Room SB-01 · Wheat"
              : form.type === "phenotyping"
                ? "e.g. Phenotyping Station PS-01"
                : "e.g. Polyhouse B · Capsicum"
          }
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
          <input id="f-variety" className="input" placeholder="e.g. Heat tolerance screen" value={form.variety} onChange={set("variety")} />
        </Field>
        <Field id="f-location" label="Location">
          <input id="f-location" className="input" placeholder="e.g. North block, Bay 2" value={form.location} onChange={set("location")} />
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
        {form.type === "speed_breeding" && (
          <Section key="camera" id="camera" title="Room camera" note="watch the room from its facility page">
            <CameraFields role="room" value={form.cameras.room} onChange={setCamera("room")} />
          </Section>
        )}

        {form.type === "speed_breeding" && (
          <Section key="photoperiod" id="photoperiod" title="Photoperiod" note="the grow lights follow this schedule (RTC)">
            <div className="form-grid">
              <Field id="f-light" label="Hours of light per day">
                <input
                  id="f-light"
                  className="input"
                  type="number"
                  min="0"
                  max="24"
                  step="0.5"
                  placeholder="22"
                  value={form.lightHours}
                  onChange={set("lightHours")}
                />
              </Field>
              <Field id="f-on" label="Lights on at" hint={preview ? `(${preview.on} to ${preview.off})` : ""}>
                <input id="f-on" className="input" type="time" value={form.lightsOnAt} onChange={set("lightsOnAt")} />
              </Field>
            </div>
          </Section>
        )}

        {form.type === "speed_breeding" && (
          <Section key="program" id="program" title="Generation programme">
            <div className="form-grid">
              <Field id="f-gen" label="Current generation">
                <input id="f-gen" className="input" type="number" min="0" value={form.generation} onChange={set("generation")} />
              </Field>
              <Field id="f-total" label="Target generations">
                <input id="f-total" className="input" type="number" min="0" value={form.totalGenerations} onChange={set("totalGenerations")} />
              </Field>
              <Field id="f-days" label="Days per cycle">
                <input id="f-days" className="input" type="number" min="1" value={form.cycleDays} onChange={set("cycleDays")} />
              </Field>
              <Field id="f-start" label="Cycle started">
                <input id="f-start" className="input" type="date" value={form.cycleStartedAt} onChange={set("cycleStartedAt")} />
              </Field>
            </div>
          </Section>
        )}

        {form.type !== "phenotyping" && (
          <Section key="equipment" id="equipment" title="Equipment fitted" note="only ticked relays are switched">
            <div className="toggle-grid">
              {EQUIPMENT_KEYS.map((key) => (
                <ToggleCard
                  key={key}
                  active={equipment.includes(key)}
                  onClick={() => setForm((f) => ({ ...f, equipment: toggle(equipment, key) }))}
                  icon={EQUIPMENT[key].icon}
                  title={EQUIPMENT[key].label}
                />
              ))}
            </div>
          </Section>
        )}

        {form.type === "phenotyping" && (
          <Section key="sowing" id="sowing" title="Trial">
            <Field id="f-sown" label="Sowing date" hint="(flowering time is counted from here)">
              <input id="f-sown" className="input" type="date" value={form.sowingDate} onChange={set("sowingDate")} />
            </Field>
          </Section>
        )}

        {form.type === "phenotyping" && (
          <Section key="devices" id="devices" title="Devices at this station" note="tick what is installed; cameras take a URL">
            <div className="stack" style={{ gap: 10 }}>
              {PHENO_DEVICE_KEYS.map((key) => {
                const d = PHENO_DEVICES[key];
                const on = form.phenoDevices.includes(key);
                return (
                  <div key={key} className={`device-row${on ? " is-active" : ""}`}>
                    <ToggleCard
                      active={on}
                      onClick={() => setForm((f) => ({ ...f, phenoDevices: toggle(f.phenoDevices, key) }))}
                      icon={d.icon}
                      title={
                        <>
                          {d.label} <span className={`level level-${d.level.toLowerCase()}`}>{d.level}</span>
                        </>
                      }
                      sub={d.measures}
                    />
                    {on && d.camera && (
                      <div className="device-camera">
                        <Video size={14} className="faint" />
                        <CameraFields
                          role={d.camera}
                          value={form.cameras[d.camera]}
                          onChange={setCamera(d.camera)}
                          analysis={d.camera === "rgb"}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Section>
        )}
      </AnimatePresence>

      {(CAMERA_ROLES[form.type] || []).length > 0 && (
        <p className="faint" style={{ fontSize: "0.78rem" }}>
          RTSP, MJPEG and snapshot camera addresses, and any password in them, are shown only to people who manage
          this facility. HLS, video and web-page cameras are opened by the viewer's own browser, so their address is
          visible to anyone with access.
        </p>
      )}

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
