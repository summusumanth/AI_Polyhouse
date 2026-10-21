const app = require("./app");
const { connectDatabase } = require("./config/db");
const { migrate } = require("./config/migrate");
const { port } = require("./config/env");

async function start() {
  try {
    await connectDatabase();
    await migrate();
    app.listen(port, () => console.log(`API listening on http://localhost:${port}`));
  } catch (error) {
    console.error("Failed to start server:", error.message);
    process.exit(1);
  }
}

start();
