import { motion } from "framer-motion";
import { CHANNELS, formatChannel } from "../../lib/facility";
import { formatDateTime } from "../../lib/format";

// The raw readings, newest first, with a column for every channel any of
// them carries.
export default function ReadingsTab({ readings }) {
  const columns = Object.keys(CHANNELS).filter((k) => readings.some((r) => r[k] !== null && r[k] !== undefined));

  return (
    <motion.section
      className="panel"
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45 }}
    >
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
                {columns.map((k) => (
                  <th key={k}>
                    {CHANNELS[k].label}
                    {CHANNELS[k].unit && <span className="faint"> {CHANNELS[k].unit}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {readings.map((r) => (
                <tr key={r._id}>
                  <td>{formatDateTime(r.date)}</td>
                  {columns.map((k) => (
                    <td key={k}>{formatChannel(k, r[k])}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.section>
  );
}
