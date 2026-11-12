import data from './levels.json';

export interface Level {
  pack: number;
  index: number;
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
export const PACK_COUNT = packs.length;

export function packSize(pack: number): number {
  return packs[pack].levels.length;
}

export function getLevel(pack: number, index: number): Level {
  const { w, h, levels } = packs[pack];
  return { pack, index, w, h, solution: decodeLevel(w, levels[index]) };
}

export function totalLevels(): number {
  return packs.reduce((n, p) => n + p.levels.length, 0);
}
