// Every player-facing string the view writes (design/gdd/ui-interaction.md rule 3).
// One table so localisation swaps a single module. Chapter texts (titles, rule
// lines, fail hints, previews) come from chapter data, not from here.

/** Unit kind -> its one-character name (art bible §3; used when a kind has no tile art). */
export const KIND_NAMES = Object.freeze({
  huo: '火', ying: '营', ma: '马', gong: '弓', shui: '水', cheng: '城',
  dao: '刀', gu: '鼓', dun: '盾', shu: '书', qi: '旗', jiu: '酒', jm: '拒',
});

/** Effect target kind -> the effect's banner name (clear-effects rule 1). */
export const EFFECT_NAMES = Object.freeze({ ying: '火烧连营', gong: '铁骑冲阵', cheng: '水淹七军' });

/** Fixed UI strings. Placeholders in braces are filled by fill(). */
export const UI_TEXT = Object.freeze({
  gameTitle: '三国连连看',
  titleSub: '听评书 · 连三国',
  titleStart: '开始游戏',
  titleProgress: '已讲 {n} / {total} 回',
  stackBadge: '+{n}',
  error: '戏本出错，请稍后再来',
  catalog: '书目',
  pause: '暂停',
  soundOff: '关闭声音',
  soundOn: '打开声音',
  musicCredit: '音乐：Liyan（elerya）、Generic 2-Minute Asian Arrangement（spring-spring），来自 OpenGameArt，CC-BY 3.0',
  landscape: '请竖着拿手机',
  resumeLine: '刚才切出去了，局面原样未动。',
  pairsLeft: '剩 {n} 对',
  targetGone: '{kind}已经没了',
  reshuffle: '重新布阵',
  win: '胜',
  lose: '败',
  timeLine: '用时 {m} 分 {s} 秒 · 最高 {combo} 连斩',
  notSaved: '这一回没存上',
  buttons: Object.freeze({
    start: '开讲', resume: '接着讲', catalog: '回书目', retry: '再来一回', next: '下一回',
  }),
});

/** General id -> display name. */
export const GENERAL_NAMES = Object.freeze({
  guan_yu: '关羽', zhang_fei: '张飞', zhao_yun: '赵云', zhuge_liang: '诸葛亮', liu_bei: '刘备', huang_zhong: '黄忠',
});

/** Pressure HUD lines (battle-pressure rule 26), one set per mode. */
export const HUD_TEXT = Object.freeze({
  press: '{s} 秒后压下一排 · {wave}/{waves}',
  pressFall: '{s} 秒后落下一排 · {wave}/{waves}',
  pressLast: '敌军压尽，清完就赢',
  cardReady: '点我出招',
  pressDanger: '底排有兵，再压就破城',
  pressDangerTop: '顶排有兵，再落就破城',
  pressScared: '已吓住下一排',
  bossSteps: '还有 {n} 步出手',
  bossStun: '震慑中 · {n} 步不涨',
  forecast: '下招：{name}',
  forecastBroken: '下招：{name}（已识破）',
  shield: '有盾',
  phase2: '二阵',
  hp: '血 {hp}/{max}',
  food: '粮草 {n}/{max}',
  foodLow: '粮草 {n}/{max} · 快断粮了',
});

/**
 * general-skills hint codes -> card text (general-skills rule 7). `uncharged`
 * fills {short} and {kind}; `sealed` fills {left}; noEffect is keyed by `why`.
 */
export const HINT_TEXT = Object.freeze({
  sealed: '被镇住 {left} 步',
  standby: '已布阵，等下一对',
  uncharged: '再连 {short} 对{kind}',
  noEffect: Object.freeze({
    roarUseless: '底排无兵，吼了无用',
    hasShield: '盾已举起',
    boardEmpty: '场上无兵',
    heartsFullGeneralsFull: '心满将满',
    foodFullGeneralsFull: '粮满将满',
    noGenerals: '无将可助',
    generalsFull: '众将已蓄满',
  }),
  select: Object.freeze({ row: '点一排斩掉', col: '点一列射穿' }),
});

/** Event feedback lines (battle-pressure / general-skills events). */
export const EVENT_TEXT = Object.freeze({
  attack: '敌将出手',
  blocked: '赵云举盾，挡下一招',
  broken: '{name}已被识破',
  phase2: '{name}再战',
  heal: '补回一颗心',
  foodRefill: '补粮 {n} 份',
  comboPushback: '连斩逼退 {n} 步',
  scared: '敌军被吓退一排',
  lastWave: '最后一排敌军',
  seal: '{general}被镇住 {left} 步',
  unseal: '{general}脱身',
  skillReady: '{general}可出手',
  gift: '众将各蓄一格',
  armed: '下一对同种兵必消',
});

/** skillResult banner lines (general-skills rules 14, 14a). */
export const RESULT_TEXT = Object.freeze({
  zhuge: '清掉 {pairs} 对{kind}',
  zhugeBreak: '清掉 {pairs} 对{kind}，识破{special}',
  liuHeal: '补心 {n}',
  liuFood: '补粮 {n}',
  liuGift: '{n} 将各蓄一格',
  liuNone: '刘备出手',
  join: '，',
});

/** Slot picker on the open card (general-loadout rules 10-12). */
export const PICKER_TEXT = Object.freeze({
  lead: '主将',
  empty: '空位',
  emptyLine: '可选一位将领上阵',
  change: '换将',
  pick: '选将',
  fold: '收起',
  clear: '撤下',
  locked: '未解锁',
});

/**
 * Fills named placeholders written as a name in braces.
 * @param {string} text template
 * @param {Object<string, *>} values
 * @returns {string}
 * @example fill('剩 {n} 对', { n: 3 }) // '剩 3 对'
 */
export function fill(text, values) {
  return String(text).replace(/\{(\w+)\}/g, function (m, key) {
    return Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : m;
  });
}
