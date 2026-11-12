import './style.css';
import { Board, COLORS } from './board';
import { confetti, levelDone, pathDone } from './fx';
import { Game } from './game';
import { t } from './i18n';
import { getLevel, LEVEL_COUNT } from './levels';
import { store } from './storage';

type Screen = { name: 'home' } | { name: 'game' } | { name: 'settings' } | { name: 'finished' };

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
  else if (screen.name === 'game') play();
  else if (screen.name === 'settings') settings();
  else finished();
}

function home(): void {
  app.append(topBar(t('title'), null, button('⚙', 'icon', () => go({ name: 'settings' }))));
  const main = el('main', 'scroll center');
  main.append(el('p', 'howto', t('howTo')));
  main.append(el('p', 'progress', `${t('level')} ${Math.min(store.finished, LEVEL_COUNT - 1) + 1}`));
  main.append(button(t('play'), 'primary play', () => go({ name: 'game' })));
  app.append(main);
}

function play(): void {
  if (store.finished >= LEVEL_COUNT) {
    finished();
    return;
  }
  const number = store.finished;
  const game = new Game(getLevel(number));
  app.append(topBar(`${t('level')} ${number + 1}`, () => go({ name: 'home' })));

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
    store.markDone(number);
    levelDone();
    confetti(COLORS.slice(0, game.colors));
    if (store.finished >= LEVEL_COUNT) {
      setTimeout(() => go({ name: 'finished' }, false), 1200);
      return;
    }
    const overlay = el('div', 'overlay');
    const card = el('div', 'card');
    card.append(el('h2', '', t('solved')));
    card.append(button(t('next'), 'primary', () => go({ name: 'game' }, false)));
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
  app.append(topBar(t('title'), () => go({ name: 'home' })));
  const main = el('main', 'scroll center');
  main.append(el('div', 'trophy', '🏆'));
  main.append(el('h2', '', t('finishedTitle')));
  main.append(el('p', 'howto', t('finishedText')));
  main.append(button(t('startOver'), 'primary', () => {
    store.startOver();
    go({ name: 'game' }, false);
  }));
  app.append(main);
  confetti(COLORS);
}

history.replaceState({ name: 'home' }, '');
render({ name: 'home' });
