import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

// Three paths on a 4x4 grid, in grid units.
const PATHS = [
  { color: [255, 59, 59], pts: [[0, 0], [3, 0], [3, 1]] },
  { color: [47, 123, 255], pts: [[0, 1], [0, 3], [1, 3]] },
  { color: [46, 204, 64], pts: [[1, 1], [2, 1], [2, 2], [3, 2], [3, 3]] },
];
const BG = [14, 16, 22];

function distToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax, dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - ax - t * dx, py - ay - t * dy);
}

function shade(u, v, maskable) {
  // u, v in 0..1 across the icon
  const pad = maskable ? 0.24 : 0.14;
  const cell = (1 - 2 * pad) / 4;
  const gx = (u - pad) / cell - 0.5, gy = (v - pad) / cell - 0.5;
  for (const { color, pts } of PATHS) {
    const ends = [pts[0], pts[pts.length - 1]];
    if (ends.some(([x, y]) => Math.hypot(gx - x, gy - y) < 0.38)) return color;
    for (let i = 1; i < pts.length; i++) if (distToSegment(gx, gy, pts[i - 1], pts[i]) < 0.17) return color;
  }
  if (!maskable) {
    const r = 0.18, cx = Math.min(Math.max(u, r), 1 - r), cy = Math.min(Math.max(v, r), 1 - r);
    if (Math.hypot(u - cx, v - cy) > r) return null;
  }
  return BG;
}

function png(size, maskable) {
  const ss = 3;
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < ss; sy++)
        for (let sx = 0; sx < ss; sx++) {
          const c = shade((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size, maskable);
          if (c) { r += c[0]; g += c[1]; b += c[2]; a++; }
        }
      const o = y * (size * 4 + 1) + 1 + x * 4;
      raw[o] = a ? r / a : 0;
      raw[o + 1] = a ? g / a : 0;
      raw[o + 2] = a ? b / a : 0;
      raw[o + 3] = (a / (ss * ss)) * 255;
    }
  }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const td = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(td));
    return Buffer.concat([len, td, crc]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function crc32(buf) {
  let c = ~0;
  for (const byte of buf) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

const dir = new URL('../public/', import.meta.url);
mkdirSync(dir, { recursive: true });
writeFileSync(new URL('icon-192.png', dir), png(192, false));
writeFileSync(new URL('icon-512.png', dir), png(512, false));
writeFileSync(new URL('icon-maskable.png', dir), png(512, true));
