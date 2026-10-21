import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Cpu, Radio, TriangleAlert, Wifi, WifiOff } from "lucide-react";
import { api } from "../../lib/api";
import { formatDateTime, timeAgo } from "../../lib/format";
import { CopyButton } from "../ui";

const TROUBLESHOOTING = [
  {
    code: "-1",
    meaning: "“server unreachable”: the board could not reach the server at all.",
    fix: "API_BASE is wrong or uses “localhost”. Use the LAN address listed above, and keep the board on the same WiFi as this computer. Windows Firewall may also need to allow Node on port 5000.",
  },
  {
    code: "404",
    meaning: "The server does not know that facility id.",
    fix: "Copy the id from this page into FACILITY_ID. The server's reply names the id it received.",
  },
  {
    code: "400",
    meaning: "A reading was rejected as impossible.",
    fix: "Usually a sensor fault, e.g. humidity above 100 or a DHT returning nan. The Serial monitor shows the server's exact reason.",
  },
  {
    code: "401",
    meaning: "The device key did not match.",
    fix: "Set DEVICE_KEY in the sketch to the value in server/.env, or leave both empty.",
  },
  {
    code: "off",
    meaning: "Motor board says “Sensor node silent”.",
    fix: "The sensor board has not reported for 5 minutes, so every motor is held off on purpose. Check the sensor board's power, WiFi and Serial monitor.",
  },
];

export default function DeviceTab({ facility, latest }) {
  const station = facility.type === "phenotyping";
  const [network, setNetwork] = useState(null);

  useEffect(() => {
    api
      .network()
      .then((res) => setNetwork(res.data))
      .catch(() => setNetwork({ addresses: [], port: 5000 }));
  }, []);

  const online = latest && Date.now() - new Date(latest.date).getTime() < 3600 * 1000;
  const host = network?.addresses?.[0]?.address || "192.168.x.x";
  const port = network?.port || 5000;
  const apiBase = `http://${host}:${port}`;

  const settings = `const char *WIFI_SSID   = "YOUR_WIFI_NAME";
const char *WIFI_PASS   = "YOUR_WIFI_PASSWORD";
const char *API_BASE    = "${apiBase}";
const char *FACILITY_ID = "${facility._id}";
const char *DEVICE_KEY  = "${network?.deviceKeyRequired ? "PASTE_DEVICE_KEY" : ""}";`;

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="grid detail-grid">
        <motion.section
          className="panel"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Firmware settings for this facility</h2>
              <span className="faint">paste over the SETTINGS block at the top of the sketch</span>
            </div>
            <CopyButton text={settings} label="Copy" />
          </div>
          <pre className="code-block">
            <code>{settings}</code>
          </pre>

          <div className="stack" style={{ gap: 10, marginTop: 18 }}>
            <h3 className="panel-subtitle">{station ? "Paste it into the sensor board" : "Paste the same block into both boards"}</h3>
            <div className="sketch-row">
              <Cpu size={16} />
              <div>
                <strong className="mono">arduino/sensor_node</strong>
                <span className="faint">
                  {station
                    ? "Reads the PAR sensor, air temperature and humidity, and the stem-diameter sensor. Set the HAS_ switches for what is wired."
                    : facility.type === "speed_breeding"
                      ? "Reads all ten speed breeding sensors (switch each on with its HAS_ line) and sends a reading every 30 s."
                      : "Board 1. Reads the DHT22 and soil probe, plus any optional sensors, every 30 s."}
                </span>
              </div>
            </div>
            {!station && (
              <div className="sketch-row">
                <Cpu size={16} />
                <div>
                  <strong className="mono">arduino/motor_node</strong>
                  <span className="faint">
                    Board 2. Asks for the relay decision every 10 s and switches fans, heater, vents, humidifier,
                    dehumidifier, irrigation, CO₂, lights and shade.
                  </span>
                </div>
              </div>
            )}
            {station && (
              <span className="faint">
                A phenotyping station controls nothing, so it has no motor board. Cameras connect by URL on the
                facility's details, not through the board.
              </span>
            )}
          </div>
        </motion.section>

        <motion.section
          className="panel"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06 }}
        >
          <div className="panel-head">
            <div>
              <h2 className="panel-title">Connection</h2>
              <span className="faint">judged by the newest reading</span>
            </div>
          </div>

          <div className={`connection ${online ? "is-online" : ""}`}>
            <motion.span
              className="connection-icon"
              animate={online ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              transition={{ repeat: online ? Infinity : 0, duration: 2 }}
            >
              {online ? <Wifi size={22} /> : <WifiOff size={22} />}
            </motion.span>
            <div>
              <strong>{online ? "Reporting" : latest ? "Silent for over an hour" : "Never reported"}</strong>
              <span className="faint">
                {latest ? `last reading ${timeAgo(latest.date)} · ${formatDateTime(latest.date)}` : "no readings stored yet"}
              </span>
            </div>
          </div>

          <h3 className="panel-subtitle" style={{ marginTop: 20 }}>
            This server on your network
          </h3>
          {network === null ? (
            <div className="skeleton" style={{ height: 44 }} />
          ) : network.addresses.length ? (
            <div className="stack" style={{ gap: 8 }}>
              {network.addresses.map((a, i) => (
                <div key={a.address} className="address-row">
                  <Radio size={14} />
                  <span className="mono">
                    http://{a.address}:{port}
                  </span>
                  <span className="faint truncate">{a.interface}</span>
                  {i === 0 && <span className="pill pill-on">use this</span>}
                </div>
              ))}
              <span className="faint">
                A board cannot use “localhost”: to the board that means itself.
              </span>
            </div>
          ) : (
            <span className="faint">No network address found. Is this computer on WiFi or Ethernet?</span>
          )}
        </motion.section>
      </div>

      <motion.section
        className="panel"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1 }}
      >
        <div className="panel-head">
          <div>
            <h2 className="panel-title">Endpoints the board uses</h2>
            <span className="faint">no login needed; protected by DEVICE_KEY when that is set</span>
          </div>
        </div>
        <div className="table-scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Call</th>
                <th>Purpose</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>POST /api/device/readings</td>
                <td style={{ fontFamily: "var(--font)" }}>Sensor board sends a reading as JSON. Replies 201, or 400 with the reason.</td>
              </tr>
              {!station && (
                <tr>
                  <td>GET /api/device/state/{facility._id}</td>
                  <td style={{ fontFamily: "var(--font)" }}>
                    Motor board fetches the relay decision for every fitted relay, e.g. fan, heater, vents, mister,
                    dehumidifier, irrigation, co2Valve, lights, shade.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.section>

      <motion.section
        className="panel"
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.14 }}
      >
        <div className="panel-head">
          <div>
            <h2 className="panel-title">If the Serial monitor shows an error</h2>
            <span className="faint">the code after “[send] rejected” (sensor board) or “[poll] rejected” (motor board)</span>
          </div>
          <TriangleAlert size={19} style={{ color: "var(--amber)" }} />
        </div>
        <div className="trouble-grid">
          {TROUBLESHOOTING.filter((t) => !station || t.code !== "off").map((t) => (
            <div key={t.code} className="trouble">
              <span className="trouble-code mono">{t.code}</span>
              <div>
                <strong>{t.meaning}</strong>
                <p>{t.fix}</p>
              </div>
            </div>
          ))}
        </div>
      </motion.section>
    </div>
  );
}
