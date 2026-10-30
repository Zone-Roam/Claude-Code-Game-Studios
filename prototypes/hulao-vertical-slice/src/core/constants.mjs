// VERTICAL SLICE - NOT FOR PRODUCTION
// Validation Question: 没玩过的人 2 分钟内会玩、在第一回里感到“将在人为”；按新规则做出像样的一回要多久
// Date: 2026-10-27

// Tuning-knob defaults, named as in the GDDs and design/registry/entities.yaml (ADR-0001).

/** Tile kinds in the fixed kind-table order (board-link rule 2). Iterate kinds in this order, never by object key order. */
export const KINDS = ['huo', 'ying', 'ma', 'gong', 'shui', 'cheng', 'dao', 'gu', 'dun', 'shu', 'qi', 'jiu'];

/** Display name of each kind (one character). */
export const KIND_NAMES = {
  huo: '火', ying: '营', ma: '马', gong: '弓', shui: '水', cheng: '城',
  dao: '刀', gu: '鼓', dun: '盾', shu: '书', qi: '旗', jiu: '酒', ju: '拒',
};

/** Slice v5: a 拒马 barricade — blocks links, cannot be tapped, breaks when a pair next to it is cleared. Not a kind. */
export const BLOCK = 'ju';

/** Effect tiles and their targets (clear-effects rule 1). */
export const EFFECTS = {
  huo: { target: 'ying', name: '火烧连营' },
  ma: { target: 'gong', name: '铁骑冲阵' },
  shui: { target: 'cheng', name: '水淹七军' },
};

/** The four MVP generals (general-skills rule 1). */
export const GENERALS = [
  { id: 'guan_yu', name: '关羽', kind: 'dao', skill: '过关斩将', line: '过五关斩六将！' },
  { id: 'zhang_fei', name: '张飞', kind: 'gu', skill: '当阳一吼', line: '燕人张翼德在此！' },
  { id: 'zhao_yun', name: '赵云', kind: 'dun', skill: '七进七出', line: '常山赵子龙在此！' },
  { id: 'zhuge_liang', name: '诸葛亮', kind: 'shu', skill: '神机妙算', line: '亮已算定。' },
];

export const BOARD_COLS = 6;
/** Slice v6 (DESIGN-v6.md): the most tiles a cell can hold under its top tile. */
export const STACK_DEPTH = 1;
export const MAX_TURNS = 2;
export const RESHUFFLE_TRIES = 100;

export const COMBO_WINDOW_MS = 3000;
export const COMBO_THRESHOLD = 3;
export const BOSS_INTERRUPT = 25;
export const BOSS_INTERRUPT_CAP = 50;
export const EFFECT_HIGHLIGHT_MS = 380;

export const MISS_CHARGE = 15;
export const HOST_ATTACK_MS = 600;
// Slice v5 (DESIGN-v5.md): the enemy charges by moves, not by time.
/** Steps a matched pair adds to the enemy's bar. */
export const STEP_MATCH = 1;
/** Steps a miss adds. */
export const STEP_MISS = 2;
/** Steps a 3+ combo pushes the enemy back, and the most per attack cycle. */
export const COMBO_PUSHBACK = 1;
export const COMBO_PUSHBACK_CAP = 2;
/** Zhang Fei: steps pushed back, and steps the bar stays still afterwards. */
export const ZHANG_PUSHBACK = 3;
export const ZHANG_STUN = 3;
/** 虎啸: steps a general stays sealed. 赤兔冲阵: barricades placed. */
export const ROAR_SEAL = 3;
export const CHARGE_BLOCKS = 2;
/** The forecast shows when the next attack is a special and this many steps or fewer remain. */
export const FORECAST_STEPS = 2;
/** Enemy specials in rotation (phase 2), with their names. */
export const SPECIALS = [
  { id: 'sweep', name: '画戟横扫' },
  { id: 'charge', name: '赤兔冲阵' },
  { id: 'roar', name: '虎啸' },
];
/** Slice experiment: length of the boss phase-change show. */
export const PHASE_SHOW_MS = 1400;
export const BOSS_WARN_1 = 70;
export const BOSS_WARN_2 = 90;

export const GENERAL_NEED = 2;
export const SKILL_SHOW_MS = 950;

export const MAX_STEP_MS = 250;
export const BG_GAP_MS = 1000;
export const TOKEN_MAX_MS = 5000;
export const RESHUFFLE_SHOW_MS = 400;
export const CARD_GUARD_MS = 500;
export const OPEN_FADE_MS = 150;
/** Slice experiment: the win ending now includes the shatter (GDD: about 1100). */
export const ENDING_WIN_MS = 2000;
export const ENDING_LOSE_MS = 300;

export const SHOUT_MS = 1200;
export const UNREADY_HINT_MS = 1500;
export const CARD_AFTER_BOARD_MS = 250;
export const SAME_CELL_GUARD_MS = 200;
export const TIER_MIN_DWELL_MS = 1000;

/** Star thresholds for boss mode: heartsLost ≤ T3 → 3 stars, ≤ T2 → 2 stars (progress-save rule 2). */
export const STAR_BOSS_T3 = 0;
export const STAR_BOSS_T2 = 1;

/** `slow=1` multipliers (chapter-design rule 14). */
export const SLOW_CHARGE_FACTOR = 1.5;
