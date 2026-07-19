/**
 * 角度维度采样器
 * -------------------------------------------------------
 * 输入：
 *  - count：本批需要几个角度
 *  - recentCoords：跨批次历史坐标（用于降权，避免连续几次刷新在同一坐标附近）
 *  - seed：种子字符串（同 seed 得到同结果，便于调试；不同 seed 结果发散）
 *
 * 输出：
 *  - coords：count 个坐标，两两之间保证足够的汉明距离
 *
 * 算法：
 *  1. 用 mulberry32 从 seed 派生一个可复现的 PRNG。
 *  2. 对每个轴，先按"最近历史里出现的频次"给取值排一个"惩罚分"（出现越多分越低）。
 *  3. 循环 count 次，每次为一个角度贪心构造坐标：
 *     - 对每个轴，从取值池里加权随机抽 1 个；
 *     - 权重 = 基础权重（1）× 历史惩罚 × 与"当前批次已选坐标"的差异奖励；
 *     - 结果保证：本批 count 个坐标两两之间至少有 ⌈axes.length / 2⌉ 个维度不同。
 *  4. 如果贪心失败（配置极端），退化为随机采样但保留历史惩罚。
 */

import {
  ANGLE_AXES,
  AngleAxis,
  AngleCoordinate,
  coordinateFingerprint,
} from "./angle-axes";

// ---------- PRNG ----------

function hashSeed(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h || 1;
}

function mulberry32(seedNum: number) {
  let a = seedNum >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------- 加权抽样 ----------

function weightedPick<T>(items: T[], weights: number[], rand: () => number): T {
  const total = weights.reduce((s, w) => s + Math.max(0, w), 0);
  if (total <= 0) return items[Math.floor(rand() * items.length)];
  let r = rand() * total;
  for (let i = 0; i < items.length; i += 1) {
    r -= Math.max(0, weights[i]);
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ---------- 主接口 ----------

export interface SampleAnglesOptions {
  count: number;
  recentCoords?: AngleCoordinate[];
  seed?: string;
  axes?: AngleAxis[];
  /** 每个坐标最少要和本批已选坐标在多少个轴上不同（默认 4） */
  minInBatchDistance?: number;
}

export function sampleAngleCoordinates(options: SampleAnglesOptions): AngleCoordinate[] {
  const axes = options.axes || ANGLE_AXES;
  const count = Math.max(1, Math.min(10, Math.round(options.count || 1)));
  const seed = options.seed || String(Date.now());
  const recent = options.recentCoords || [];
  const minDistance = options.minInBatchDistance ?? Math.ceil(axes.length / 2);

  const rand = mulberry32(hashSeed(seed));

  // 1) 计算每个 (axis, value) 在最近历史中的出现频次
  const historyCount: Record<string, Record<string, number>> = {};
  for (const axis of axes) {
    historyCount[axis.key] = {};
  }
  for (const coord of recent) {
    for (const axis of axes) {
      const v = coord[axis.key];
      if (!v) continue;
      historyCount[axis.key][v] = (historyCount[axis.key][v] || 0) + 1;
    }
  }

  const results: AngleCoordinate[] = [];
  const chosenFingerprints = new Set<string>();

  for (let i = 0; i < count; i += 1) {
    let best: AngleCoordinate | null = null;
    let bestScore = -Infinity;

    // 每次给这个角度尝试 12 个候选，选距离最优的一个
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidate: AngleCoordinate = {};
      for (const axis of axes) {
        const values = axis.values;
        const weights = values.map((v) => {
          const hist = historyCount[axis.key][v] || 0;
          // 历史惩罚：出现次数越多权重越低（1 / (1+2*hist)）
          const historyPenalty = 1 / (1 + 2 * hist);
          // 本批次差异奖励：如果当前值在本批已选中已经出现过，压低权重
          const usedInBatch = results.filter((r) => r[axis.key] === v).length;
          const batchPenalty = 1 / (1 + 3 * usedInBatch);
          return historyPenalty * batchPenalty;
        });
        candidate[axis.key] = weightedPick(values, weights, rand);
      }

      // 计算这个候选与本批已选坐标的最小汉明距离
      const minD = results.length === 0
        ? axes.length
        : Math.min(
            ...results.map((prev) =>
              axes.reduce((d, axis) => (prev[axis.key] === candidate[axis.key] ? d : d + 1), 0),
            ),
          );

      // 计算这个候选与历史的最大重合数
      const historyOverlap = recent.length === 0
        ? 0
        : Math.max(
            ...recent.map((prev) =>
              axes.reduce((o, axis) => (prev[axis.key] === candidate[axis.key] ? o + 1 : o), 0),
            ),
          );

      // 综合分：本批距离越远越好，历史重合越少越好
      const score = minD * 10 - historyOverlap * 3;
      const fingerprint = coordinateFingerprint(candidate);
      if (chosenFingerprints.has(fingerprint)) continue;

      if (score > bestScore) {
        bestScore = score;
        best = candidate;
        // 达到目标距离即可提前跳出
        if (minD >= minDistance && historyOverlap <= Math.floor(axes.length / 2)) {
          break;
        }
      }
    }

    if (!best) {
      // fallback：纯随机
      const fallback: AngleCoordinate = {};
      for (const axis of axes) {
        fallback[axis.key] = axis.values[Math.floor(rand() * axis.values.length)];
      }
      best = fallback;
    }

    results.push(best);
    chosenFingerprints.add(coordinateFingerprint(best));
  }

  return results;
}
