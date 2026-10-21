/*
  Downloads the computer vision model used for phenotyping images.

    npm run fetch-models

  SegFormer-B0 fine-tuned on ADE20K, as ONNX (quantised, ~4.4 MB), from
  https://huggingface.co/Xenova/segformer-b0-finetuned-ade-512-512

  Licence: NVIDIA Source Code License for SegFormer - research and evaluation
  use only, not commercial use. https://github.com/NVlabs/SegFormer/blob/master/LICENSE
  The files are therefore not committed to git; this script fetches them.
*/

const fs = require("fs");
const path = require("path");

const REPO = "https://huggingface.co/Xenova/segformer-b0-finetuned-ade-512-512/resolve/main";
const DEST = path.join(__dirname, "..", "ml", "models", "segformer-b0-ade");

const FILES = [
  { from: "onnx/model_quantized.onnx", to: "model.onnx", minBytes: 3_000_000 },
  { from: "config.json", to: "config.json", minBytes: 1_000 },
  { from: "preprocessor_config.json", to: "preprocessor_config.json", minBytes: 100 },
];

async function download(file) {
  const target = path.join(DEST, file.to);
  if (fs.existsSync(target) && fs.statSync(target).size >= file.minBytes) {
    console.log(`  ${file.to} already present`);
    return;
  }
  const res = await fetch(`${REPO}/${file.from}`, { redirect: "follow" });
  if (!res.ok) throw new Error(`${file.from}: HTTP ${res.status}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  if (bytes.length < file.minBytes) {
    throw new Error(`${file.from}: only ${bytes.length} bytes, expected at least ${file.minBytes}`);
  }
  fs.writeFileSync(target, bytes);
  console.log(`  ${file.to.padEnd(26)} ${(bytes.length / 1e6).toFixed(2)} MB`);
}

async function main() {
  fs.mkdirSync(DEST, { recursive: true });
  console.log(`Fetching SegFormer-B0 (ADE20K) into ${path.relative(process.cwd(), DEST)}`);
  for (const file of FILES) await download(file);
  console.log("Done. Licence: research and evaluation use only (NVIDIA SegFormer licence).");
}

main().catch((error) => {
  console.error("Download failed:", error.message);
  process.exit(1);
});
