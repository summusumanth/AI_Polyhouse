const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");

const { clientOrigins, isProduction } = require("./config/env");
const routes = require("./routes");
const { notFound, errorHandler } = require("./middleware/errorHandler");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(morgan("dev"));
// Vite moves to 5174, 5175... whenever its usual port is taken, so in
// development any localhost origin is accepted. Production stays on the
// explicit CLIENT_ORIGIN allowlist.
const isLocalhost = (origin) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(origin);

app.use(
  cors({
    origin: (origin, callback) => {
      // No origin: a device, curl or a same-origin request.
      if (!origin) return callback(null, true);
      if (clientOrigins.includes(origin)) return callback(null, true);
      if (!isProduction && isLocalhost(origin)) return callback(null, true);

      const error = new Error(`Origin ${origin} is not allowed`);
      error.status = 403;
      error.expose = true;
      callback(error);
    },
    credentials: true,
  })
);

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
