import { store } from './storage';

const strings = {
  en: {
    title: 'Dot Paths',
    level: 'Level',
    undo: 'Undo',
    restart: 'Restart',
    hint: 'Hint',
    solved: 'Well done!',
    next: 'Next level',
    play: 'Play',
    startOver: 'Start over',
    settings: 'Settings',
    language: 'Language',
    sound: 'Sound & vibration',
    on: 'On',
    off: 'Off',
    back: 'Back',
    finishedTitle: 'You finished every level!',
    finishedText: 'Amazing work! You can start over from level 1.',
    howTo: 'Connect dots of the same color. Fill every square. Lines cannot cross.',
  },
  ru: {
    title: 'Dot Paths',
    level: 'Уровень',
    undo: 'Отменить',
    restart: 'Заново',
    hint: 'Подсказка',
    solved: 'Отлично!',
    next: 'Следующий уровень',
    play: 'Играть',
    startOver: 'Начать сначала',
    settings: 'Настройки',
    language: 'Язык',
    sound: 'Звук и вибрация',
    on: 'Вкл',
    off: 'Выкл',
    back: 'Назад',
    finishedTitle: 'Вы прошли все уровни!',
    finishedText: 'Потрясающе! Можно начать сначала с первого уровня.',
    howTo: 'Соедините точки одного цвета. Заполните все клетки. Линии не могут пересекаться.',
  },
};

export type Key = keyof typeof strings.en;

export function t(key: Key): string {
  return strings[store.lang][key];
}
