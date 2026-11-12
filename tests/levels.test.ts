import { describe, expect, it } from 'vitest';
import { countSolutions, neighbors } from '../scripts/solver.mjs';
import { decodeLevel, packs } from '../src/levels';

describe('levels', () => {
  it('has 3000 levels, ending with 500 at 10x10, 500 at 11x11 and 1000 at 12x12', () => {
    expect(packs).toHaveLength(30);
    for (const p of packs) expect(p.levels).toHaveLength(100);
    expect(packs.slice(10).map((p) => p.w)).toEqual([...Array(5).fill(10), ...Array(5).fill(11), ...Array(10).fill(12)]);
  });

  it('every level is unique', () => {
    const all = packs.flatMap((p) => p.levels.map((l) => `${p.w}x${p.h}|${l}`));
    expect(new Set(all).size).toBe(all.length);
  });

  packs.forEach((pack, p) => {
    it(`pack ${p + 1}: each stored solution fills the grid and is the only solution`, () => {
      const { w, h } = pack;
      for (const code of pack.levels) {
        const paths = decodeLevel(w, code);
        const cells = paths.flat();
        expect(cells.every((c) => c >= 0 && c < w * h)).toBe(true);
        expect(new Set(cells).size).toBe(w * h);
        for (const path of paths) {
          expect(path.length).toBeGreaterThanOrEqual(3);
          for (let i = 1; i < path.length; i++) expect(neighbors(w, h, path[i - 1])).toContain(path[i]);
        }
        const ends = paths.map((path) => [path[0], path[path.length - 1]]);
        expect(countSolutions(w, h, ends, 2)).toBe(1);
      }
    }, 600_000);
  });
});
