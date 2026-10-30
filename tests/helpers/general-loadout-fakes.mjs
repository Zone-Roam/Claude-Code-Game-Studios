// Small inline fixtures for general-loadout tests (design/gdd/general-loadout.md
// Acceptance Criteria data: release chapters 1-3, 8, 9). Not the real chapter file.

/** Generals table: id -> charge unit kind (registry charge_kind). */
export const GENERALS = Object.freeze({
  guan_yu: { charge: 'dao' },
  zhang_fei: { charge: 'gu' },
  zhao_yun: { charge: 'dun' },
  liu_bei: { charge: 'qi' },
  zhuge_liang: { charge: 'shu' },
  huang_zhong: { charge: 'gong' },
});

export const STARTERS = Object.freeze(['guan_yu']);

const deck = (kinds) => kinds.reduce((d, k) => Object.assign(d, { [k]: 6 }), {});

export const CH01 = Object.freeze({ id: 'ch01', slots: 1, lead: 'guan_yu', recommend: ['guan_yu'], unlock: 'zhang_fei', deck: deck(['dao', 'gu', 'jiu']) });
export const CH02 = Object.freeze({ id: 'ch02', slots: 2, lead: 'zhang_fei', recommend: ['zhang_fei', 'guan_yu'], deck: deck(['dao', 'gu', 'jiu']) });
export const CH03 = Object.freeze({ id: 'ch03', slots: 2, lead: 'zhao_yun', recommend: ['zhao_yun', 'guan_yu'], unlock: 'zhao_yun', deck: deck(['dao', 'gu', 'dun']) });
export const CH04 = Object.freeze({ id: 'ch04', slots: 2, lead: 'liu_bei', recommend: ['liu_bei', 'guan_yu'], unlock: 'liu_bei', deck: deck(['dao', 'qi', 'dun']) });
export const CH07 = Object.freeze({ id: 'ch07', slots: 3, lead: 'zhuge_liang', recommend: ['zhuge_liang', 'liu_bei', 'guan_yu'], unlock: 'zhuge_liang', deck: deck(['dao', 'qi', 'shu']) });
/** No 旗 (qi) in the deck. */
export const CH08 = Object.freeze({ id: 'ch08', slots: 3, lead: 'zhao_yun', recommend: ['zhao_yun', 'guan_yu', 'zhang_fei'], unlock: 'huang_zhong', deck: deck(['dao', 'gu', 'dun', 'jiu']) });
/** 刀、盾、旗、书、弓, no 鼓 (gu). */
export const CH09 = Object.freeze({ id: 'ch09', slots: 3, lead: 'zhuge_liang', recommend: ['zhuge_liang', 'zhao_yun', 'guan_yu'], deck: deck(['dao', 'dun', 'qi', 'shu', 'gong']) });

export const CHAPTERS = Object.freeze([CH01, CH02, CH03, CH04, CH07, CH08, CH09]);

/**
 * A wins lookup over an in-memory map (stands in for progress-save).
 * @param {Object<string, number>} wins chapterId -> wins
 * @returns {function(string): number}
 */
export function winsOf(wins) {
  return (id) => wins[id] || 0;
}

/** Intent helpers (0-based slot index, as round-flow's open card passes them). */
export const slotBtn = (slot) => ({ type: 'button', card: 'open', button: 'slot', slot });
export const pickBtn = (general) => ({ type: 'button', card: 'open', button: 'pick', general });
export const clearBtn = (slot) => ({ type: 'button', card: 'open', button: 'clear', slot });
