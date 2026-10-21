/*
  Measures a plant photo: how much of the frame is canopy, how green it is,
  and how evenly that green is spread.

  Two methods run, and both are reported:

  1. Excess Green (ExG = 2G - R - B, normalised). The long-standing index for
     separating plant from soil in top-view crop images. It needs no model,
     runs in milliseconds, and is what the stored canopy cover comes from.

  2. SegFormer-B0 (ADE20K) through ONNX Runtime. A scene-parsing model, so it
     answers "which parts of this photo are vegetation" independently of
     colour. Reported as a cross-check next to the index.

     Caveat, measured rather than assumed: ADE20K is a scene dataset (rooms,
     streets, landscapes), so the model expects a whole scene. On close-up,
     top-down tray shots it tends to answer "wall" and find no plant at all.
     It is most useful on wider shots that show the bench, room or tunnel.
     That is why it is the cross-check and not the number of record.

  The model file is not in git (licence: research use only). Fetch it with
  `npm run fetch-models`. Without it, method 1 still works on its own.
*/

const fs = require("fs");
const path = require("path");

const MODEL_DIR = path.join(__dirname, "..", "..", "ml", "models", "segformer-b0-ade");
const MODEL_PATH = path.join(MODEL_DIR, "model.onnx");

const INPUT_SIZE = 512; // the size the model was exported at
const SAMPLE_SIZE = 384; // working size for the colour index

// ImageNet normalisation, from the model's preprocessor_config.json.
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

// ADE20K ids that mean living plant material (config.json id2label).
// "pot" (125) is left out on purpose: a pot is not canopy.
const PLANT_CLASSES = new Map([
  [4, "tree"],
  [9, "grass"],
  [17, "plant"],
  [66, "flower"],
]);

// A pixel counts as plant when normalised ExG clears this. 0.05 is a common
// starting point for top-view crop images; raise it if soil is being counted.
const EXG_THRESHOLD = 0.05;

let sessionPromise = null;

const modelAvailable = () => fs.existsSync(MODEL_PATH);

function loadSession() {
  if (!sessionPromise) {
    const ort = require("onnxruntime-node");
    sessionPromise = ort.InferenceSession.create(MODEL_PATH, {
      executionProviders: ["cpu"],
      graphOptimizationLevel: "all",
    });
  }
  return sessionPromise;
}

// Method 1: the colour index. Canopy cover, greenness and evenness in one
// pass over the pixels.
async function colourIndex(buffer) {
  const sharp = require("sharp");
  const { data } = await sharp(buffer)
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const total = SAMPLE_SIZE * SAMPLE_SIZE;
  const plantExg = [];
  let plant = 0;

  for (let p = 0; p < total; p += 1) {
    const r = data[p * 3];
    const g = data[p * 3 + 1];
    const b = data[p * 3 + 2];
    // Normalising by brightness keeps the index steady under sun or shade.
    const exg = (2 * g - r - b) / (r + g + b || 1);
    if (exg > EXG_THRESHOLD) {
      plant += 1;
      plantExg.push(exg);
    }
  }

  if (!plant) {
    return { canopyCover: 0, greenness: null, evenness: null, pixelsMeasured: 0 };
  }

  const mean = plantExg.reduce((a, v) => a + v, 0) / plant;
  const variance = plantExg.reduce((a, v) => a + (v - mean) ** 2, 0) / plant;

  return {
    canopyCover: Number(((plant / total) * 100).toFixed(1)),
    // 0-100; a healthy canopy usually sits around 30-60.
    greenness: Number((mean * 100).toFixed(1)),
    // Spread of greenness within the canopy, flipped so higher is better.
    // Patchiness, yellowing or disease pulls it down.
    evenness: Number(Math.max(0, 100 - Math.sqrt(variance) * 300).toFixed(1)),
    pixelsMeasured: plant,
  };
}

// Method 2: the ONNX model. Per-pixel argmax over 150 ADE20K classes.
async function segment(buffer) {
  const sharp = require("sharp");
  const ort = require("onnxruntime-node");
  const session = await loadSession();

  const { data } = await sharp(buffer)
    .resize(INPUT_SIZE, INPUT_SIZE, { fit: "fill" })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixels = INPUT_SIZE * INPUT_SIZE;
  const input = new Float32Array(3 * pixels);
  for (let i = 0; i < pixels; i += 1) {
    for (let c = 0; c < 3; c += 1) {
      input[c * pixels + i] = (data[i * 3 + c] / 255 - MEAN[c]) / STD[c];
    }
  }

  const output = await session.run({
    pixel_values: new ort.Tensor("float32", input, [1, 3, INPUT_SIZE, INPUT_SIZE]),
  });
  const logits = output.logits;
  const [, numClasses, h, w] = logits.dims;
  const n = h * w;

  const counts = new Int32Array(numClasses);
  for (let p = 0; p < n; p += 1) {
    let best = 0;
    let bestValue = logits.data[p];
    for (let c = 1; c < numClasses; c += 1) {
      const v = logits.data[c * n + p];
      if (v > bestValue) {
        bestValue = v;
        best = c;
      }
    }
    counts[best] += 1;
  }

  let plantPixels = 0;
  const classes = [];
  for (const [id, label] of PLANT_CLASSES) {
    if (counts[id] > 0) {
      plantPixels += counts[id];
      classes.push({ label, percent: Number(((counts[id] / n) * 100).toFixed(1)) });
    }
  }

  return {
    vegetation: Number(((plantPixels / n) * 100).toFixed(1)),
    classes: classes.sort((a, b) => b.percent - a.percent),
  };
}

/*
  Analyses one image buffer and returns the traits plus how they were found:

    { canopyCover, greenness, evenness, method, crossCheck }

  `canopyCover`, `greenness` and `evenness` always come from the colour
  index. `crossCheck` is the model's own vegetation estimate, or null when
  the model is missing or could not run.
*/
async function analyseImage(buffer) {
  const started = Date.now();
  const colour = await colourIndex(buffer);

  let crossCheck = null;
  if (modelAvailable()) {
    try {
      const seg = await segment(buffer);
      crossCheck = {
        model: "SegFormer-B0 (ADE20K), ONNX",
        vegetation: seg.vegetation,
        classes: seg.classes,
        // Say so plainly when the two disagree, rather than hiding it.
        agrees: Math.abs(seg.vegetation - colour.canopyCover) <= 15,
        note:
          seg.vegetation === 0
            ? "The model found no vegetation. It is trained on whole scenes, so close-up tray shots often read as a flat surface."
            : null,
      };
    } catch (error) {
      console.error("Segmentation failed:", error.message);
    }
  }

  return {
    method: "Excess Green index",
    canopyCover: colour.canopyCover,
    greenness: colour.greenness,
    evenness: colour.evenness,
    pixelsMeasured: colour.pixelsMeasured,
    crossCheck,
    tookMs: Date.now() - started,
  };
}

module.exports = { analyseImage, modelAvailable, MODEL_DIR, EXG_THRESHOLD };
