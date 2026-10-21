const mongoose = require("mongoose");

function notFound(req, res) {
  res.status(404).json({ status: "error", message: `No route for ${req.method} ${req.originalUrl}` });
}

// Turns known client mistakes into 4xx answers instead of a generic 500.
function errorHandler(err, req, res, next) {
  if (err instanceof mongoose.Error.CastError) {
    return res
      .status(400)
      .json({ status: "error", message: `Invalid value "${err.value}" for ${err.path}` });
  }

  if (err instanceof mongoose.Error.ValidationError) {
    const message = Object.values(err.errors)
      .map((e) => e.message)
      .join("; ");
    return res.status(400).json({ status: "error", message });
  }

  // express.json() rejects a malformed body with a SyntaxError.
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ status: "error", message: "Request body is not valid JSON" });
  }

  const status = err.status || 500;
  if (status >= 500) console.error(err);
  res.status(status).json({
    status: "error",
    message: err.expose ? err.message : "Something went wrong on the server",
  });
}

// Wraps an async handler so rejected promises reach errorHandler.
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { notFound, errorHandler, asyncHandler };
