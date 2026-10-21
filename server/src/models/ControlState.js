const mongoose = require("mongoose");

// What each relay was last told to do, per facility. Written every time the
// motor node polls /api/device/state. Two rules need it:
//   - the shade screen opens at a lower light level than it closed at,
//     because closing it is what lowers the reading (hysteresis)
//   - the flow check compares water flow with how long irrigation has
//     actually been on or off
const controlStateSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true }, // facility id
    actuators: { type: Map, of: Boolean, default: {} },
    // When each relay last changed state.
    changedAt: { type: Map, of: Date, default: {} },
  },
  { collection: "control_state", _id: false, versionKey: false, timestamps: { createdAt: false, updatedAt: true } }
);

module.exports = mongoose.model("ControlState", controlStateSchema);
