import { motion } from "framer-motion";
import { FlaskConical, Sun } from "lucide-react";
import MetricTile from "../MetricTile";
import { LightChart, NutrientChart } from "../ReadingsChart";
import RangeToggle from "./RangeToggle";

export default function NutrientsTab({ latest, series, hours, setHours }) {
  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="grid metrics">
        <MetricTile icon={FlaskConical} label="Nitrogen (N)" value={latest?.N} unit="mg/kg" tone="var(--accent)" max={300} digits={0} />
        <MetricTile icon={FlaskConical} label="Phosphorus (P)" value={latest?.P} unit="mg/kg" tone="var(--cyan)" max={150} digits={0} delay={0.06} />
        <MetricTile icon={FlaskConical} label="Potassium (K)" value={latest?.K} unit="mg/kg" tone="var(--violet)" max={300} digits={0} delay={0.12} />
        <MetricTile icon={Sun} label="Light (PPFD)" value={latest?.lightInt} unit="µmol/m²/s" tone="var(--amber)" max={1500} digits={0} delay={0.18} />
      </div>

      <motion.section
        className="panel"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.08 }}
      >
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Soil nutrients</h2>
            <span className="faint">rises mark a fertigation event</span>
          </div>
          <RangeToggle hours={hours} setHours={setHours} />
        </div>
        <NutrientChart data={series} hours={hours} />
      </motion.section>

      <motion.section
        className="panel"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.14 }}
      >
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Photosynthetic light</h2>
            <span className="faint">
              the shape shows the light regime: a sun curve, an LED square wave, or near-continuous speed breeding light
            </span>
          </div>
        </div>
        <LightChart data={series} hours={hours} />
      </motion.section>
    </div>
  );
}
