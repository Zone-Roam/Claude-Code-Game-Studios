# ADR-0002: 主循环、对局时钟与确定性

## Status

Accepted（用户 2026-10-27 接受）

> **Who may move this to `Accepted`: the user, or `technical-director` on the
> user's explicit confirmation. No other agent, and no skill on its own.**

## Date

2026-10-27（2026-10-30 修订，见文末修订记录）

## Last Verified

2026-10-27

## Decision Makers

主会话起草；规则来自用户批准的 round-flow.md、board-link.md（Approved 2026-10-27）。

## Summary

对局流程规定了唯一的游戏时钟、令牌、每帧五步顺序和结算点，但没定由什么驱动、画面怎么切换、随机数用什么算法。决定：全页面只有一个 `requestAnimationFrame` 循环，每帧把真实间隔 `dtReal` 和输入队列交给 `round-flow` 的 `frame()`；画面切换是一个三态的顶层状态机（书目 / 对局 / 出错页），一回之内的状态归 `round-flow`；随机数用 FNV-1a + fmix32 的 `hash32` 派生种子、用 mulberry32 生成四条独立的随机流。

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | 无引擎 — 原生 H5（ES2017），小红书“小工具”WebView（版本未知） |
| **Domain** | Core |
| **Layer** | Foundation |
| **Knowledge Risk** | HIGH（rAF、`Math.imul` 是通用标准，LOW；但后台时 rAF 是否暂停、可见性事件是否到达未核实，HIGH，按高的记） |
| **References Consulted** | `docs/engine-reference/web-h5/VERSION.md`；`design/gdd/round-flow.md` 规则 3–12；`design/gdd/board-link.md` 规则 3、9、10 |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | 真机上切后台再回来：rAF 是否暂停、回来第一帧的 `dtReal` 多大、`visibilitychange` 是否到达（探测键 `eventsThisVisit`）；隐式后台兜底能否在事件不来时生效 |

> **为什么是 Foundation**：本条定的是主循环和画面状态机，即 `src/app/`，属于基础层的“画面切换”；它约束的对局流程本身在 Core 层，但要先有这条才能写。

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001（目录、规则层不读时间和随机的规定） |
| **Enables** | ADR-0003（事件出口和输入队列挂在本条定义的帧上） |
| **Blocks** | 对局流程、清除效果、战场压力、武将技能的实现故事 |
| **Ordering Note** | `rng.mjs` 的黄金值测试必须先于任何发牌、波次的测试写好（算法一变，所有固定种子的测试和问题复现都会失效）。本条调用的 `progress.settle()` 签名来自 progress-save.md 规则 5，不依赖 ADR-0004 的存储选择，所以不把 ADR-0004 列为依赖。但本条**依赖** `settle()` 同步返回、且从不抛异常（progress-save 规则 5、17；ADR-0004 规定所有存储异常在 `progress` 里接住）：如果有异常漏出来，第 1 节的 `try/catch` 会把玩家送到出错页，而不是降级为“仅内存” |

## Context

### Problem Statement

所有带时间的规则（压境间隔）都读同一只游戏时钟（2026-10-30 起，敌将改为按步数出手、连斩改为不看时间，都不再读时钟，但出手和换阶段仍在 `tick` 里结算），演出时间不能算进玩家的压力；切后台、暂停时局面要原封不动；同一种子要发出同一张盘。round-flow.md 已经把规则写死，缺的是实现层面的三个决定：用什么驱动帧、画面怎么切换、随机数怎么生成。

### Current State

原型用多个 `setTimeout`/`setInterval` 分别驱动压境和蓄力，演出期间不停表，切后台回来会一下子结算掉好几秒。这正是 round-flow.md 要避免的。

### Constraints

- 规则层不读时间、不取随机（ADR-0001）。
- 页面进后台时 rAF 会停或变慢，可见性事件可能不来（平台未核实）。
- 千元安卓机：每帧规则计算 ≤ 2 ms（`architecture.md` 性能预算）。

### Requirements

- round-flow 规则 3（时钟）、4（令牌）、5（盘锁）、6（结算顺序和每帧五步）、7（胜负检查）、10（后台）、11（暂停）、12（种子）。
- board-link 规则 3（四条独立随机流）、10（洗牌只用 `shuffle` 流）。
- 测试能用假的 `dtReal` 逐帧驱动，结果完全可复现。

## Decision

### 1. 唯一的帧循环

`src/app/main-loop.mjs` 是全页面**唯一**调用 `requestAnimationFrame` 的地方。每帧：

```
onFrame(now):
  requestAnimationFrame(onFrame)            // 先排下一帧：本帧出错也不会让页面停住
  dtReal = (last === null) ? 0 : now − last;  last = now
  try {
    if (screen === 'round') round.frame(dtReal, inputQueue.takeAll())
    view.render(dtReal, round ? round.drainEvents() : [])     // ADR-0003
  } catch (err) {
    screens.fail(err)   // 丢弃当前 round，切到出错页；开发版同时 console.error
                        // ui-interaction 规则 1 只写了“回目全部加载失败”时进出错页，这里把运行时异常也送去，
                        // 文案沿用“戏本出错，请稍后再来”；下次修订 ui-interaction.md 时补上这一条
  }
```

- 游戏逻辑一律不用 `setTimeout`、`setInterval`。演出计时也走帧：令牌用 round-flow 的前台计时，纯装饰的动画用 CSS（ADR-0003）。
- `dtReal` 原样交给 `round-flow`，夹取（负数按 0、单帧上限 `MAX_STEP_MS`、超过 `BG_GAP_MS` 视为隐式后台）只在 `round-flow` 里做一次，按 round-flow 公式 dt_game。

### 2. 画面状态机（scene management）

两级状态，各归各的：

| 级别 | 状态 | 归谁 | 文件 |
|---|---|---|---|
| 顶层画面 | `catalog`（书目）/ `round`（对局）/ `error`（出错页） | 应用 | `src/app/screens.mjs` |
| 一回之内 | `open`（开讲）/ `play`（对局）/ `end`（结束）/ `settle`（结算） | 对局流程 | `src/rules/round-flow.mjs` |

- 点签进入 `round` 时，`screens.mjs` 新建一个 round 对象（每次开局都是新对象，“再来一回”“下一回”也是）；离开 `round` 时丢弃它。一回的状态不跨对象残留，测试里每个对象都是干净的。
- `attempt` 计数（round-flow 规则 12）存在 `screens.mjs` 的会话内存里，按回目 id 分开，每次新建 round 前加 1，不存档。
- 启动时回目加载器给出“能加载的回目”清单（chapter-design 规则 9）；清单为空时 `screens.mjs` 直接进 `error`，不进书目。“下一回”取这份清单里的下一个。
- 覆盖卡由 round-flow 的状态和令牌推出来，界面只照着显示（round-flow 规则 9 的公式例子）：

  | 情况 | `overlay()` | 按钮 |
  |---|---|---|
  | `open`（等玩家点“开讲”） | `'open'`（开讲水牌，含点将区：槽、可选武将牌、“×”，按 general-loadout 规则 9–14） | 有（槽和可选武将牌也算水牌上的按钮，按 round-flow 规则 2、9） |
  | `open` 的子状态 `starting`（点了“开讲”，150 ms 渐隐中） | `null`：界面看到它变成 `null` 就开始渐隐遮罩；这期间盘仍锁着（状态不是 `play`），符合 R1 | — |
  | `end`，赢 | `'win'`（胜利卡，盖章中） | 没有 |
  | `end`，输 | `null`（只有遮罩渐入，界面播） | — |
  | `settle`，赢 | `'win'`（同一张卡） | 盖章落定后出现 |
  | `settle`，输 | `'lose'`（失败卡，和按钮同时出现） | 有 |
  | 持有 `background` 令牌 | `'resume'`（接着讲卡） | 有 |
  | 持有 `pause` 令牌，竖屏 / 横屏 | `'pause'` / `'landscape'` | 有 / 没有 |

  对局外（`catalog`）转成横屏只显示横屏卡、不申请令牌（ui-interaction 规则 25）。

**三个和覆盖卡有关的计时，归属如下**（都按前台真实时间累计：`dtReal` 为负按 0，超过 `BG_GAP_MS` 的那一帧按 0。**与令牌计时不同，持有 `background`、`pause` 令牌时照样累计**，否则暂停卡和接着讲卡的按钮永远点不动）：

- **覆盖卡按钮防连点**（round-flow 规则 9）：round 记 `overlayAgeMs`，在 `overlay()` 的值改变时、以及进入 `settle` 时清零，之后每帧累加。按钮意图在 `overlayAgeMs < CARD_GUARD_MS` 时丢弃。意图本身不带时间。胜利卡在 `settle` 才出按钮，所以从按钮出现时算起；失败卡在 `settle` 才出现，卡和按钮同时算起。**暂停印不受这个计时约束**（它不在覆盖卡上）。
- **开讲撤遮罩**（round-flow 规则 2）：点将区的按钮（换将、清空槽）走输入队列，由 round 交给选将系统改槽位，不改变状态。点“开讲”的那一刻，槽里的武将按槽位顺序定为本回的 `loadout`，交给 `createSkills` 建武将牌（最多 3 张），并写进结果对象。之后 round 进入 `open` 的子状态 `starting`，同时发 `state {from: 'open', to: 'starting'}`、`overlay()` 变为 `null`；计满 `OPEN_FADE_MS`（150 ms）才进入 `play`、时钟开始走；这期间盘上的点击按“状态不是 `play`”丢弃。界面的渐隐从看到 `starting` 时开始，只是跟着播。
- **收尾演出**（round-flow 规则 8）：`end` → `settle` 由界面调用 `round.endingDone()` 触发，接口名沿用设计文档。这是全项目**唯一**由界面计时推进的规则状态。允许它的理由：进入 `end` 时胜负、星级、存档都已定，时钟已停，`settle` 只决定结算卡的按钮何时出现，不影响任何规则结果。界面用每帧的 `dtReal` 累计前台时间来计（不用 `transitionend`，也不用 `setTimeout`），满 `ENDING_WIN_MS`（2000，击碎结局）或 `ENDING_LOSE_MS`（300）就调用。

`OPEN_FADE_MS`（150）、`ENDING_WIN_MS`（2000）、`ENDING_LOSE_MS`（300）的数值来自 round-flow 规则 2、8 的正文，登记在 `design/registry/entities.yaml`，放在 `src/core/constants.mjs`。

### 3. 每帧五步的实现

`round.frame(dtReal, intents)` 严格按 round-flow 规则 6.7 执行：

1. **隐式后台**：状态为 `play` 且 `dtReal > BG_GAP_MS` → 申请 `background` 令牌，本帧到此为止。
2. **处理意图**：按到达顺序逐个处理（意图的种类见 ADR-0003）。盘上和武将牌上的点击，在“状态不是 `play`，或**本帧开始时**的令牌集合不为空，或**此刻**的令牌集合不为空”时丢弃；暂停印既不受盘锁也不受防连点影响；覆盖卡按钮不受盘锁影响，只受 `CARD_GUARD_MS`（`overlayAgeMs`）。每处理完一次点击、令牌集合仍为空 → 就地做一次结算点。**关羽选排**（round-flow 规则 5a）：选排是 round 里的一个输入模式，不是令牌，不停钟、不锁盘。选排期间，盘上的点击按行交给武将技能（选中可选的行才放技能、申请 `skill` 令牌；不可选的行不响应），不交给 `board.tap`；点武将牌或盘外 = 取消，这一下不做别的事；暂停印照常。敌将的步数在 `onMatch`/`onMiss` 里累加（连上 1 步、连错 2 步），这里只累加，不出手。
3. **令牌计时**：计时增量 `dtTok = (dtReal < 0 || dtReal > BG_GAP_MS) ? 0 : dtReal`；有 `background` 或 `pause` 令牌时为 0。本帧第 2 步新申请的令牌不计（从下一帧开始）。到点的令牌按申请顺序通知持有者 `onEnd(token)`，持有者完成效果、`dispatch(result)`、`release(token)`。超过 `TOKEN_MAX_MS` 仍未归还 → 强制移出；没通知过就补发一次，通知过的不再重发；开发版警告。
4. **时钟和 tick**：令牌集合为空且状态为 `play` 时，`dtGame = min(max(dtReal, 0), MAX_STEP_MS)`，`gameTime += dtGame`；`dtGame > 0` 时调用 `pressure.tick(dtGame)`。压境用 `dtGame` 计时；敌将不看 `dtGame` 的大小，只在 `tick` 里检查“该不该换阶段、步数走满该不该出手”，当场改盘面后申请 `hostAttack` 或 `phase` 令牌（battle-pressure 规则 2、23、24）。所以第 ② 步走满的出手在同一帧这里结算；第 ② 步申请过令牌的（例如这一对触发了效果），出手延后到令牌归还后的第一次 `tick`。
5. **结算点**：令牌集合为空、且自上一个结算点以来有过点击结果、令牌到点、保底清除，或**本帧调用过 `tick`**（round-flow 规则 6.6：tick 之后没有令牌就是结算点，压境到点破城在这里判）时：先 `pressure.outcome()`（先胜后负；敌将一阶段打空、还没换阶段时返回 `null`），分出胜负就进入 `end`；否则 `board.ensurePlayable()`，洗了牌就申请 `reshuffle` 令牌。tick 里没有下压、出手和换阶段时只判胜负、不调用 `ensurePlayable()`。

**令牌的数据结构**：按申请顺序排列的数组，每项 `{ id, reason, durationMs, elapsedMs, bornFrame, notified, onEnd }`。`background`、`pause` 各最多一个（重复申请返回同一个）。`release` 重复调用无副作用。

**进入 `end`**：停钟、锁盘，立即调用 `progress.settle(roundResult)`，把 `SettleOutcome` 存在 round 对象上供界面读；开发版断言此时令牌集合为空。一回只进入一次 `end`，所以 round 只调用一次 `settle()`（progress-save 那边另有“第二次调用开发版报错、正式版忽略”的保护，见 ADR-0004）。界面播完收尾演出后调用 `round.endingDone()` → `settle`。

**装配顺序**：round 自己建出一回需要的全部规则对象，不从外面接收建好的对象（各系统要用 round 的 `emit`、`acquire`，先建好再传入会成环）：

1. `board = systems.createBoard(chapter, { seed, streams })`：盘面按 board-link 规则 3 从 `seed` 自己派生四条流；`streams` 只给测试用，传了就用传入的流代替（例如 board-link 验收标准里“注入一个永远给出同一排列的 `shuffle` 流”）；
2. 建上下文 `ctx = { chapter, constants, board, emit, acquire, release, dispatch, gameTime }`，其中的函数都是 round 自己的，`gameTime` 是函数 `() => ms`（传值会在装配时冻住）；
3. `pressure = systems.createPressure(ctx)`；
4. `effects = systems.createEffects(Object.assign({}, ctx, { pressure }))`（连斩奖励要调用 `pressure.comboReward()`；对象展开 `{...ctx}` 是 ES2018，不用）；
5. `skills = systems.createSkills(Object.assign({}, ctx, { pressure }))`（张飞要调用 `scareNextPush`、`addFood`、`roarBack`，赵云 `raiseShield`，诸葛亮 `breakSpecial`，虎啸读 `sealed`；见 battle-pressure 规则 3）。建武将牌用开讲时定下的 `loadout`。

`systems` 是工厂函数表，**必须由装配根传入**（`src/app/screens.mjs` 引入四个规则模块后组成），`round-flow.mjs` 里不写缺省值：Core 层的 `round-flow` 不能引用 Feature 层的模块（`architecture.md` 分层规则）。测试传假的工厂即可。`progress` 也从外面传入（它跨回存在，见 ADR-0004）。

建好的对象经 `round.systems()` 只读地交给界面（ADR-0003）：返回 `{ board, effects, pressure, skills }`，界面只能调用其中的查询函数。

### 4. 后台、暂停、横屏和返回键

这些不排队，由 `src/platform/lifecycle.mjs` 收到事件后**直接**调用 round 的入口（页面进后台后 rAF 会停，不能等下一帧）：

| 平台事件 | 调用 |
|---|---|
| `visibilitychange` → hidden，或 `pagehide` | `round.onHidden()`：只在 `play` 时申请 `background` |
| `visibilitychange` → visible，或 `pageshow` | `round.onVisible()`：只记下“可见了”，接着讲卡由状态推出 |
| 横竖屏变化（`resize`/`orientationchange`，只对 `pointer: coarse` 判断） | `round.setLandscape(on)`：`play` 时转横屏申请 `pause` |
| `popstate`（安卓返回键，宿主转来时） | `round.onBack()`：`play` 时等同点暂停印；其他画面由 `screens.mjs` 回书目 |

“接着讲”“回书目”“开讲”等按钮走输入队列（ADR-0003），由 round-flow 在第 2 步处理，保证与点击按到达顺序结算。“回书目”清空全部令牌、不通知持有者、不交结果对象（round-flow 规则 11）。

### 5. 确定性：种子和随机流

`src/core/rng.mjs`，纯函数：

```
hash32(...parts) → uint32
  s = parts.map(String).join('\u001f')
  h = 0x811c9dc5
  for each UTF-16 code unit c of s: h = Math.imul(h ^ c, 0x01000193) >>> 0      // FNV-1a
  h ^= h >>> 16; h = Math.imul(h, 0x85ebca6b) >>> 0                              // fmix32
  h ^= h >>> 13; h = Math.imul(h, 0xc2b2ae35) >>> 0
  h ^= h >>> 16
  return h >>> 0

createStream(seed, name) → { next(), int(n), shuffle(array), pickWeighted(entries) }
  state = hash32(seed, name)
  next():  state = (state + 0x6D2B79F5) >>> 0                                    // mulberry32
           t = Math.imul(state ^ (state >>> 15), state | 1)
           t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
           return (t ^ (t >>> 14)) >>> 0
  int(n):  Math.floor(next() * n / 4294967296)          // 0 ≤ 结果 < n，n ≤ 2^20
  shuffle: Fisher–Yates，从最后一个下标往前，j = int(i + 1)，原地打乱
  pickWeighted(entries): entries 是 [kind, weight] 数组，按兵种表的固定顺序排好（不用对象的键序）
```

- 一回的种子：`seed = hash32(chapterId, attempt, salt)`（round-flow 规则 12）。
- `salt`：页面加载时由 `main.mjs` 生成一次（`crypto.getRandomValues` 可用就用，否则 `Math.random`；这是全项目唯一取随机的地方，在规则层之外）；开发版和测试包读到 `seed=N` 时 `salt = N`。
- 盘面在开局时用 `createStream(seed, 'deal'|'shuffle'|'wave'|'add')` 建四条流，`rng(name)` 返回对应的流（board-link 规则 3）。

### Architecture Diagram

```
main.mjs ──► screens.mjs ──(开局)──► createRound({ chapter, seed, constants, progress, systems })
   │                                    │  持有：state、gameTime、tokens、outbox；自己按装配顺序建下面这些
   ▼                                    ├─► board-link    (createBoard(chapter, { seed }))
main-loop.mjs ──rAF──► round.frame(dtReal, intents)        ├─► clear-effects
   ▲                                    ├─► general-skills
platform/lifecycle.mjs ──直接调用──► round.onHidden / onVisible / setLandscape / onBack
                                        ├─► battle-pressure  (tick / outcome)
                                        └─► progress-save    (settle，进入 end 时)
```

### Key Interfaces

```
// src/rules/round-flow.mjs
export function createRound({ chapter, seed, constants, progress, systems })   // systems 必填，由装配根传入
// systems: { createBoard(chapter, { seed, streams? }), createPressure(ctx), createEffects(ctx), createSkills(ctx) }
// ctx:     { chapter, constants, board, emit, acquire, release, dispatch, gameTime: () => ms }（effects、skills 另加 pressure）
round.frame(dtReal, intents)                  // 每帧一次，五步
round.acquire(reason, durationMs?, onEnd?, detail?)   // → token；detail 随 tokenStart 事件发给界面（ADR-0003）
round.release(token)                          // 重复归还无副作用
round.dispatch(result)                        // 持有者把改盘面得到的结果交回
round.onHidden(); round.onVisible(); round.setLandscape(on); round.onBack()
round.endingDone()
// 查询
round.state()        // 'open' | 'play' | 'end' | 'settle'
round.gameTime()     // ms
round.tokens()       // 只读快照：[{ reason, remainingMs }]
round.boardLocked()  // boolean
round.overlay()      // null | 'open' | 'resume' | 'pause' | 'landscape' | 'win' | 'lose'
round.result()       // RoundResult | null（进入 end 后）
round.settleOutcome()// SettleOutcome | null（进入 end 后）
round.systems()      // { board, effects, pressure, skills }，给界面读查询用（ADR-0003）
round.drainEvents()  // ADR-0003

// src/core/rng.mjs
export function hash32(...parts)        // → uint32
export function createStream(seed, name)
```

各规则模块的回调（`effects.onMatch`、`skills.onMatch`、`pressure.onMatch/onMiss/onClear/tick/outcome/metrics`、`board.ensurePlayable`、`progress.settle`）沿用 round-flow.md 的名字，不改名。

### Implementation Guidelines

- 必须：只有 `main-loop.mjs` 调用 `requestAnimationFrame`；游戏逻辑绝不用 `setTimeout`、`setInterval`、`Date.now()`、`performance.now()`。
- 必须：带时间的规则只读 `round.gameTime()` 或 `tick(dtGame)` 的参数；演出时长只放在令牌上。
- 必须：所有随机都从 `board.rng(name)` 取；规则层绝不调用 `Math.random()`。
- 必须：`tests/unit/core/rng.test.mjs` 钉死 `hash32` 和每条流前几个输出的黄金值；改算法就是改所有存过的种子，必须新写决策记录。
- 必须：每帧五步的顺序和“本帧开始时或此刻”的丢弃规则各有一条集成测试（`tests/integration/round-flow/`），用假的 `dtReal` 逐帧驱动。
- 必须：覆盖卡计时各有测试，包括：暂停卡和接着讲卡出现 500 ms 后点“接着讲”有效（持有 `pause`/`background` 令牌时 `overlayAgeMs` 照样累计）；失败卡出现后 300 ms 点击无效、600 ms 有效；胜利卡按钮出现后 300 ms 无效、600 ms 有效；对局刚开始就点暂停印立即有效（round-flow 的验收标准）。
- 绝不：让规则模块订阅彼此的事件；结算顺序只在 `round-flow` 里写一次。
- 绝不：在 `play` 以外的状态推进 `gameTime`。

## Alternatives Considered

### Alternative 1: 每个系统各自用 `setTimeout`/`setInterval`
- **Description**: 原型的做法，压境、蓄力、演出各有各的计时器。
- **Pros**: 写起来快。
- **Cons**: 演出期间不停表；后台回来计时器一起补触发；顺序取决于计时器排队，“最后一刀”和“粮尽”会竞态；没法用假时间测试。
- **Rejection Reason**: 违反 round-flow 规则 3、6，不可测试。

### Alternative 2: 固定步长逻辑循环（比如每 1/60 秒一步，累积器补步）
- **Description**: 逻辑按固定 16.67 ms 一步推进，渲染和逻辑分开。
- **Pros**: 物理模拟常用，跨帧率结果一致。
- **Cons**: 本游戏没有物理，规则对 `dt` 是线性的（倒计时、蓄力），固定步长不带来好处；低帧率时一帧要补好几步，反而容易超出 2 ms 的预算；round-flow 的公式已经按可变 `dtGame` 写好。
- **Rejection Reason**: 复杂度高于收益，与已批准的公式不一致。

### Alternative 3: 长寿命的 round 对象，每回 `reset()`
- **Description**: 整个页面只有一个 round，开局时重置。
- **Pros**: 少分配几个对象。
- **Cons**: 重置漏掉一个字段就会把上一回的状态带进下一回（例如赵云待命、打断额度），这类问题很难测出来。
- **Rejection Reason**: 每回新建对象更安全，代价可以忽略。

### Alternative 4: 用 `Math.random()` 加可选的固定种子库
- **Description**: 平时用 `Math.random()`，测试时替换。
- **Pros**: 简单。
- **Cons**: 做不到四条独立的流，洗牌次数会改变后面的波次（违反 board-link 规则 3）；发布包里出现问题无法用种子复现。
- **Rejection Reason**: 违反 board-link 规则 3。

## Consequences

### Positive
- 所有时间相关的规则都能用假的 `dtReal` 在 Node 里逐帧测试。
- 同一种子、同一串操作必然得到同一局，试玩中的问题可以用 `seed=N` 复现。
- 后台、暂停、演出期间压力一秒不走，符合“该我的时间一秒不少”。

### Negative
- `round-flow.mjs` 是一个比较大的模块（状态、时钟、令牌、分发、结算点都在里面），要靠测试守住。
- 页面隐藏时没有帧，`TOKEN_MAX_MS` 之类的保护也停着；这是有意的（前台计时）。

### Neutral
- 动画的流畅度取决于浏览器的 rAF 节奏；规则不受帧率影响（只受 `MAX_STEP_MS` 夹取）。

## Risks

- **可见性事件不来**：隐式后台（`dtReal > BG_GAP_MS`）兜底；如果宿主在后台仍以低频跑 rAF（每帧 `dtReal` 都小于 1000 ms），压力会在后台慢慢走。缓解：探测结果确认；必要时加 `blur`/`focus` 作为第二信号（开放问题 OQ-1）。
- **round-flow 实现与 GDD 的五步顺序出现偏差**：五步各有集成测试；第 2 步“本帧开始时或此刻”专门测“演出最后一帧到达的点击被丢弃”。
- **黄金值测试被随手改掉**：在测试文件头注明“改这里等于改所有种子”，代码审查时检查。

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| round-flow.md | 规则 3：游戏时钟只在“对局”且无令牌时推进，单帧夹取，隐式后台 | 唯一 rAF 循环 + 第 1、4 步（TR-round-flow-001） |
| round-flow.md | 规则 4：八种令牌（2026-10-30 新增 `phase`：敌将换二阶段演出 `PHASE_SHOW_MS` 1400 ms，停钟锁盘），前台真实时间计时，`TOKEN_MAX_MS` 强制归还且效果只完成一次；关羽选排不是令牌 | 令牌数据结构 + 第 3 步，`phase` 与其他计时令牌同样处理（TR-round-flow-002） |
| round-flow.md | 规则 5a：关羽选排时的输入路由（不占令牌、不停钟） | 第 3 节第 ② 步的选排路由 |
| round-flow.md | 规则 2：开讲水牌上的点将，开讲时定下 `loadout`（general-loadout 规则 9–14） | 第 2 节 `overlay()` 表与“开讲撤遮罩” |
| round-flow.md | 规则 5：盘锁时点击丢弃不缓存 | 第 2 步的丢弃条件（TR-round-flow-003） |
| round-flow.md | 规则 6.5–6.7：每帧五步与就地结算点 | 第 3 节逐步实现（TR-round-flow-004） |
| round-flow.md | 规则 7、8：只在结算点查 `outcome()`，进入结束立即 `settle()`；胜利收尾 `ENDING_WIN_MS` 2000 ms | 第 5 步与“进入 end”；第 2 节收尾演出（TR-round-flow-006） |
| round-flow.md | 规则 10、11：后台、暂停、横屏、回书目 | 第 4 节平台事件直接调用（TR-round-flow-007） |
| round-flow.md | 规则 2：遮罩 150 ms 撤完才进入“对局”；规则 9：覆盖卡按钮防连点（失败卡和按钮同时出现、胜利卡按钮在盖章后出现，例子见公式） | 第 2 节 `starting` 子状态、`overlay()` 表与 `overlayAgeMs`（持有后台、暂停令牌时照样累计）（TR-round-flow-010、-009） |
| chapter-design.md | 规则 9：按“能加载的回目”清单算下一回；全部回目被拒绝时出错页 | 第 2 节：清单为空直接进 `error`（TR-chapter-design-004） |
| progress-save.md | 同一回只结算一次 | 一回只进入一次 `end`，只调用一次 `settle()`（TR-progress-save-006，另见 ADR-0004） |
| round-flow.md | 规则 12：`seed = hash32(chapterId, attempt, salt)` | 第 5 节算法与 `attempt`/`salt` 的归属（TR-round-flow-008） |
| board-link.md | 规则 3：四条互相独立的随机流，派生算法见技术决策记录 | `createStream(seed, name)`（TR-board-link-002） |
| board-link.md | 规则 9、10：I2 在结算点检查，洗牌只用 `shuffle` 流 | 第 5 步调用 `ensurePlayable()`（TR-board-link-006） |
| clear-effects.md | 连斩是不连错的连续消除，不看时间（规则 6）；`effect` 令牌到点后清除 | 连斩在第 ② 步的通知顺序里计数，不读时钟；令牌 `onEnd`（TR-clear-effects-001 于 2026-10-30 作废：连斩改为不连错的连续消；TR-clear-effects-002 不变） |
| battle-pressure.md | 压境只由 `tick(dtGame)` 推进；敌将步数在 `onMatch`/`onMiss` 里累加，出手和换阶段在 `tick` 里当场结算（规则 2、22–24）；只回答 `outcome()`；波次表用 `wave` 流预先生成 | 第 2、4、5 步 + `rng('wave')`（TR-battle-pressure-001、-004） |
| general-skills.md | 放技能申请 `skill` 令牌 950 ms，到点后生效 | 令牌 `onEnd`（TR-general-skills-001） |

## Performance Implications
- **CPU**: 每帧一次 `frame()`；没有点击和到点时只有夹取、计时和 `tick`，远低于 2 ms。连通判定在点击时才做（board-link 公式），不在每帧做。
  - **例外：死局洗牌**。最坏情况是 `RESHUFFLE_TRIES`（缺省 100）次排列都没有可连对：每次排列后扫一遍同种的对（48 块时最多约 150 对），每对做一次 ≤ 2 拐判定（约百次运算），合计一两百万次运算，低端机上可能 5–15 ms，超过 2 ms 的每帧预算。死局只在结算点发生、而且很少见，这一帧允许超。
  - `tests/integration/board-link/` 加一条性能测试，在 Node 里测“100 次都失败再走保底”的耗时：超过 16 ms 就把 `RESHUFFLE_TRIES` 调低（安全范围 20–200），不改算法。
- **Memory**: 每回新建 round 对象，旧对象随画面切换释放；令牌最多同时几个。
- **Load Time**: 无影响。
- **Network**: 无。

## Migration Plan

没有现成代码。原型里的多计时器写法不迁移。

## Validation Criteria

- `rng` 黄金值测试通过，且在 Node 和浏览器里输出一致。
- 集成测试：同一种子、同一串点击，两次运行的结果对象完全相同。
- 集成测试：技能亮相 950 ms 期间 `gameTime` 不变，压境倒计时不动；亮相最后一帧到达的点击被丢弃。
- 真机：切后台 10 秒再回来，压境倒计时与切出前相同，显示接着讲卡。

## Related

- ADR-0001（规则层不读时间、不取随机）
- ADR-0003（意图的种类、事件出口、界面如何显示覆盖卡）
- ADR-0004（`settle()` 里的写档）
- `design/gdd/round-flow.md`、`design/gdd/board-link.md`

## Revision History

- 2026-10-30：并入切片第四至六版和选将（见 `docs/architecture/change-impact-2026-10-30-slice-merge.md`），决策不变。
