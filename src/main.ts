import './style.css';
import { Board, COLORS } from './board';
import { confetti, levelDone, pathDone } from './fx';
import { Game } from './game';
import { t } from './i18n';
import { getLevel, PACK_COUNT, packs, packSize, totalLevels } from './levels';
import { store } from './storage';

type Screen =
  | { name: 'home' }
  | { name: 'pack'; pack: number }
  | { name: 'game'; pack: number; index: number }
  | { name: 'settings' }
  | { name: 'finished' };

const app = document.getElementById('app')!;
let onResize: (() => void) | null = null;
window.addEventListener('resize', () => onResize?.());

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', text = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  return e;
}

function button(text: string, cls: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', cls, text);
  b.addEventListener('click', onClick);
  return b;
}

function topBar(title: string, back: (() => void) | null, right?: HTMLElement): HTMLElement {
  const bar = el('header', 'top');
  bar.append(back ? button('‹', 'icon', back) : el('span', 'icon-space'));
  bar.append(el('h1', '', title));
  bar.append(right ?? el('span', 'icon-space'));
  return bar;
}

function go(screen: Screen, push = true): void {
  if (push) history.pushState(screen, '');
  render(screen);
}

window.addEventListener('popstate', (e) => render((e.state as Screen) ?? { name: 'home' }));

function render(screen: Screen): void {
  onResize = null;
  app.replaceChildren();
  if (screen.name === 'home') home();
  else if (screen.name === 'pack') packScreen(screen.pack);
  else if (screen.name === 'game') gameScreen(screen.pack, screen.index);
  else if (screen.name === 'settings') settings();
  else finished();
}

function home(): void {
  app.append(topBar(t('title'), null, button('⚙', 'icon', () => go({ name: 'settings' }))));
  const main = el('main', 'scroll');
  main.append(el('p', 'howto', t('howTo')));
  for (let p = 0; p < PACK_COUNT; p++) {
    const { w, h } = packs[p];
    const b = button('', 'pack', () => go({ name: 'pack', pack: p }));
    b.style.setProperty('--accent', COLORS[p % COLORS.length]);
    b.append(el('span', 'pack-name', `${t('pack')} ${p + 1}`));
    b.append(el('span', 'pack-size', `${w}×${h}`));
    b.append(el('span', 'pack-count', `${store.doneInPack(p)} / ${packSize(p)}`));
    main.append(b);
  }
  app.append(main);
}

function packScreen(pack: number): void {
  app.append(topBar(`${t('pack')} ${pack + 1}`, () => go({ name: 'home' })));
  const main = el('main', 'scroll');
  const grid = el('div', 'tiles');
  for (let i = 0; i < packSize(pack); i++) {
    const done = store.isDone(pack, i);
    const open = store.isOpen(pack, i);
    const tile = button(String(i + 1), `tile${done ? ' done' : ''}${open ? '' : ' locked'}`, () =>
      go({ name: 'game', pack, index: i }),
    );
    tile.disabled = !open;
    grid.append(tile);
  }
  main.append(grid);
  app.append(main);
}

function nextLevel(pack: number, index: number): Screen {
  if (index + 1 < packSize(pack)) return { name: 'game', pack, index: index + 1 };
  for (let p = 1; p <= PACK_COUNT; p++) {
    const q = (pack + p) % PACK_COUNT;
    for (let i = 0; i < packSize(q); i++) if (!store.isDone(q, i)) return { name: 'game', pack: q, index: i };
  }
  return { name: 'home' };
}

function gameScreen(pack: number, index: number): void {
  const game = new Game(getLevel(pack, index));
  app.append(topBar(`${t('pack')} ${pack + 1} · ${t('level')} ${index + 1}`, () => go({ name: 'pack', pack })));

  const stage = el('main', 'stage');
  const canvas = el('canvas', 'board');
  stage.append(canvas);
  app.append(stage);

  const controls = el('footer', 'controls');
  const undo = button(t('undo'), 'ctrl', () => {
    game.undo();
    refresh();
  });
  const restart = button(t('restart'), 'ctrl', () => {
    game.restart();
    refresh();
  });
  const hint = button(t('hint'), 'ctrl', () => {
    if (game.hint() === undefined) return;
    refresh();
    if (game.isSolved()) solved();
    else pathDone();
  });
  controls.append(undo, restart, hint);
  app.append(controls);

  const refresh = () => {
    board.draw();
    undo.disabled = !game.canUndo();
  };

  const solved = () => {
    board.lock();
    controls.querySelectorAll('button').forEach((b) => (b.disabled = true));
    const before = store.doneCount();
    store.markDone(pack, index);
    levelDone();
    confetti(COLORS.slice(0, game.colors));
    if (store.doneCount() === totalLevels() && before < totalLevels()) {
      setTimeout(() => go({ name: 'finished' }), 1200);
      return;
    }
    const overlay = el('div', 'overlay');
    const card = el('div', 'card');
    card.append(el('h2', '', t('solved')));
    card.append(button(t('next'), 'primary', () => go(nextLevel(pack, index))));
    card.append(button(t('menu'), 'secondary', () => go({ name: 'pack', pack })));
    overlay.append(card);
    setTimeout(() => app.append(overlay), 500);
  };

  const board = new Board(canvas, game, { onChange: refresh, onPathDone: pathDone, onSolved: solved });
  onResize = () => board.resize(stage.clientWidth - 16, stage.clientHeight - 16);
  requestAnimationFrame(() => onResize?.());
  refresh();
}

function settings(): void {
  app.append(topBar(t('settings'), () => go({ name: 'home' })));
  const main = el('main', 'scroll');

  const row = (label: string, options: [string, boolean, () => void][]) => {
    const r = el('div', 'setting');
    r.append(el('span', 'setting-label', label));
    const seg = el('div', 'segmented');
    for (const [text, active, pick] of options)
      seg.append(button(text, active ? 'active' : '', () => {
        pick();
        go({ name: 'settings' }, false);
      }));
    r.append(seg);
    main.append(r);
  };

  row(t('language'), [
    ['English', store.lang === 'en', () => (store.lang = 'en')],
    ['Русский', store.lang === 'ru', () => (store.lang = 'ru')],
  ]);
  row(t('sound'), [
    [t('on'), !store.muted, () => (store.muted = false)],
    [t('off'), store.muted, () => (store.muted = true)],
  ]);
  app.append(main);
}

function finished(): void {
  app.append(topBar(t('title'), null));
  const main = el('main', 'scroll center');
  main.append(el('div', 'trophy', '🏆'));
  main.append(el('h2', '', t('finishedTitle')));
  main.append(el('p', 'howto', t('finishedText')));
  main.append(button(t('menu'), 'primary', () => go({ name: 'home' })));
  app.append(main);
  confetti(COLORS);
}

history.replaceState({ name: 'home' }, '');
render({ name: 'home' });
