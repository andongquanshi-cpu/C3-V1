/**
 * Apply persona-matrix.json analysis to each standard file.
 * This is the ONLY automated step: inject analysis + fix summary from matrix.
 * Does NOT mechanically convert source files.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), "personas");
const MATRIX = JSON.parse(fs.readFileSync(path.join(ROOT, "persona-matrix.json"), "utf8"));
const STANDARDS = path.join(ROOT, "standards");

for (const [id, spec] of Object.entries(MATRIX.personas)) {
  const file = path.join(STANDARDS, `${id}.json`);
  if (!fs.existsSync(file)) {
    console.warn(`skip missing: ${id}`);
    continue;
  }
  const std = JSON.parse(fs.readFileSync(file, "utf8"));
  std.version = "1.3.0";
  std.summary = spec.contentMission;
  std.analysis = {
    sourceType: spec.sourceType,
    sourceFile: spec.sourceFile,
    contentMission: spec.contentMission,
    readerQuestion: spec.readerQuestion,
    primaryAxis: spec.primaryAxis,
    narrativeMode: spec.narrativeMode,
    overlapCluster: spec.overlapCluster,
    nearestNeighbor: spec.nearestNeighbor,
    doNotUseWhen: spec.doNotUseWhen,
    preprocessingNotes: spec.preprocessingNotes,
  };
  fs.writeFileSync(file, `${JSON.stringify(std, null, 2)}\n`, "utf8");
}

const registry = JSON.parse(fs.readFileSync(path.join(ROOT, "registry.json"), "utf8"));
registry.version = "1.3.0";
registry.description = "7 套人设经 persona-matrix.json 角度分析后定义，非 4+3 机械映射。";
registry.analysisRef = "persona-matrix.json";
registry.routingTable = MATRIX.routingTable;
fs.writeFileSync(path.join(ROOT, "registry.json"), `${JSON.stringify(registry, null, 2)}\n`, "utf8");

console.log("applied analysis to standards + registry");
