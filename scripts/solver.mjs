import Logic from 'logic-solver';

export function neighbors(w, h, c) {
  const x = c % w, y = (c / w) | 0, out = [];
  if (x > 0) out.push(c - 1);
  if (x < w - 1) out.push(c + 1);
  if (y > 0) out.push(c - w);
  if (y < h - 1) out.push(c + w);
  return out;
}

// Counts the ways to draw the paths (up to `limit`), using the game's rules: each pair is
// joined by one path, paths never share a cell, every cell is used. A path may run alongside itself.
export function countSolutions(w, h, ends, limit = 2) {
  const n = w * h, K = ends.length;
  const S = new Logic.Solver();
  const x = (c, k) => `x${c}_${k}`;
  const e = (a, b) => (a < b ? `e${a}_${b}` : `e${b}_${a}`);
  const endColor = new Map();
  ends.forEach(([a, b], k) => { endColor.set(a, k); endColor.set(b, k); });

  const edges = [];
  for (let c = 0; c < n; c++) for (const d of neighbors(w, h, c)) if (c < d) edges.push([c, d]);

  for (let c = 0; c < n; c++) {
    const colors = [];
    for (let k = 0; k < K; k++) colors.push(x(c, k));
    S.require(Logic.exactlyOne(...colors));
    if (endColor.has(c)) S.require(x(c, endColor.get(c)));
    const inc = neighbors(w, h, c).map((d) => e(c, d));
    const degree = Logic.sum(...inc);
    S.require(Logic.equalBits(degree, Logic.constantBits(endColor.has(c) ? 1 : 2)));
  }
  for (const [a, b] of edges)
    for (let k = 0; k < K; k++) {
      S.require(Logic.or(Logic.not(e(a, b)), Logic.not(x(a, k)), x(b, k)));
      S.require(Logic.or(Logic.not(e(a, b)), Logic.not(x(b, k)), x(a, k)));
    }

  let found = 0;
  for (;;) {
    const sol = S.solve();
    if (!sol) return found;
    const on = edges.filter(([a, b]) => sol.evaluate(e(a, b)));
    const loop = findLoop(n, ends, on);
    if (loop) {
      S.require(Logic.or(...loop.map(([a, b]) => Logic.not(e(a, b)))));
      continue;
    }
    if (++found >= limit) return found;
    S.forbid(Logic.and(...edges.map(([a, b]) => (sol.evaluate(e(a, b)) ? e(a, b) : Logic.not(e(a, b))))));
  }
}

// Returns the edges of a closed loop not attached to any endpoint, if the drawing has one.
function findLoop(n, ends, on) {
  const adj = Array.from({ length: n }, () => []);
  for (const [a, b] of on) { adj[a].push(b); adj[b].push(a); }
  const seen = new Uint8Array(n);
  for (const [a] of ends) {
    const stack = [a];
    seen[a] = 1;
    while (stack.length) for (const d of adj[stack.pop()]) if (!seen[d]) { seen[d] = 1; stack.push(d); }
  }
  const start = seen.indexOf(0);
  if (start < 0) return null;
  const cells = new Set([start]), stack = [start];
  while (stack.length) for (const d of adj[stack.pop()]) if (!cells.has(d)) { cells.add(d); stack.push(d); }
  return on.filter(([a]) => cells.has(a));
}
