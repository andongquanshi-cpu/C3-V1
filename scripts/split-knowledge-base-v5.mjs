import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "ai-knowledge-base-v5.0");
const SHARED_FOLDER = "a_shared";

function bucketToFolder(bucket) {
  return bucket === "shared" ? SHARED_FOLDER : bucket;
}

function normalizeLine(value) {
  const line = String(value || "all").trim().toLowerCase();
  if (line === "licaitong" || line === "lct" || line === "理财通") return "licaitong";
  if (line === "weisec" || line === "wzq" || line === "weizhengquan" || line === "微证券") return "weizhengquan";
  return "shared";
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function splitItemsDocument(doc, { includeSharedInLines = true } = {}) {
  const items = Array.isArray(doc.items) ? doc.items : [];
  const buckets = { shared: [], licaitong: [], weizhengquan: [] };
  for (const item of items) {
    buckets[normalizeLine(item.businessLine)].push(item);
  }

  const result = {};
  for (const [bucket, bucketItems] of Object.entries(buckets)) {
    if (!bucketItems.length) continue;
    result[bucket] = {
      ...doc,
      items: bucketItems,
    };
  }

  if (includeSharedInLines && buckets.shared.length) {
    for (const line of ["licaitong", "weizhengquan"]) {
      const lineItems = result[line]?.items ?? [];
      result[line] = {
        ...(result[line] ?? doc),
        items: [...buckets.shared, ...lineItems],
      };
    }
  }

  return result;
}

function moveOfferPack() {
  const from = path.join(ROOT, "layers/L2-product/offer-packs/fixed-income-plus.json");
  const to = path.join(ROOT, "layers/L2-product/licaitong/offer-packs/fixed-income-plus.json");
  if (!fs.existsSync(from)) return;
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
  const offerDir = path.join(ROOT, "layers/L2-product/offer-packs");
  if (fs.existsSync(offerDir) && fs.readdirSync(offerDir).length === 0) {
    fs.rmdirSync(offerDir);
  }
}

function splitLayerFile(relativePath, options) {
  const sourcePath = path.join(ROOT, relativePath);
  if (!fs.existsSync(sourcePath)) {
    console.warn(`skip missing ${relativePath}`);
    return;
  }
  const doc = readJson(sourcePath);
  const fileName = path.basename(relativePath);
  const layerDir = path.dirname(relativePath);
  const split = splitItemsDocument(doc, options);

  for (const [bucket, payload] of Object.entries(split)) {
    const target = path.join(ROOT, layerDir, bucketToFolder(bucket), fileName);
    writeJson(target, payload);
    console.log(`wrote ${path.relative(ROOT, target)} (${payload.items.length} items)`);
  }

  fs.unlinkSync(sourcePath);
}

function splitL0() {
  const layerDir = "layers/L0-shared";
  const allOnlyFiles = [
    "compliance-rules.json",
    "compliance-rewrite-rules.cleaned.json",
    "platform-rules.json",
  ];

  for (const fileName of allOnlyFiles) {
    const sourcePath = path.join(ROOT, layerDir, fileName);
    if (!fs.existsSync(sourcePath)) continue;
    const target = path.join(ROOT, layerDir, SHARED_FOLDER, fileName);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.renameSync(sourcePath, target);
    console.log(`moved ${path.relative(ROOT, sourcePath)} -> ${path.relative(ROOT, target)}`);
  }

  splitLayerFile(`${layerDir}/risk-disclaimers.json`, { includeSharedInLines: false });
}

function main() {
  splitL0();
  splitLayerFile("layers/L2-product/product-features.json");
  splitLayerFile("layers/L3-content-pattern/content-templates.json");
  splitLayerFile("layers/L3-content-pattern/phrase-library.json");
  splitLayerFile("layers/L4-audience/audience-profiles.json");
  moveOfferPack();
  console.log("done");
}

main();
