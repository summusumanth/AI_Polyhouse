import { motion } from "framer-motion";
import { Check, Minus } from "lucide-react";
import { MEASUREMENT_MAP, PHENO_DEVICES, PHENO_DEVICE_KEYS } from "../../lib/facility";

// A phenotyping station's instruments, and which traits they make possible.
export default function StationTab({ facility, cameraRoles = [] }) {
  const fitted = new Set(facility.phenoDevices || []);

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="grid device-grid">
        {PHENO_DEVICE_KEYS.map((key, i) => {
          const d = PHENO_DEVICES[key];
          const on = fitted.has(key);
          const streaming = d.camera && cameraRoles.includes(d.camera);
          return (
            <motion.article
              key={key}
              className={`panel device-card${on ? " is-fitted" : ""}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
            >
              <div className="row-between">
                <span className="metric-icon">
                  <d.icon size={18} />
                </span>
                <span className={`level level-${d.level.toLowerCase()}`}>{d.level}</span>
              </div>
              <strong>{d.label}</strong>
              <span className="faint">{d.measures}</span>
              <span className="device-status">
                {on ? (
                  <>
                    <Check size={13} /> Installed{d.camera ? (streaming ? " · camera connected" : " · no camera URL yet") : ""}
                  </>
                ) : (
                  <>
                    <Minus size={13} /> Not installed
                  </>
                )}
              </span>
              <span className="faint device-use">{d.use}</span>
            </motion.article>
          );
        })}
      </div>

      <motion.section
        className="panel"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      >
        <div className="panel-head">
          <div>
            <h2 className="panel-title">What this station can measure</h2>
            <span className="faint">each plant trait, and the device or method behind it</span>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data measure-table">
            <thead>
              <tr>
                <th>Plant trait</th>
                <th>Device or method</th>
                <th>Here</th>
              </tr>
            </thead>
            <tbody>
              {MEASUREMENT_MAP.map((m) => {
                const ready = m.needs.every((n) => fitted.has(n));
                const missing = m.needs.filter((n) => !fitted.has(n)).map((n) => PHENO_DEVICES[n].label);
                return (
                  <tr key={m.trait}>
                    <td style={{ fontFamily: "var(--font)", fontWeight: 600 }}>{m.trait}</td>
                    <td style={{ fontFamily: "var(--font)" }}>{m.method}</td>
                    <td style={{ fontFamily: "var(--font)" }}>
                      {ready ? (
                        <span className="pill pill-on">
                          <Check size={12} /> ready
                        </span>
                      ) : (
                        <span className="faint">needs {missing.join(" and ")}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.section>
    </div>
  );
}
