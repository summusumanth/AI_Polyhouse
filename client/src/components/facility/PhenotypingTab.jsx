import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Microscope, Plus, Save, Trophy } from "lucide-react";
import { api } from "../../lib/api";
import { TRAITS, TRAIT_KEYS, formatTrait } from "../../lib/facility";
import { useToast } from "../Toast";
import Modal from "../Modal";
import { Spinner } from "../Spinner";
import { GrowthCurves, genotypeColor } from "../TraitCharts";

const emptyObservation = () => ({
  genotype: "",
  plot: "",
  growthStage: "",
  date: new Date().toISOString().slice(0, 10),
  ...Object.fromEntries(TRAIT_KEYS.map((k) => [k, ""])),
});

export default function PhenotypingTab({ facility, canOperate }) {
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

  const genotypes = useMemo(
    () => [...new Set(observations.map((o) => o.genotype))].sort(),
    [observations]
  );

  // Most recent observation per genotype.
  const latest = useMemo(() => {
    const map = new Map();
    for (const o of observations) {
      const prev = map.get(o.genotype);
      if (!prev || new Date(o.date) > new Date(prev.date)) map.set(o.genotype, o);
    }
    return genotypes.map((g) => map.get(g));
  }, [observations, genotypes]);

  // Best value per trait, to highlight the leading genotype in each column.
  const best = useMemo(() => {
    const out = {};
    for (const key of TRAIT_KEYS) {
      const values = latest.map((o) => o?.[key]).filter((v) => Number.isFinite(v));
      out[key] = values.length ? Math.max(...values) : null;
    }
    return out;
  }, [latest]);

  const leader = useMemo(() => {
    const top = latest.filter((o) => Number.isFinite(o?.[trait])).sort((a, b) => b[trait] - a[trait])[0];
    return top || null;
  }, [latest, trait]);

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

  if (loading) {
    return <div className="skeleton" style={{ height: 360 }} />;
  }

  if (!observations.length) {
    return (
      <div className="panel empty">
        <Microscope size={30} style={{ color: "var(--accent)" }} />
        <h3>No phenotyping data yet</h3>
        <p style={{ maxWidth: "46ch" }}>
          Record plant height, leaf area, NDVI and other traits per genotype to see growth curves
          and rankings here.
        </p>
        {canOperate && (
          <button className="btn btn-primary btn-sm" onClick={() => setRecordOpen(true)}>
            <Plus size={16} /> Record observation
          </button>
        )}
        <RecordModal
          open={recordOpen}
          onClose={() => setRecordOpen(false)}
          draft={draft}
          setDraft={setDraft}
          onSubmit={record}
          saving={saving}
          genotypes={genotypes}
        />
      </div>
    );
  }

  const meta = TRAITS[trait];

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="row-between">
        <div className="chips" role="radiogroup" aria-label="Trait">
          {TRAIT_KEYS.map((key) => (
            <button
              key={key}
              role="radio"
              aria-checked={trait === key}
              className={`chip${trait === key ? " is-active" : ""}`}
              onClick={() => setTrait(key)}
            >
              {TRAITS[key].label}
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
                {genotypes.length} genotypes · {observations.length} observations
              </span>
            </div>
          </div>
          <div className="chart-legend">
            {genotypes.map((g) => (
              <span key={g} className="row" style={{ gap: 7 }}>
                <span className="chart-swatch" style={{ background: genotypeColor(genotypes, g) }} />
                <span className="muted">{g}</span>
              </span>
            ))}
          </div>
          <GrowthCurves observations={observations} trait={trait} genotypes={genotypes} />
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
              <span className="faint">highest {meta.label.toLowerCase()} at the last observation</span>
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
            {latest
              .filter((o) => Number.isFinite(o?.[trait]))
              .sort((a, b) => b[trait] - a[trait])
              .map((o, i) => (
                <div key={o.genotype} className="rank-row">
                  <span className="faint mono">{i + 1}</span>
                  <span className="rank-name">{o.genotype}</span>
                  <div className="rank-bar">
                    <motion.span
                      style={{ background: genotypeColor(genotypes, o.genotype) }}
                      initial={{ width: 0 }}
                      animate={{ width: `${best[trait] ? (o[trait] / best[trait]) * 100 : 0}%` }}
                      transition={{ duration: 0.8, delay: 0.1 + i * 0.07 }}
                    />
                  </div>
                  <span className="mono rank-value">{formatTrait(trait, o[trait])}</span>
                </div>
              ))}
          </div>
        </motion.section>
      </div>

      <section className="panel">
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Latest observation per genotype</h2>
            <span className="faint">the leader in each trait is highlighted</span>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Genotype</th>
                <th>Stage</th>
                <th>Date</th>
                {TRAIT_KEYS.map((k) => (
                  <th key={k}>
                    {TRAITS[k].label}
                    {TRAITS[k].unit && ` (${TRAITS[k].unit})`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {latest.map((o) => (
                <tr key={o.genotype}>
                  <td style={{ fontFamily: "var(--font)" }}>
                    <span className="row" style={{ gap: 8 }}>
                      <span className="chart-swatch" style={{ background: genotypeColor(genotypes, o.genotype) }} />
                      {o.genotype}
                    </span>
                  </td>
                  <td style={{ fontFamily: "var(--font)" }}>{o.growthStage || "--"}</td>
                  <td>{new Date(o.date).toLocaleDateString(undefined, { day: "2-digit", month: "short" })}</td>
                  {TRAIT_KEYS.map((k) => (
                    <td key={k} className={o[k] === best[k] ? "cell-best" : ""}>
                      {formatTrait(k, o[k])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <RecordModal
        open={recordOpen}
        onClose={() => setRecordOpen(false)}
        draft={draft}
        setDraft={setDraft}
        onSubmit={record}
        saving={saving}
        genotypes={genotypes}
      />
    </div>
  );
}

function RecordModal({ open, onClose, draft, setDraft, onSubmit, saving, genotypes }) {
  const set = (key) => (e) => setDraft((d) => ({ ...d, [key]: e.target.value }));
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
            <input id="o-plot" className="input" placeholder="e.g. SB1/R2" value={draft.plot} onChange={set("plot")} />
          </div>
          <div className="field">
            <label htmlFor="o-stage">Growth stage</label>
            <input id="o-stage" className="input" placeholder="e.g. BBCH 55 · Heading" value={draft.growthStage} onChange={set("growthStage")} />
          </div>
        </div>

        <div className="form-grid form-grid-3">
          {TRAIT_KEYS.map((k) => (
            <div key={k} className="field">
              <label htmlFor={`o-${k}`}>
                {TRAITS[k].label} {TRAITS[k].unit && <span className="faint">({TRAITS[k].unit})</span>}
              </label>
              <input
                id={`o-${k}`}
                className="input"
                type="number"
                step="any"
                min={k === "ndvi" ? -1 : 0}
                max={k === "ndvi" ? 1 : k === "canopyCover" ? 100 : undefined}
                value={draft[k]}
                onChange={set(k)}
              />
            </div>
          ))}
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
