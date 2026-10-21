require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

// A guessable default secret would let anyone forge an admin token.
if (isProduction && !process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET must be set when NODE_ENV=production");
}

const config = {
  isProduction,
  port: process.env.PORT || 5000,
  dbUrl: process.env.DB_URL || "mongodb://127.0.0.1:27017/polyhouse",
  jwtSecret: process.env.JWT_SECRET || "polyhouse-dev-secret-change-me",
  // Optional shared secret for sensor nodes. Empty = devices need no key.
  deviceKey: process.env.DEVICE_KEY || "",
  // First super admin. Read from the environment so no password lives in
  // source; scripts/create-super-admin.js is the only consumer.
  bootstrap: {
    email: process.env.BOOTSTRAP_EMAIL || "",
    name: process.env.BOOTSTRAP_NAME || "",
    password: process.env.BOOTSTRAP_PASSWORD || "",
  },
  // The zone the photoperiod schedule is read in (e.g. Asia/Kolkata).
  // Defaults to the zone of the computer running the server.
  timezone: process.env.TIMEZONE || Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  // MediaMTX, the RTSP gateway in ../docker-compose.yml. The server adds
  // each RTSP camera through the control API; browsers watch it on the
  // public WebRTC address. Leave MEDIAMTX_API empty to turn RTSP off.
  mediamtx: {
    api: (process.env.MEDIAMTX_API ?? "http://127.0.0.1:9997").replace(/\/$/, ""),
    webrtc: (process.env.MEDIAMTX_WEBRTC_URL || "").replace(/\/$/, ""),
    user: process.env.MEDIAMTX_API_USER || "",
    pass: process.env.MEDIAMTX_API_PASS || "",
  },
  clientOrigins: (process.env.CLIENT_ORIGIN || "http://localhost:5173")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
};

module.exports = config;
