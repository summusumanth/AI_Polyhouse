const mongoose = require("mongoose");
const { dbUrl } = require("./env");

async function connectDatabase() {
  mongoose.set("strictQuery", true);
  await mongoose.connect(dbUrl);
  console.log("MongoDB connected");
}

module.exports = { connectDatabase };
