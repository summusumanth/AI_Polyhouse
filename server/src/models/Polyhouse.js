const mongoose = require("mongoose");

<<<<<<< HEAD
// One growing or measuring space. Kept in the original "polyhouse"
// collection so ids that are already flashed into sensor nodes stay valid.
//
//   polyhouse        naturally lit protected cultivation, climate control
//   speed_breeding   a sealed, LED-lit room run to fixed targets on a long
//                    photoperiod, to advance generations fast
//   phenotyping      a measuring station: cameras and instruments that
//                    record plant traits. It controls nothing.
const FACILITY_TYPES = ["polyhouse", "speed_breeding", "phenotyping"];
const FACILITY_STATUSES = ["active", "maintenance", "idle"];

// How a camera's URL is played in the browser (see lib/cameras.js).
//   auto      decided from the URL
//   rtsp      re-published as WebRTC by the MediaMTX gateway
//   mjpeg     a continuous JPEG stream, relayed through this server
//   snapshot  a single JPEG, relayed and refreshed every few seconds
//   hls       an .m3u8 playlist, played by the browser
//   video     an .mp4/.webm file or stream, played by the browser
//   page      the camera's own web viewer, shown in a frame
const CAMERA_FORMATS = ["auto", "rtsp", "mjpeg", "snapshot", "hls", "video", "page"];

// Which camera slots a facility type offers.
//   room           the speed breeding room's camera
//   rgb, thermal,  the phenotyping station's imaging cameras
//   multispectral
const CAMERA_ROLES = {
  polyhouse: [],
  speed_breeding: ["room"],
  phenotyping: ["rgb", "thermal", "multispectral"],
};

// Instruments a phenotyping station can have. Cameras carry a URL as well.
const PHENO_DEVICES = [
  "rgb_camera",
  "par_sensor",
  "thermal_camera",
  "multispectral_camera",
  "stem_sensor",
  "weighing_scale",
];

// Relays a climate-controlled facility can drive (lib/control.js). Only
// the ones fitted are decided; the rest are always sent as off.
const EQUIPMENT = [
  "fan",
  "cooler",
  "heater",
  "vents",
  "mister",
  "dehumidifier",
  "irrigation",
  "co2Valve",
  "lights",
  "shade",
];

// What a facility has when nobody has said otherwise. A polyhouse keeps the
// relays the original build had (plus CO2 and lights, which only act when
// that sensor and target exist). A speed breeding room gets the full set.
const DEFAULT_EQUIPMENT = {
  polyhouse: ["fan", "cooler", "mister", "irrigation", "co2Valve", "lights"],
  speed_breeding: ["fan", "heater", "vents", "mister", "dehumidifier", "irrigation", "co2Valve", "lights", "shade"],
  phenotyping: [],
};

const equipmentOf = (facility) => {
  const type = facility?.type || "polyhouse";
  if (type === "phenotyping") return [];
  return Array.isArray(facility?.equipment) ? facility.equipment : DEFAULT_EQUIPMENT[type] || [];
};

const cameraSchema = new mongoose.Schema(
  {
    url: { type: String, trim: true, default: "" },
    format: { type: String, enum: CAMERA_FORMATS, default: "auto" },
    // A still-image URL on the same camera, used to grab a frame for image
    // analysis when the main URL is a video stream (RTSP, HLS).
    snapshotUrl: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

=======
// One controlled-growing space: a polyhouse, a grow chamber or a speed
// breeding room. Kept in the original "polyhouse" collection so ids that are
// already flashed into sensor nodes stay valid.
const FACILITY_TYPES = ["polyhouse", "grow_chamber", "speed_breeding"];
const FACILITY_STATUSES = ["active", "maintenance", "idle"];

>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
const polyhouseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    desc: { type: String, required: true, trim: true },
    type: { type: String, enum: FACILITY_TYPES, default: "polyhouse" },
    // Which area the facility belongs to. Decides which area admins and
    // users can reach it (see lib/access.js).
    area: { type: mongoose.Schema.Types.ObjectId, ref: "Area", index: true },
    status: { type: String, enum: FACILITY_STATUSES, default: "active" },

    crop: { type: String, trim: true, default: "" },
    variety: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    areaSqm: { type: Number, min: 0 },

<<<<<<< HEAD
    // The light schedule the grow lights follow (the "RTC" controller).
    // Lights come on at lightsOnAt (HH:MM, server TIMEZONE) and stay on for
    // lightHours. Speed breeding typically runs 22 h on, 2 h off.
    photoperiod: {
      lightHours: { type: Number, min: 0, max: 24 },
      lightsOnAt: { type: String, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    },

    // Relays fitted (see EQUIPMENT). Unset means the type's default set.
    equipment: { type: [{ type: String, enum: EQUIPMENT }], default: undefined },

=======
    // Hours of light per 24h cycle. Speed breeding typically runs 22.
    photoperiod: {
      lightHours: { type: Number, min: 0, max: 24 },
    },

>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
    // Generation tracking for speed breeding programmes.
    program: {
      generation: { type: Number, min: 0 },
      totalGenerations: { type: Number, min: 0 },
      cycleStartedAt: { type: Date },
      cycleDays: { type: Number, min: 1 },
    },

<<<<<<< HEAD
    // Phenotyping: when the plants under measurement were sown, so the
    // portal can work out flowering time in days after sowing.
    sowingDate: { type: Date },
    phenoDevices: { type: [{ type: String, enum: PHENO_DEVICES }], default: undefined },

    cameras: {
      room: cameraSchema,
      rgb: cameraSchema,
      thermal: cameraSchema,
      multispectral: cameraSchema,
    },

=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
    // Marks rows created by scripts/seed.js so a re-seed never touches real data.
    seeded: { type: Boolean, default: false, index: true },
  },
  { collection: "polyhouse", timestamps: true }
);

const Polyhouse = mongoose.model("Polyhouse", polyhouseSchema);

module.exports = Polyhouse;
module.exports.FACILITY_TYPES = FACILITY_TYPES;
module.exports.FACILITY_STATUSES = FACILITY_STATUSES;
<<<<<<< HEAD
module.exports.CAMERA_FORMATS = CAMERA_FORMATS;
module.exports.CAMERA_ROLES = CAMERA_ROLES;
module.exports.PHENO_DEVICES = PHENO_DEVICES;
module.exports.EQUIPMENT = EQUIPMENT;
module.exports.DEFAULT_EQUIPMENT = DEFAULT_EQUIPMENT;
module.exports.equipmentOf = equipmentOf;
=======
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
