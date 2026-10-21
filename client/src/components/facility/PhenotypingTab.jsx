import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Camera, Flower2, ImageUp, Microscope, Plus, Save, Trophy } from "lucide-react";
import { api } from "../../lib/api";
import {
  ALL_TRAITS,
  CONTEXT_FIELDS,
  DERIVED,
  PHENO_DEVICES,
  TRAITS,
  TRAIT_KEYS,
  formatTrait,
  traitOrder,
} from "../../lib/facility";
import { useToast } from "../Toast";
import Modal from "../Modal";
import { Spinner } from "../Spinner";
import { GrowthCurves, TraitRanking, genotypeColor } from "../TraitCharts";

const DAY_MS = 86400000;

// Same rules as derived() in server/src/lib/traits.js.
export function derivedTraits(observations, sowingDate) {
  const rows = [...observations].sort((a, b) => new Date(a.date) - new Date(b.date));
  const out = { growthRate: null, canopyDelta: null, floweringDays: null };
  const heights = rows.filter((o) => Number.isFinite(o.plantHeight));
  if (heights.length >= 2) {
    const [a, b] = heights.slice(-2);
    const days = (new Date(b.date) - new Date(a.date)) / DAY_MS;
    if (days > 0) out.growthRate = (b.plantHeight - a.plantHeight) / days;
  }
  const thermal = rows.filter((o) => Number.isFinite(o.canopyTemp) && Number.isFinite(o.airTemp)).pop();
  if (thermal) out.canopyDelta = thermal.canopyTemp - thermal.airTemp;
  const flowered = rows.find((o) => o.flowering);
  if (flowered && rows.length) {
    const from = sowingDate ? new Date(sowingDate) : new Date(rows[0].date);
    out.floweringDays = Math.max(0, Math.round((new Date(flowered.date) - from) / DAY_MS));
  }
  return out;
}

// Observation form fields, grouped by the instrument that measures them.
const FORM_GROUPS = [
  { device: "rgb_camera", keys: ["plantHeight", "leafCount", "leafArea", "canopyCover", "leafColor", "fruitCount"] },
  { device: "thermal_camera", keys: ["canopyTemp"] },
  { device: "multispectral_camera", keys: ["ndvi"] },
  { device: "stem_sensor", keys: ["stemDiameter"] },
  { device: "weighing_scale", keys: ["biomass", "yieldWeight"] },
];

const emptyObservation = () => ({
  genotype: "",
  plot: "",
  growthStage: "",
  flowering: false,
  notes: "",
  date: new Date().toISOString().slice(0, 10),
  airTemp: "",
  ppfd: "",
  imageAnalysis: null,
  ...Object.fromEntries(TRAIT_KEYS.map((k) => [k, ""])),
});

export default function PhenotypingTab({ facility, canOperate, hasRgbCamera }) {
  const toast = useToast();
  const [observations, setObservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trait, setTrait] = useState("plantHeight");
  const [recordOpen, setRecordOpen] = useState(false);
  const [draft, setDraft] = useState(emptyObservation);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.listPhenotypes(facility._id);
      setObservations(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  }, [facility._id, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const genotypes = useMemo(() => [...new Set(observations.map((o) => o.genotype))].sort(), [observations]);

  // Per genotype: the newest value of every trait (yield is weighed once,
  // at harvest, so it is not always on the newest record) and the derived
  // traits.
  const lines = useMemo(
    () =>
      genotypes.map((g) => {
        const own = observations.filter((o) => o.genotype === g).sort((a, b) => new Date(a.date) - new Date(b.date));
        const last = own[own.length - 1];
        const latestOf = (k) => [...own].reverse().find((o) => Number.isFinite(o[k]))?.[k] ?? null;
        return {
          genotype: g,
          facilityName: facility.name,
          date: last.date,
          growthStage: last.growthStage,
          flowering: own.some((o) => o.flowering),
          observations: own.length,
          ...Object.fromEntries(TRAIT_KEYS.map((k) => [k, latestOf(k)])),
          ...derivedTraits(own, facility.sowingDate),
        };
      }),
    [genotypes, observations, facility.name, facility.sowingDate]
  );

  // Traits with at least one value, so the chips and table stay relevant.
  const present = useMemo(
    () => Object.keys(ALL_TRAITS).filter((k) => lines.some((l) => Number.isFinite(l[k]))),
    [lines]
  );

  useEffect(() => {
    if (present.length && !present.includes(trait)) setTrait(present[0]);
  }, [present, trait]);

  const best = useMemo(() => {
    const out = {};
    for (const key of present) {
      const sorted = lines.filter((l) => Number.isFinite(l[key])).sort(traitOrder(key));
      out[key] = sorted[0]?.[key] ?? null;
    }
    return out;
  }, [lines, present]);

  const ranked = useMemo(() => lines.filter((l) => Number.isFinite(l[trait])).sort(traitOrder(trait)), [lines, trait]);
  const leader = ranked[0] || null;

  const record = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.addPhenotype(facility._id, draft);
      toast.success(`Observation recorded for ${draft.genotype}`);
      setRecordOpen(false);
      setDraft(emptyObservation());
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const modal = (
    <RecordModal
      open={recordOpen}
      onClose={() => setRecordOpen(false)}
      draft={draft}
      setDraft={setDraft}
      onSubmit={record}
      saving={saving}
      genotypes={genotypes}
      facility={facility}
      hasRgbCamera={hasRgbCamera}
    />
  );

  if (loading) return <div className="skeleton" style={{ height: 360 }} />;

  if (!observations.length) {
    return (
      <div className="panel empty">
        <Microscope size={30} style={{ color: "var(--cyan)" }} />
        <h3>No phenotyping data yet</h3>
        <p style={{ maxWidth: "50ch" }}>
          Record plant height, leaf area, canopy temperature, NDVI, stem diameter and yield per genotype to see growth
          curves and rankings here.
        </p>
        {canOperate && (
          <button className="btn btn-primary btn-sm" onClick={() => setRecordOpen(true)}>
            <Plus size={16} /> Record observation
          </button>
        )}
        {modal}
      </div>
    );
  }

  const meta = ALL_TRAITS[trait];
  const isDerived = Boolean(DERIVED[trait]);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row-between" style={{ alignItems: "flex-start" }}>
        <div className="chips" role="radiogroup" aria-label="Trait">
          {present.map((key) => (
            <button
              key={key}
              role="radio"
              aria-checked={trait === key}
              className={`chip${trait === key ? " is-active" : ""}${DERIVED[key] ? " chip-derived" : ""}`}
              onClick={() => setTrait(key)}
              title={DERIVED[key] ? "Worked out from the observations" : undefined}
            >
              {ALL_TRAITS[key].label}
            </button>
          ))}
        </div>
        {canOperate && (
          <button className="btn btn-primary btn-sm" onClick={() => setRecordOpen(true)}>
            <Plus size={16} /> Record observation
          </button>
        )}
      </div>

      <div className="grid detail-grid">
        <motion.section
          className="panel"
          key={trait}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          <div className="panel-head">
            <div>
              <h2 className="panel-title">
                {meta.label} {meta.unit && <span className="faint">({meta.unit})</span>}
              </h2>
              <span className="faint">
                {isDerived
                  ? "worked out from the observations · " + PHENO_DEVICES[meta.device].label
                  : `${genotypes.length} genotypes · ${observations.length} observations · ${PHENO_DEVICES[meta.device].label}`}
              </span>
            </div>
          </div>
          {isDerived ? (
            <TraitRanking rows={lines} trait={trait} />
          ) : (
            <>
              <div className="chart-legend">
                {genotypes.map((g) => (
                  <span key={g} className="row" style={{ gap: 7 }}>
                    <span className="chart-swatch" style={{ background: genotypeColor(genotypes, g) }} />
                    <span className="muted">{g}</span>
                  </span>
                ))}
              </div>
              <GrowthCurves observations={observations} trait={trait} genotypes={genotypes} />
            </>
          )}
        </motion.section>

        <motion.section
          className="panel leader-panel"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.06 }}
        >
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Leading genotype</h2>
              <span className="faint">
                {meta.better === "low" ? "lowest" : "highest"} {meta.label.toLowerCase()}
              </span>
            </div>
            <Trophy size={20} style={{ color: "var(--amber)" }} />
          </div>
          {leader && (
            <motion.div
              key={`${trait}-${leader.genotype}`}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 240, damping: 20 }}
              className="leader"
            >
              <span className="chart-swatch" style={{ background: genotypeColor(genotypes, leader.genotype), width: 12, height: 12 }} />
              <strong className="leader-name">{leader.genotype}</strong>
              <span className="leader-value mono">
                {formatTrait(trait, leader[trait])} <small>{meta.unit}</small>
              </span>
              <span className="faint">{leader.growthStage}</span>
            </motion.div>
          )}
          <div className="stack" style={{ gap: 10, marginTop: 18 }}>
            {ranked.map((o, i) => {
              const values = ranked.map((r) => Math.abs(r[trait]));
              const top = Math.max(...values) || 1;
              return (
                <div key={o.genotype} className="rank-row">
                  <span className="faint mono">{i + 1}</span>
                  <span className="rank-name">{o.genotype}</span>
                  <div className="rank-bar">
                    <motion.span
                      style={{ background: genotypeColor(genotypes, o.genotype) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(Math.abs(o[trait]) / top) * 100}%` }}
                      transition={{ duration: 0.8, delay: 0.1 + i * 0.07 }}
                    />
                  </div>
                  <span className="mono rank-value">{formatTrait(trait, o[trait])}</span>
                </div>
              );
            })}
          </div>
        </motion.section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Latest value per genotype</h2>
            <span className="faint">the leader in each trait is highlighted; shaded columns are worked out, not measured</span>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Genotype</th>
                <th>Stage</th>
                <th>Date</th>
                <th>Flowering</th>
                {present.map((k) => (
                  <th key={k} className={DERIVED[k] ? "th-derived" : ""}>
                    {ALL_TRAITS[k].label}
                    {ALL_TRAITS[k].unit && ` (${ALL_TRAITS[k].unit})`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lines.map((o) => (
                <tr key={o.genotype}>
                  <td style={{ fontFamily: "var(--font)" }}>
                    <span className="row" style={{ gap: 8 }}>
                      <span className="chart-swatch" style={{ background: genotypeColor(genotypes, o.genotype) }} />
                      {o.genotype}
                    </span>
                  </td>
                  <td style={{ fontFamily: "var(--font)" }}>{o.growthStage || "--"}</td>
                  <td>{new Date(o.date).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</td>
                  <td>{o.flowering ? <Flower2 size={14} style={{ color: "var(--rose)" }} /> : "--"}</td>
                  {present.map((k) => (
                    <td key={k} className={`${o[k] === best[k] && o[k] !== null ? "cell-best" : ""}${DERIVED[k] ? " td-derived" : ""}`}>
                      {formatTrait(k, o[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {modal}
    </div>
  );
}

// Fills canopy cover and leaf colour from a photo or the RGB camera.
function ImageFill({ facility, hasRgbCamera, onResult }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(null);
  const [result, setResult] = useState(null);

  const run = async (kind, file) => {
    setBusy(kind);
    try {
      const res = kind === "photo" ? await api.analysePhoto(facility._id, file) : await api.analyseCamera(facility._id, "rgb");
      setResult(res.data);
      onResult(res.data);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="image-fill">
      <div>
        <strong>Measure from an image</strong>
        <span className="faint">
          Canopy cover and leaf colour from a top-down RGB image (Excess Green index). Check the numbers before saving.
        </span>
      </div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) run("photo", file);
          }}
        />
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => fileRef.current?.click()} disabled={Boolean(busy)}>
          {busy === "photo" ? <Spinner /> : <ImageUp size={15} />} Upload photo
        </button>
        {hasRgbCamera && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => run("camera")} disabled={Boolean(busy)}>
            {busy === "camera" ? <Spinner /> : <Camera size={15} />} Grab from RGB camera
          </button>
        )}
      </div>
      {result && (
        <span className="faint mono" style={{ fontSize: "0.78rem" }}>
          {result.source}: canopy {result.canopyCover}% · greenness {result.greenness ?? "--"} · evenness {result.evenness ?? "--"}
          {result.crossCheck && ` · model sees ${result.crossCheck.vegetation}% vegetation`}
        </span>
      )}
    </div>
  );
}

function RecordModal({ open, onClose, draft, setDraft, onSubmit, saving, genotypes, facility, hasRgbCamera }) {
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
  const fitted = new Set(facility.phenoDevices || []);
  const groups = FORM_GROUPS.filter((g) => fitted.has(g.device));
  const others = FORM_GROUPS.filter((g) => !fitted.has(g.device));

  const traitField = (k) => {
    const t = TRAITS[k];
    return (
      <div key={k} className="field">
        <label htmlFor={`o-${k}`}>
          {t.label} {t.unit && <span className="faint">({t.unit})</span>}
        </label>
        <input
          id={`o-${k}`}
          className="input"
          type="number"
          step="any"
          min={t.min ?? 0}
          max={t.max}
          value={draft[k]}
          onChange={set(k)}
        />
      </div>
    );
  };

  const groupBlock = (g) => {
    const d = PHENO_DEVICES[g.device];
    return (
      <fieldset key={g.device} className="target-group">
        <legend>
          <d.icon size={14} /> {d.label}
        </legend>
        <div className="form-grid form-grid-3">
          {g.keys.map(traitField)}
          {g.device === "thermal_camera" && (
            <div className="field">
              <label htmlFor="o-airTemp">
                Air temperature <span className="faint">(°C, blank = station sensor)</span>
              </label>
              <input id="o-airTemp" className="input" type="number" step="any" value={draft.airTemp} onChange={set("airTemp")} />
            </div>
          )}
        </div>
      </fieldset>
    );
  };

  return (
    <Modal open={open} title="Record observation" onClose={onClose} wide>
      <form className="stack" onSubmit={onSubmit}>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="o-genotype">Genotype</label>
            <input
              id="o-genotype"
              className="input"
              list="o-genotypes"
              placeholder="Pick or type a new one"
              value={draft.genotype}
              onChange={set("genotype")}
              required
            />
            <datalist id="o-genotypes">
              {genotypes.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>
          <div className="field">
            <label htmlFor="o-date">Date</label>
            <input id="o-date" className="input" type="date" value={draft.date} onChange={set("date")} required />
          </div>
          <div className="field">
            <label htmlFor="o-plot">Plot / tray</label>
            <input id="o-plot" className="input" placeholder="e.g. PS1/R2" value={draft.plot} onChange={set("plot")} />
          </div>
          <div className="field">
            <label htmlFor="o-stage">Growth stage</label>
            <input id="o-stage" className="input" placeholder="e.g. BBCH 61 · Flowering" value={draft.growthStage} onChange={set("growthStage")} />
          </div>
        </div>

        <label className="check-row">
          <input type="checkbox" checked={draft.flowering} onChange={(e) => setDraft((d) => ({ ...d, flowering: e.target.checked }))} />
          <Flower2 size={15} style={{ color: "var(--rose)" }} />
          <span>
            Flowers open on this date <span className="faint">· the first such record sets the flowering time</span>
          </span>
        </label>

        {fitted.has("rgb_camera") && (
          <ImageFill
            facility={facility}
            hasRgbCamera={hasRgbCamera}
            onResult={(r) =>
              setDraft((d) => ({
                ...d,
                canopyCover: r.canopyCover ?? d.canopyCover,
                leafColor: r.greenness ?? d.leafColor,
                imageAnalysis: { method: r.method, greenness: r.greenness, evenness: r.evenness, canopyCover: r.canopyCover },
              }))
            }
          />
        )}

        {groups.map(groupBlock)}
        {others.length > 0 && (
          <details className="more-traits">
            <summary>Traits from instruments this station does not list</summary>
            <div className="stack" style={{ gap: 12, marginTop: 12 }}>
              {others.map(groupBlock)}
            </div>
          </details>
        )}

        <div className="form-grid">
          <div className="field">
            <label htmlFor="o-ppfd">
              {CONTEXT_FIELDS.ppfd.label} <span className="faint">(blank = station PAR sensor)</span>
            </label>
            <input id="o-ppfd" className="input" type="number" step="any" min="0" value={draft.ppfd} onChange={set("ppfd")} />
          </div>
          <div className="field">
            <label htmlFor="o-notes">Notes</label>
            <input id="o-notes" className="input" placeholder="Visible symptoms, damage…" value={draft.notes} onChange={set("notes")} />
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <Spinner /> : <Save size={16} />} Save observation
          </button>
        </div>
      </form>
    </Modal>
  );
}
