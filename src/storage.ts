export type Lang = 'en' | 'ru';

interface Saved {
  finished: number;
  lang: Lang;
  muted: boolean;
}

const KEY = 'dot-paths';
const DEFAULTS: Saved = { finished: 0, lang: 'en', muted: false };

function load(): Saved {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const { finished, lang, muted } = { ...DEFAULTS, ...JSON.parse(raw) };
      return { finished: typeof finished === 'number' ? finished : 0, lang, muted };
    }
  } catch {
    /* storage unavailable */
  }
  return { ...DEFAULTS };
}

const state = load();

function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* storage unavailable */
  }
}

export const store = {
  /** How many levels are done; also the number of the next level to play. */
  get finished() {
    return state.finished;
  },
  markDone(level: number) {
    if (level === state.finished) {
      state.finished++;
      save();
    }
  },
  startOver() {
    state.finished = 0;
    save();
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
