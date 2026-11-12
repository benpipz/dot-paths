import data from './levels.json';

export interface Level {
  number: number;
  w: number;
  h: number;
  solution: number[][];
}

const STEP: Record<string, (w: number) => number> = { R: () => 1, L: () => -1, D: (w) => w, U: (w) => -w };

export function decodeLevel(w: number, code: string): number[][] {
  return code.split(';').map((part) => {
    const [start, dirs] = part.split(':');
    const path = [Number(start)];
    for (const d of dirs) path.push(path[path.length - 1] + STEP[d](w));
    return path;
  });
}

export const packs: { w: number; h: number; levels: string[] }[] = data.packs;

const all = packs.flatMap((p) => p.levels.map((code) => ({ w: p.w, h: p.h, code })));

export const LEVEL_COUNT = all.length;

/** Levels run one after another across all packs, starting at 0. */
export function getLevel(number: number): Level {
  const { w, h, code } = all[number];
  return { number, w, h, solution: decodeLevel(w, code) };
}
