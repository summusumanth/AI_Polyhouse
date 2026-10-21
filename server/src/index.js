const app = require("./app");
const { connectDatabase } = require("./config/db");
const { migrate } = require("./config/migrate");
<<<<<<< HEAD
const { port, timezone } = require("./config/env");
const Polyhouse = require("./models/Polyhouse");
const { syncAll } = require("./lib/cameras");

// MediaMTX forgets cameras added through its API when it restarts, so they
// are registered again every few minutes.
const CAMERA_SYNC_MS = 5 * 60 * 1000;
=======
const { port } = require("./config/env");
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

async function start() {
  try {
    await connectDatabase();
    await migrate();
<<<<<<< HEAD
    app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);
      console.log(`Photoperiod schedules run on ${timezone} time`);
    });
    syncAll(Polyhouse);
    setInterval(() => syncAll(Polyhouse), CAMERA_SYNC_MS).unref();
=======
    app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

start();
