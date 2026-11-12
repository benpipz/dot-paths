export type Lang = 'en' | 'ru';

interface Saved {
  done: Record<string, true>;
  lang: Lang;
  muted: boolean;
}

const KEY = 'dot-paths';

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { done: {}, lang: 'en', muted: false, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable */
  }
  return { done: {}, lang: 'en', muted: false };
}

const state = load();

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

const id = (pack: number, index: number) => `${pack}-${index}`;

export const store = {
  isDone: (pack: number, index: number) => !!state.done[id(pack, index)],
  markDone(pack: number, index: number) {
    state.done[id(pack, index)] = true;
    save();
  },
  isOpen: (pack: number, index: number) => index === 0 || !!state.done[id(pack, index - 1)] || !!state.done[id(pack, index)],
  doneCount: () => Object.keys(state.done).length,
  doneInPack(pack: number): number {
    return Object.keys(state.done).filter((k) => k.startsWith(`${pack}-`)).length;
  },
  get lang() {
    return state.lang;
  },
  set lang(v: Lang) {
    state.lang = v;
    save();
  },
  get muted() {
    return state.muted;
  },
  set muted(v: boolean) {
    state.muted = v;
    save();
  },
};
