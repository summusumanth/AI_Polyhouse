import { motion } from "framer-motion";
import { Video } from "lucide-react";
import CameraView from "../CameraView";

// Every camera of a facility, large. `cameras` comes from useCameras().
export default function CamerasTab({ cameras, error, reload, canManage, children }) {
  if (cameras === null) return <div className="skeleton" style={{ height: 380 }} />;

  if (!cameras.length) {
    return (
      <div className="panel empty">
        <Video size={28} style={{ color: "var(--cyan)" }} />
        <h3>No camera connected</h3>
        <p style={{ maxWidth: "48ch" }}>
          {error ||
            (canManage
              ? "Add a camera URL from the facility's details (… menu on the control room card, then Edit details)."
              : "An administrator can add the camera's URL to this facility.")}
        </p>
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      {children}
      <div className={`grid camera-grid${cameras.length === 1 ? " camera-grid-one" : ""}`}>
        {cameras.map((info, i) => (
          <motion.div
            key={info.role}
            className="panel camera-panel"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: i * 0.06 }}
          >
            <CameraView info={info} onRetry={reload} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
