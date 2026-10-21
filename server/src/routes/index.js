const os = require("os");
const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const { port, deviceKey } = require("../config/env");

router.use("/auth", require("./authRoutes"));
router.use("/areas", require("./areaRoutes"));
router.use("/users", require("./userRoutes"));
router.use("/polyhouses", require("./polyhouseRoutes"));
router.use("/phenotypes", require("./phenotypeRoutes"));
router.use("/device", require("./deviceRoutes"));

<<<<<<< HEAD
// Camera relay for <img> tags. The token in the URL is the login (see
// lib/cameras.js), because an image request cannot carry a header.
router.get("/camera-feed/:token", require("../controllers/polyhouseController").cameraFeed);

=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
router.get("/health", (req, res) => res.json({ status: "ok", uptime: process.uptime() }));

// The addresses a sensor node should use to reach this server. A browser on
// this machine only knows "localhost", which is useless to a board on WiFi.
router.get("/network", requireAuth, (req, res) => {
  const addresses = Object.entries(os.networkInterfaces())
    .flatMap(([name, list]) =>
      (list || [])
        .filter((a) => a.family === "IPv4" && !a.internal)
        .map((a) => ({ interface: name, address: a.address }))
    )
    // Virtual adapters (Docker, WSL, VPNs) are rarely what a board can reach.
    .sort((a, b) => Number(/vEthernet|WSL|Docker|VirtualBox|VMware/i.test(a.interface)) -
                    Number(/vEthernet|WSL|Docker|VirtualBox|VMware/i.test(b.interface)));
  res.json({
    status: "ok",
    data: { port: Number(port), addresses, deviceKeyRequired: Boolean(deviceKey) },
  });
});

module.exports = router;
