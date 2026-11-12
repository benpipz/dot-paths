import { store } from './storage';

let ctx: AudioContext | undefined;

function tone(freq: number, start: number, length: number, volume: number): void {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = freq;
  const t0 = ctx.currentTime + start;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + length);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + length + 0.05);
}

function audio(): boolean {
  if (store.muted) return false;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return true;
  } catch {
    return false;
  }
}

function vibrate(pattern: number | number[]): void {
  if (!store.muted && 'vibrate' in navigator) navigator.vibrate(pattern);
}

export function pathDone(): void {
  if (audio()) tone(660, 0, 0.18, 0.08);
  vibrate(15);
}

export function levelDone(): void {
  if (audio()) [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.4, 0.09));
  vibrate([30, 60, 30]);
}

export function confetti(colors: string[]): void {
  const layer = document.createElement('div');
  layer.className = 'confetti';
  for (let i = 0; i < 60; i++) {
    const bit = document.createElement('i');
    bit.style.left = `${Math.random() * 100}%`;
    bit.style.background = colors[i % colors.length];
    bit.style.animationDelay = `${Math.random() * 0.4}s`;
    bit.style.animationDuration = `${1.4 + Math.random()}s`;
    bit.style.setProperty('--drift', `${(Math.random() - 0.5) * 160}px`);
    layer.appendChild(bit);
  }
  document.body.appendChild(layer);
  setTimeout(() => layer.remove(), 3000);
}
