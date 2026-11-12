import type { Game } from './game';

export const COLORS = ['#ff3b3b', '#2f7bff', '#2ecc40', '#ffdc00', '#ff8c1a', '#3ee0e0', '#f43fd0', '#f2f2f2', '#9d5cff', '#b5793c'];

export interface BoardEvents {
  onChange(): void;
  onPathDone(): void;
  onSolved(): void;
}

export class Board {
  private ctx: CanvasRenderingContext2D;
  private cell = 0;
  private color: number | undefined;
  private last = -1;
  private downCell = -1;
  private moved = false;
  private finger: { x: number; y: number } | null = null;
  private completeBefore: boolean[] = [];
  private locked = false;

  constructor(private canvas: HTMLCanvasElement, private game: Game, private events: BoardEvents) {
    this.ctx = canvas.getContext('2d')!;
    canvas.addEventListener('pointerdown', (e) => this.down(e));
    canvas.addEventListener('pointermove', (e) => this.move(e));
    canvas.addEventListener('pointerup', () => this.up());
    canvas.addEventListener('pointercancel', () => this.up());
  }

  lock(): void {
    this.locked = true;
    this.color = undefined;
    this.finger = null;
  }

  resize(maxW: number, maxH: number): void {
    const { w, h } = this.game;
    this.cell = Math.floor(Math.min(maxW / w, maxH / h));
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${this.cell * w}px`;
    this.canvas.style.height = `${this.cell * h}px`;
    this.canvas.width = Math.round(this.cell * w * dpr);
    this.canvas.height = Math.round(this.cell * h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.draw();
  }

  private point(e: PointerEvent) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private cellAt(x: number, y: number): number {
    const { w, h } = this.game;
    const cx = Math.min(w - 1, Math.max(0, Math.floor(x / this.cell)));
    const cy = Math.min(h - 1, Math.max(0, Math.floor(y / this.cell)));
    return cy * w + cx;
  }

  private down(e: PointerEvent): void {
    if (this.locked || this.color !== undefined) return;
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.point(e);
    const cell = this.cellAt(p.x, p.y);
    this.completeBefore = this.game.paths.map((_, k) => this.game.isComplete(k));
    this.game.snapshot();
    this.color = this.game.begin(cell);
    if (this.color === undefined) {
      this.game.dropSnapshotIfUnchanged();
      return;
    }
    this.last = cell;
    this.downCell = cell;
    this.moved = false;
    this.finger = p;
    this.draw();
  }

  private move(e: PointerEvent): void {
    if (this.color === undefined) return;
    const p = this.point(e);
    this.finger = p;
    const target = this.cellAt(p.x, p.y);
    const { w } = this.game;
    // Walk one cell at a time so fast swipes don't skip squares.
    while (this.last !== target) {
      const dx = (target % w) - (this.last % w);
      const dy = ((target / w) | 0) - ((this.last / w) | 0);
      const step = Math.abs(dx) >= Math.abs(dy) ? Math.sign(dx) : Math.sign(dy) * w;
      const next = this.last + step;
      if (!this.game.extend(this.color, next)) break;
      this.last = next;
      this.moved = true;
    }
    this.draw();
  }

  private up(): void {
    if (this.color === undefined) return;
    if (!this.moved && this.game.endpointColor(this.downCell) === undefined) this.game.clear(this.color);
    this.game.dropSnapshotIfUnchanged();
    const k = this.color;
    this.color = undefined;
    this.finger = null;
    this.draw();
    this.events.onChange();
    if (this.game.isSolved()) this.events.onSolved();
    else if (this.game.isComplete(k) && !this.completeBefore[k]) this.events.onPathDone();
  }

  draw(): void {
    const { ctx, cell: s, game } = this;
    const { w, h } = game;
    ctx.clearRect(0, 0, w * s, h * s);

    ctx.fillStyle = '#16181f';
    ctx.fillRect(0, 0, w * s, h * s);

    game.paths.forEach((p, k) => {
      ctx.fillStyle = COLORS[k] + '38';
      for (const c of p) ctx.fillRect((c % w) * s, ((c / w) | 0) * s, s, s);
    });

    ctx.strokeStyle = '#3a3f4d';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= w; x++) {
      ctx.moveTo(x * s + 0.5, 0);
      ctx.lineTo(x * s + 0.5, h * s);
    }
    for (let y = 0; y <= h; y++) {
      ctx.moveTo(0, y * s + 0.5);
      ctx.lineTo(w * s, y * s + 0.5);
    }
    ctx.stroke();

    const center = (c: number) => [(c % w) * s + s / 2, ((c / w) | 0) * s + s / 2];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = s * 0.34;
    game.paths.forEach((p, k) => {
      if (p.length < 2) return;
      ctx.strokeStyle = COLORS[k];
      ctx.beginPath();
      p.forEach((c, i) => {
        const [x, y] = center(c);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    });

    game.ends.forEach(([a, b], k) => {
      for (const c of [a, b]) {
        const [x, y] = center(c);
        ctx.fillStyle = COLORS[k];
        ctx.beginPath();
        ctx.arc(x, y, s * 0.36, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    if (this.finger && this.color !== undefined) {
      ctx.fillStyle = COLORS[this.color] + '40';
      ctx.beginPath();
      ctx.arc(this.finger.x, this.finger.y, s * 0.9, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}
