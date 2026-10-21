const mongoose = require("mongoose");

// One phenotyping observation: a set of trait measurements taken from one
// genotype in one facility on one day.
const phenotypeSchema = new mongoose.Schema(
  {
    facility: { type: String, required: true, index: true },
    genotype: { type: String, required: true, trim: true },
    plot: { type: String, trim: true, default: "" },
    date: { type: Date, required: true, default: Date.now },
    // BBCH-style stage label, e.g. "Tillering", "Heading", "Fruit set".
    growthStage: { type: String, trim: true, default: "" },

    plantHeight: { type: Number, min: 0 }, // cm
    leafCount: { type: Number, min: 0 },
    leafArea: { type: Number, min: 0 }, // cm2
    canopyCover: { type: Number, min: 0, max: 100 }, // %
    ndvi: { type: Number, min: -1, max: 1 },
    spad: { type: Number, min: 0 }, // chlorophyll index
    biomass: { type: Number, min: 0 }, // g fresh weight per plant

    notes: { type: String, trim: true, default: "" },
    seeded: { type: Boolean, default: false, index: true },
  },
  { collection: "phenotype", timestamps: true }
);

phenotypeSchema.index({ facility: 1, genotype: 1, date: 1 });

module.exports = mongoose.model("Phenotype", phenotypeSchema);
