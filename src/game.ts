import type { Level } from './levels';

export class Game {
  readonly w: number;
  readonly h: number;
  readonly ends: [number, number][];
  paths: number[][];
  private endColor = new Map<number, number>();
  private history: number[][][] = [];

  constructor(readonly level: Level) {
    this.w = level.w;
    this.h = level.h;
    this.ends = level.solution.map((p) => [p[0], p[p.length - 1]]);
    this.ends.forEach(([a, b], k) => {
      this.endColor.set(a, k);
      this.endColor.set(b, k);
    });
    this.paths = this.ends.map(() => []);
  }

  get colors(): number {
    return this.ends.length;
  }

  endpointColor(cell: number): number | undefined {
    return this.endColor.get(cell);
  }

  colorAt(cell: number): number | undefined {
    for (let k = 0; k < this.paths.length; k++) if (this.paths[k].includes(cell)) return k;
    return undefined;
  }

  isComplete(k: number): boolean {
    const p = this.paths[k];
    if (p.length < 2) return false;
    const [a, b] = this.ends[k];
    return (p[0] === a && p[p.length - 1] === b) || (p[0] === b && p[p.length - 1] === a);
  }

  isSolved(): boolean {
    if (!this.paths.every((_, k) => this.isComplete(k))) return false;
    return this.paths.reduce((n, p) => n + p.length, 0) === this.w * this.h;
  }

  adjacent(a: number, b: number): boolean {
    const ax = a % this.w, bx = b % this.w;
    return (Math.abs(a - b) === 1 && ((a / this.w) | 0) === ((b / this.w) | 0)) || (Math.abs(a - b) === this.w && ax === bx);
  }

  snapshot(): void {
    this.history.push(this.paths.map((p) => [...p]));
    if (this.history.length > 200) this.history.shift();
  }

  /** Drops the last snapshot when a stroke changed nothing. */
  dropSnapshotIfUnchanged(): void {
    const last = this.history[this.history.length - 1];
    if (last && JSON.stringify(last) === JSON.stringify(this.paths)) this.history.pop();
  }

  canUndo(): boolean {
    return this.history.length > 0;
  }

  undo(): void {
    const prev = this.history.pop();
    if (prev) this.paths = prev;
  }

  restart(): void {
    if (this.paths.some((p) => p.length)) this.snapshot();
    this.paths = this.ends.map(() => []);
  }

  /** Starts a stroke at a cell; returns the color being drawn, if any. */
  begin(cell: number): number | undefined {
    const end = this.endColor.get(cell);
    if (end !== undefined) {
      this.paths[end] = [cell];
      return end;
    }
    const k = this.colorAt(cell);
    if (k === undefined) return undefined;
    const p = this.paths[k];
    this.paths[k] = p.slice(0, p.indexOf(cell) + 1);
    return k;
  }

  clear(k: number): void {
    this.paths[k] = [];
  }

  /** Extends color k's path to a neighbouring cell. Returns true if the path changed. */
  extend(k: number, cell: number): boolean {
    const p = this.paths[k];
    const last = p[p.length - 1];
    if (last === undefined || cell === last || !this.adjacent(last, cell)) return false;
    const at = p.indexOf(cell);
    if (at >= 0) {
      this.paths[k] = p.slice(0, at + 1);
      return true;
    }
    if (this.isComplete(k)) return false;
    const end = this.endColor.get(cell);
    if (end !== undefined && end !== k) return false;
    const other = this.colorAt(cell);
    if (other !== undefined) this.cut(other, cell);
    p.push(cell);
    return true;
  }

  private cut(k: number, cell: number): void {
    const p = this.paths[k];
    this.paths[k] = p.slice(0, p.indexOf(cell));
  }

  /** Lays one correct path, preferring the first color that isn't already right. */
  hint(): number | undefined {
    const sol = this.level.solution;
    const same = (a: number[], b: number[]) =>
      a.length === b.length && (a.every((c, i) => c === b[i]) || a.every((c, i) => c === b[b.length - 1 - i]));
    const k = sol.findIndex((s, k) => !same(this.paths[k], s));
    if (k < 0) return undefined;
    this.snapshot();
    const cells = new Set(sol[k]);
    this.paths.forEach((p, j) => {
      if (j === k) return;
      const hit = p.findIndex((c) => cells.has(c));
      if (hit >= 0) this.paths[j] = p.slice(0, hit);
    });
    this.paths[k] = [...sol[k]];
    return k;
  }
}
