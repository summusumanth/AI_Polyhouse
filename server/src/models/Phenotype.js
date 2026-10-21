const mongoose = require("mongoose");
<<<<<<< HEAD
const { TRAITS, CONTEXT } = require("../lib/traits");

// One phenotyping observation: a set of trait measurements taken from one
// genotype at one phenotyping station on one day.
const numbers = Object.fromEntries(
  [...TRAITS, ...CONTEXT].map((t) => [t.key, { type: Number, min: t.range[0], max: t.range[1] }])
);

=======

// One phenotyping observation: a set of trait measurements taken from one
// genotype in one facility on one day.
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f
const phenotypeSchema = new mongoose.Schema(
  {
    facility: { type: String, required: true, index: true },
    genotype: { type: String, required: true, trim: true },
    plot: { type: String, trim: true, default: "" },
    date: { type: Date, required: true, default: Date.now },
    // BBCH-style stage label, e.g. "Tillering", "Heading", "Fruit set".
    growthStage: { type: String, trim: true, default: "" },
<<<<<<< HEAD
    // Flowers seen on this date. The first such record sets flowering time.
    flowering: { type: Boolean, default: false },

    ...numbers,

    // How the image-derived values were found, when a photo was analysed.
    imageAnalysis: {
      method: String,
      greenness: Number,
      evenness: Number,
      canopyCover: Number,
    },
=======

    plantHeight: { type: Number, min: 0 }, // cm
    leafCount: { type: Number, min: 0 },
    leafArea: { type: Number, min: 0 }, // cm2
    canopyCover: { type: Number, min: 0, max: 100 }, // %
    ndvi: { type: Number, min: -1, max: 1 },
    spad: { type: Number, min: 0 }, // chlorophyll index
    biomass: { type: Number, min: 0 }, // g fresh weight per plant
>>>>>>> ee744716751d2654dd89556decc4cd4e969d7d8f

    notes: { type: String, trim: true, default: "" },
    seeded: { type: Boolean, default: false, index: true },
  },
  { collection: "phenotype", timestamps: true }
);

phenotypeSchema.index({ facility: 1, genotype: 1, date: 1 });

module.exports = mongoose.model("Phenotype", phenotypeSchema);
