const mongoose = require("mongoose");
const { TRAITS, CONTEXT } = require("../lib/traits");

// One phenotyping observation: a set of trait measurements taken from one
// genotype at one phenotyping station on one day.
const numbers = Object.fromEntries(
  [...TRAITS, ...CONTEXT].map((t) => [t.key, { type: Number, min: t.range[0], max: t.range[1] }])
);

const phenotypeSchema = new mongoose.Schema(
  {
    facility: { type: String, required: true, index: true },
    genotype: { type: String, required: true, trim: true },
    plot: { type: String, trim: true, default: "" },
    date: { type: Date, required: true, default: Date.now },
    // BBCH-style stage label, e.g. "Tillering", "Heading", "Fruit set".
    growthStage: { type: String, trim: true, default: "" },
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

    notes: { type: String, trim: true, default: "" },
    seeded: { type: Boolean, default: false, index: true },
  },
  { collection: "phenotype", timestamps: true }
);

phenotypeSchema.index({ facility: 1, genotype: 1, date: 1 });

module.exports = mongoose.model("Phenotype", phenotypeSchema);
