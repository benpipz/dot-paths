import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { countSolutions, neighbors } from './solver.mjs';

// Each pack: grid size and the range of colors. Fewer colors on the same grid means longer, harder paths.
const PACKS = [
  { w: 5, h: 5, k: [4, 5] },
  { w: 6, h: 6, k: [5, 6] },
  { w: 7, h: 7, k: [6, 7] },
  { w: 7, h: 7, k: [4, 5] },
  { w: 8, h: 8, k: [5, 6] },
  { w: 8, h: 8, k: [5, 6] },
  { w: 9, h: 9, k: [6, 7] },
  { w: 9, h: 9, k: [5, 6] },
  { w: 10, h: 10, k: [6, 7] },
  { w: 10, h: 10, k: [6, 7] },
  ...Array(5).fill({ w: 10, h: 10, k: [5, 6] }),
  ...Array(5).fill({ w: 11, h: 11, k: [6, 7] }),
  ...Array(10).fill({ w: 12, h: 12, k: [6, 8] }),
];
const PER_PACK = Number(process.env.PER_PACK ?? 100);
const ONLY = process.env.PACK === undefined ? null : Number(process.env.PACK);

function rng(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// The solver model forbids a path touching itself, so candidates never do.
function touchesItself(w, h, seg) {
  const idx = new Map(seg.map((c, i) => [c, i]));
  return seg.some((c, i) => neighbors(w, h, c).some((d) => idx.has(d) && Math.abs(idx.get(d) - i) > 1));
}

// Grows paths one at a time from the most cramped free cell, then merges short or extra paths end to end.
function randomPartition(w, h, kMax, rand) {
  const n = w * h;
  const free = new Uint8Array(n).fill(1);
  const freeCount = (c) => neighbors(w, h, c).filter((d) => free[d]).length;
  const avg = n / kMax;
  const paths = [];
  for (;;) {
    let best = [], bestScore = Infinity;
    for (let c = 0; c < n; c++) {
      if (!free[c]) continue;
      const s = freeCount(c);
      if (s < bestScore) { bestScore = s; best = [c]; } else if (s === bestScore) best.push(c);
    }
    if (!best.length) break;
    const start = best[(rand() * best.length) | 0];
    const path = [start];
    const inPath = new Set(path);
    free[start] = 0;
    const target = Math.max(3, Math.round(avg * (0.6 + rand() * 0.9)));
    while (path.length < target) {
      const tail = path[path.length - 1];
      const options = neighbors(w, h, tail).filter(
        (c) => free[c] && neighbors(w, h, c).every((d) => d === tail || !inPath.has(d)),
      );
      if (!options.length) break;
      options.sort((a, b) => freeCount(a) - freeCount(b) + (rand() - 0.5) * 1.5);
      const next = options[0];
      path.push(next);
      inPath.add(next);
      free[next] = 0;
    }
    paths.push(path);
  }
  return paths;
}

function tryJoin(w, h, a, b) {
  for (const x of [a, [...a].reverse()])
    for (const y of [b, [...b].reverse()])
      if (neighbors(w, h, x[x.length - 1]).includes(y[0])) {
        const joined = [...x, ...y];
        if (!touchesItself(w, h, joined)) return joined;
      }
  return null;
}

function mergePaths(w, h, paths, kMax, rand) {
  for (;;) {
    paths.sort((a, b) => a.length - b.length);
    const mustMerge = paths[0].length < 3;
    if (!mustMerge && paths.length <= kMax) return paths;
    let joined = null;
    const order = paths.map((_, i) => i).slice(1).sort(() => rand() - 0.5);
    for (const j of order) {
      joined = tryJoin(w, h, paths[0], paths[j]);
      if (joined) { paths.splice(j, 1); paths[0] = joined; break; }
    }
    if (!joined) {
      if (mustMerge) return null;
      // Merge any pair to reduce the count.
      let done = false;
      for (let i = 0; i < paths.length && !done; i++)
        for (let j = i + 1; j < paths.length && !done; j++) {
          const m = tryJoin(w, h, paths[i], paths[j]);
          if (m) { paths.splice(j, 1); paths[i] = m; done = true; }
        }
      if (!done) return null;
    }
  }
}

function difficulty(w, segs) {
  let score = 0;
  for (const seg of segs) {
    const [a, b] = [seg[0], seg[seg.length - 1]];
    score += seg.length - (Math.abs((a % w) - (b % w)) + Math.abs(((a / w) | 0) - ((b / w) | 0)));
    for (let i = 2; i < seg.length; i++) if (seg[i] - seg[i - 1] !== seg[i - 1] - seg[i - 2]) score++;
  }
  return score;
}

function encode(w, segs) {
  return segs
    .map((seg) => {
      let dirs = '';
      for (let i = 1; i < seg.length; i++) {
        const d = seg[i] - seg[i - 1];
        dirs += d === 1 ? 'R' : d === -1 ? 'L' : d === w ? 'D' : 'U';
      }
      return `${seg[0]}:${dirs}`;
    })
    .join(';');
}

function makeLevel({ w, h, k: [kMin, kMax] }, rand, seen) {
  for (let tries = 1; ; tries++) {
    const k = kMin + ((rand() * (kMax - kMin + 1)) | 0);
    const segs = mergePaths(w, h, randomPartition(w, h, k, rand), k, rand);
    if (!segs || segs.length < kMin) continue;
    for (let i = segs.length - 1; i > 0; i--) {
      const j = (rand() * (i + 1)) | 0;
      [segs[i], segs[j]] = [segs[j], segs[i]];
    }
    const code = encode(w, segs);
    if (seen.has(code)) continue;
    const ends = segs.map((s) => [s[0], s[s.length - 1]]);
    const found = countSolutions(w, h, ends, 2);
    stats[found]++;
    if (found !== 1) continue;
    seen.add(code);
    return { code, score: difficulty(w, segs), tries };
  }
}

const file = process.env.OUT ?? new URL('../src/levels.json', import.meta.url);
// Levels already shipped are kept as they are, so players' progress keeps pointing at the same puzzles.
const out = !process.env.OUT && existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { packs: [] };
const seen = new Set(out.packs.flatMap((p) => p.levels));
const stats = [0, 0, 0];
PACKS.forEach((pack, p) => {
  if (p < out.packs.length || (ONLY !== null && ONLY !== p)) return;
  const rand = rng(1000 + p);
  const t0 = Date.now();
  stats.fill(0);
  const levels = [];
  let tries = 0;
  while (levels.length < PER_PACK) {
    const lvl = makeLevel(pack, rand, seen);
    tries += lvl.tries;
    levels.push(lvl);
  }
  levels.sort((a, b) => a.score - b.score);
  out.packs.push({ w: pack.w, h: pack.h, levels: levels.map((l) => l.code) });
  console.log(`pack ${p + 1}: ${pack.w}x${pack.h}, ${levels.length} levels, ${tries} tries, solutions 0/1/2+: ${stats.join("/")}, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
});

writeFileSync(file, JSON.stringify(out));
