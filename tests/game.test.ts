import { describe, expect, it } from 'vitest';
import { Game } from '../src/game';
import type { Level } from '../src/levels';

// 3x3 grid:  0 1 2 / 3 4 5 / 6 7 8
const level: Level = { pack: 0, index: 0, w: 3, h: 3, solution: [[0, 1, 2], [3, 4, 5, 8, 7, 6]] };

function draw(game: Game, cells: number[]) {
  const k = game.begin(cells[0])!;
  for (const c of cells.slice(1)) game.extend(k, c);
  return k;
}

describe('Game', () => {
  it('solves when every pair is joined and every cell is filled', () => {
    const g = new Game(level);
    draw(g, [0, 1, 2]);
    expect(g.isSolved()).toBe(false);
    draw(g, [3, 4, 5, 8, 7, 6]);
    expect(g.isSolved()).toBe(true);
  });

  it('accepts a path drawn from either end', () => {
    const g = new Game(level);
    draw(g, [2, 1, 0]);
    expect(g.isComplete(0)).toBe(true);
  });

  it('blocks other colors endpoints and non-adjacent cells', () => {
    const g = new Game(level);
    const k = g.begin(0)!;
    expect(g.extend(k, 3)).toBe(false);
    expect(g.extend(k, 2)).toBe(false);
  });

  it('backtracking shortens the path', () => {
    const g = new Game(level);
    const k = draw(g, [3, 4, 5]);
    g.extend(k, 4);
    expect(g.paths[k]).toEqual([3, 4]);
  });

  it('drawing over another path cuts it', () => {
    const g = new Game(level);
    draw(g, [3, 4, 1]);
    const k = draw(g, [0]);
    g.extend(k, 1);
    expect(g.paths[1]).toEqual([3, 4]);
    expect(g.paths[k]).toEqual([0, 1]);
  });

  it('stops extending a completed path', () => {
    const g = new Game(level);
    const k = draw(g, [0, 1, 2]);
    expect(g.extend(k, 5)).toBe(false);
  });

  it('undo restores the previous state', () => {
    const g = new Game(level);
    g.snapshot();
    draw(g, [0, 1, 2]);
    g.undo();
    expect(g.paths[0]).toEqual([]);
  });

  it('hint lays a correct path and trims paths in its way', () => {
    const g = new Game(level);
    draw(g, [3, 4, 1]);
    const k = g.hint();
    expect(k).toBe(0);
    expect(g.paths[0]).toEqual([0, 1, 2]);
    expect(g.paths[1]).toEqual([3, 4]);
    g.hint();
    expect(g.isSolved()).toBe(true);
  });
});
