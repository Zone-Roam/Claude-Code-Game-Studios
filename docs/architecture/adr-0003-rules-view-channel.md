# ADR-0003: 规则层与界面层的通道，DOM + SVG 渲染

## Status

Accepted（用户 2026-10-27 接受）

> **Who may move this to `Accepted`: the user, or `technical-director` on the
> user's explicit confirmation. No other agent, and no skill on its own.**

## Date

2026-10-27（2026-10-30 修订，见文末修订记录）

## Last Verified

2026-10-27

## Decision Makers

主会话起草；交互规则来自用户批准的 ui-interaction.md、round-flow.md（Approved 2026-10-27）。

## Summary

界面不持有规则状态，但要播出每一次消除、晃动、下压和亮相，还要把点击按到达顺序交回规则层。决定：规则层每帧往一个**事件出口**里追加普通对象（带 `type`），界面每帧取走一次并只读查询接口更新 HUD；界面把指针事件换算成**意图**放进输入队列，由对局流程在每帧第 ② 步处理；画面用普通 DOM 元素加一个 SVG 连线层渲染，动画只用 CSS 的 transform 和 opacity。

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | 无引擎 — 原生 H5（ES2017），小红书“小工具”WebView（版本未知） |
| **Domain** | UI |
| **Layer** | Foundation |
| **Knowledge Risk** | MEDIUM（DOM、SVG `<use>`、Pointer Events、CSS transition 是通用标准，LOW；低端安卓 WebView 的合成性能和 `touch-action` 支持未核实，MEDIUM） |
| **References Consulted** | `docs/engine-reference/web-h5/VERSION.md`；`design/gdd/ui-interaction.md` 规则 1–34；`design/gdd/round-flow.md` 规则 6；`design/art/art-bible.md` 第 7、8 节 |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | 基准安卓机上：48 块的盘同时 24 个元素动画时帧率 ≥ 30；`touch-action: none` 能挡住双击缩放和下拉回弹；`pointerdown` 到画出选中框 ≤ 100 ms。平台探测：宿主是否放大字号（`font16pxComputed`）、是否强制深色（`darkScheme`、`bodyBgComputed`）、安全区和可用高度（`safeAreaTRBL`、`innerWxH`） |

> **为什么是 Foundation**：本条定的是事件通道，即模板所说的“事件架构”，所有规则系统和界面都要按它接线；界面本身在 Presentation 层。

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001（目录和规则层纯净规定）、ADR-0002（帧循环、意图在第 ② 步处理、覆盖卡由状态推出） |
| **Enables** | None |
| **Blocks** | 界面与交互的全部实现故事；各规则系统里“发什么事件”的部分 |
| **Ordering Note** | 事件类型清单（下文）先于界面实现定稿；新增事件类型时在本条追加，不改已有的名字 |

## Context

### Problem Statement

round-flow.md 规定了 `match`/`miss` 按固定顺序通知到界面、其他结果按分发表送达，battle-pressure.md 规定下压和敌将出手“直接发给界面”，ui-interaction.md 规定了每个事件在哪里怎么反馈、触控怎么判。缺的是：事件以什么形式从规则层到界面、点击以什么形式回到规则层、界面用什么技术画。

### Current State

原型直接在规则代码里改 DOM（`innerHTML` 整块重写），规则和页面无法分开测试，也超出了 DOM 节点预算。

### Constraints

- 规则层不碰页面（ADR-0001）；结算顺序只在对局流程里规定一次（ADR-0002）。
- 只对 transform 和 opacity 做动画；禁用滤镜和混合模式；对局中 DOM ≤ 500、每块 ≤ 3 个节点、连线只用一个 SVG（ui-interaction 规则 31–33）。
- 字要清楚：目标玩家里有中老年，必读字 18 px、对比 ≥ 7:1（ui-interaction 规则 26–27）。

### Requirements

- 瞬时的东西（连线的折线、晃动、喊字）必须送达界面，光靠读状态读不出来。
- 点击按到达顺序结算，盘锁时丢弃不缓存（round-flow 规则 5、6）。
- 界面可以在没有规则层的情况下单独测布局（fit_scale 是纯计算）。

## Decision

### 1. 规则 → 界面：事件出口 + 只读查询

- `round` 持有一个数组 `outbox`。各规则模块由 round 创建时从上下文 `ctx` 拿到同一个 `emit(event)`（只追加；装配顺序见 ADR-0002 第 3 节），**按发生顺序**写进去。对局流程按规则 6 分发的结果（`match`、`miss`、`clear`、`reshuffle`）在分发到第 ④ 步“界面”时 `emit`；战场压力的 `push`、`hostAttack` 等直接 `emit`（battle-pressure 规则：不经对局流程）。
- 界面每帧调用一次 `round.drainEvents()`，拿到本帧全部事件并清空出口，按顺序播放。
- 事件是普通对象，只含数据，不含函数和 DOM 引用。界面绝不修改事件对象，也绝不调用规则模块的修改接口。
- 持续状态（格子、选中、蓄力、粮数、倒计时、档位、覆盖卡）不靠事件，靠查询：`board.cells()`、`board.selection()`、`board.forceNext()`、`board.depthAt(r, c)`（层叠标记）、`board.buriedCount()`、`board.blocks()`（拒马）、`board.rowContents(r)`（选排高亮）、`effects.combo()`、`effects.previewTarget()`、`pressure.hud()`（敌将模式含步数、阶段、震慑、护盾、镇住、预告、“破”标记，battle-pressure 规则 26）、`pressure.sealed(general)`、`skills.cards()`（最多 3 张，顺序是选将给出的槽位顺序；含关羽的选排状态）、`round.state()`、`round.overlay()`、`round.tokens()`、`round.boardLocked()`、`progress` 的书目查询。HUD 每帧比较查询值与上次的缓存，变了才改对应的文字或 transform。

**事件类型清单（契约，名字不改，只追加）**：

| `type` | 产生于 | 主要字段 | 界面怎么用（ui-interaction 规则 20、21） |
|---|---|---|---|
| `match` | 盘面，经对局流程 | `kind, a, b, path, forced, broken, revealed`（后两项 2026-10-30 追加） | 画墨线（连斩 ≥ 2 变朱；`forced` 画朱虚线），抽走两块；`broken` 里的拒马碎掉淡出；`revealed` 里翻上来的牌原地弹出（board-link 规则 5、8、9） |
| `miss` | 盘面，经对局流程 | `kind, a, b` | 两块各晃一次；敌将模式比较前后 `hud().steps` 画多走的两步 |
| `clear` | 盘面（效果、技能、保底），经对局流程 | `source, kind?, cells, buried, blocks?, revealed, pairs`（`buried`、`blocks`、`revealed` 2026-10-30 追加，board-link 规则 13） | 抽走；技能的画朱勾残影；翻上来的牌原地弹出 |
| `reshuffle` | 盘面，经对局流程 | `fallback` | 整盘抽走再落下；喊字位“重新布阵” |
| `tokenStart` / `tokenEnd` | 对局流程 | `reason, durationMs, detail` | 效果高亮、泼墨亮相、敌将台词、洗牌演出按令牌开始和结束；`detail` 由持有者在申请时给（例如效果的目标格） |
| `state` | 对局流程 | `from, to` | 水牌、收尾演出、结算卡 |
| `push` | 战场压力 | `row, empty` | 整盘容器下移 240 ms；开始推行宽限；`empty` 为真时是最后一波之后的空行 |
| `scared` / `lastWave` | 战场压力 | — | 喊字位读的字 |
| `foodSpent` | 战场压力 | `amount, cause: 'match' \| 'miss'` | 粮数旁“−1”，粮袋格少一格 |
| `hostAttack` | 战场压力 | `kind: 'normal' \| 'special' \| 'blocked' \| 'broken'`（2026-10-30 追加），`line?`（敌将台词在当前阶段台词表里的序号）、`heart?`、`special?`（`sweep` / `charge` / `roar`）、`cells?`、`general?`；以 battle-pressure 规则 5 为准 | 普通：喊字位显示台词，丢的心在原位变虚线、新增的兵落位；特技：特技名横幅，横扫抽走再落下、拒马落进空格、被镇的牌抖两下变灰；被挡：“赵云挡下！”；被破：“妙计已破” |
| `interrupt` | 清除效果 | `cut` | **2026-10-30 作废**：连斩改为不看时间，退步改由 `comboPushback` 表示。名字保留不复用，规则层不再发 |
| `targetGone` | 清除效果 | `kind` | 喊字位“{目标}已经没了” |
| `skillReady` / `skillArmed` / `skillArmedSpent` | 武将技能 | `general` | 四重就绪提示；赵云待命的牌面和喊字；用掉时撤回喊字。`skillArmed`、`skillArmedSpent` 只用于压境、粮草模式的赵云（敌将模式的赵云是护盾，读 `hud().shield`） |
| `cardHint` | 武将技能 | `general, reason` | 牌翻出说明 1500 ms（未蓄满 / 无效果 / 已在待命） |
| `exit` | 对局流程 | `to: 'next' \| 'retry' \| 'catalog'` | `screens.mjs` 据此切画面、新建 round |
| `comboPushback`（2026-10-30 追加；暂定名，GDD 没有给事件名） | 战场压力（`comboReward()` 退步 `cut > 0` 时） | `cut` | 朱色斩痕划过步数圆点，读的字“压住一步”；`cut` 为 0 时不发（clear-effects 规则 8，ui-interaction 规则 21） |
| `bossPhase`（2026-10-30 追加） | 战场压力 | `phase, name` | 暴怒演出（跟 `phase` 令牌的开始和结束），之后敌将框换朱色、名牌换 `name` |
| `seal` / `unseal`（2026-10-30 追加） | 战场压力 | `general, left` / `general` | 虎啸镇住：武将牌抖两下变灰、挂剩余步数；解除时恢复 |
| `skillResult`（2026-10-30 追加；暂定名，GDD 没有给事件名） | 武将技能（诸葛亮的 `skill` 令牌到点后） | `general, kind, pairs, special, forecast`（`special` 是 `breakSpecial()` 返回的特技 id，没破为 `null`） | 结果横幅“清{兵} {对数} 对”；`special` 有值且 `forecast` 为真时加“· 破{特技名}”。“破”字小标不靠这个事件，读 `hud().broken`（general-skills 规则 14，battle-pressure 规则 23c） |

翻牌和拒马碎不另设事件：它们是 `match.revealed`、`match.broken`、`clear.revealed`、`clear.blocks` 这些字段（board-link 规则 8、13），界面在播 `match`/`clear` 时一起播。增兵、横扫、拒马落下的格子由 `hostAttack.cells` 给出。

文字一律不在事件里：界面拿 `type` 和字段去回目数据的 `texts` 里取句子，用加载器提供的模板函数代入参数（chapter-design 规则 4）。

### 2. 界面 → 规则：意图队列

界面在指针事件到达时把它换算成**意图**，追加到 `main-loop` 的输入队列；对局流程在下一帧第 ② 步按到达顺序处理（ADR-0002）。

| 意图 | 何时产生（`src/view/input.mjs`） | 规则层怎么处理 |
|---|---|---|
| `{ type: 'cell', row, col }` | 盘上 `pointerdown`，只认 `isPrimary`；位置换算成格子坐标（走线带算外圈，死区不算）；同格 200 ms 内重复按下忽略；`push` 后 150 ms 内按下压前的位置换算 | 盘锁则丢弃；关羽选排中按 round-flow 规则 5a 交给武将技能选行，不调用 `board.tap`；否则 `board.tap(row, col)` → 结果按规则 6 分发 |
| `{ type: 'card', general }` | 武将牌 `pointerup`，按下和抬起在同一张牌上；滑出或 `pointercancel` 取消；按下距上一次盘上按下 < 250 ms 忽略 | 盘锁则丢弃（不翻说明）；选排中点任何武将牌 = 取消选排，不做别的；否则 `skills.tapCard(general)`：关羽能放就进入选排（不申请令牌），其他武将能放就申请 `skill` 令牌，不能放就 `emit(cardHint)` |
| `{ type: 'offBoard' }`（2026-10-30 追加） | 选排中盘外（台眉、桌沿空白处）`pointerup` | 只在选排中有意义：取消选排；其他时候忽略 |
| `{ type: 'pauseStamp' }` | 暂停印 `pointerup` | 不受盘锁影响；`play` 时申请 `pause` 令牌 |
| `{ type: 'button', card, button }` | 覆盖卡按钮 `pointerup`（含水牌点将区的槽、可选武将牌、“×”） | 不受盘锁影响；`overlayAgeMs < CARD_GUARD_MS` 则丢弃（计时归 round，见 ADR-0002 第 2 节）；否则按 round-flow 规则 2、11、13 处理；点将按 general-loadout 规则 9–14 |

- 盘锁时界面**也**不交盘上和牌上的点击（ui-interaction 规则 15），规则层再按“本帧开始时或此刻”判一次；两道判断不矛盾，以规则层为准。
- 界面里的防误触计时（200 ms、250 ms、150 ms 宽限、1500 ms 翻牌、档位停留 1000 ms）用指针事件的 `timeStamp` 和帧的 `dtReal`，属于界面，不进规则层。
- 可见性、横竖屏、返回键不进队列，由 `src/platform/lifecycle.mjs` 直接调用对局流程（ADR-0002 第 4 节）。

### 3. 渲染技术：DOM + 一个 SVG 连线层

- **盘**：一个容器 `div`（下压和洗牌时整体做 transform），每块一个 `div`，里面一个 `<svg><use href="#kind-…"/></svg>`，共 3 个节点。块的位置用 `transform: translate()`，不用 `left/top`。选中、效果框、角印、预告圈用 class 切换。
- **连线**：盘上方一个 SVG，每条连线一个 `<polyline>`，画完即删；飞白用不规则的 `stroke-dasharray`。
- **图形**：全部来自 `src/assets/sprite.svg` 里的 `<symbol>`，构建时内联到页面，用 `<use>` 引用（美术圣经第 8 节取舍 2）。
- **HUD、覆盖卡、喊字位**：开局时建好全部元素、留好位置（ui-interaction 规则 9 “布局不跳”），之后只改文字、class 和 transform，不整块重建。
- **动画**：CSS transition 和 keyframes，只动 transform 和 opacity。时长从 `constants.mjs` 写进 CSS 自定义属性（如 `--effect-ms: 380ms`），不在 CSS 里写死数字。和令牌对应的演出，开始和结束都跟 `tokenStart`/`tokenEnd` 事件，CSS 只负责过程；规则上的“演出结束”永远由令牌决定，不由 `transitionend` 决定。
- **收尾演出**（胜利击碎结局 2 秒，1.5 秒时胜利卡进场盖章 / 失败 300 ms）：界面用每帧的 `dtReal` 累计前台时间，满 `ENDING_WIN_MS` / `ENDING_LOSE_MS` 就调用 `round.endingDone()`。这是唯一由界面计时推进的规则状态，理由和边界见 ADR-0002 第 2 节；不用 `transitionend`，也不用 `setTimeout`。
- **少动版本**：`matchMedia('(prefers-reduced-motion: reduce)')` 为真时根元素加 `.reduced`，CSS 换成少动的写法；读不到按默认版本。
- **布局**：`src/view/layout.mjs` 导出纯函数 `computeLayout({ width, height, safeArea, rows, mode })`，按 fit_scale 三档试、放不下再整体缩放（ui-interaction 规则 4–7、公式 fit_scale）。它不碰 DOM，可以在 Node 里测。窗口尺寸变化时下一帧重算；下压动画进行中则等动画结束。
- **页面设置**：`touch-action: none`（盘和牌）、`user-select: none`、`overscroll-behavior: none`、`text-size-adjust: 100%`、`color-scheme: light`；字体栈按 ui-interaction 规则 26、30（MVP 喊的字也用系统黑体 700）。

### Architecture Diagram

```
          ┌──────────── round（规则层）────────────┐
指针事件 ─► view/input ─► 意图队列 ─► frame() 第②步 ─► board / skills / round
          │                                     │
          │          emit(event) ◄──────────────┤ effects / skills / pressure / round
          │             outbox                  │
          └────────────────┬────────────────────┘
                           ▼ drainEvents()（每帧一次）
                 view/render：按事件播演出 ──► DOM + SVG
                 view/hud：比较查询值，变了才改 ──► 文字 / transform
```

### Key Interfaces

```
// 规则层（round-flow.mjs）
round.drainEvents()            // → Event[]，取走并清空
// 各规则模块由 round 创建，从 ctx 拿到 emit（装配顺序见 ADR-0002 第 3 节）
createPressure(ctx)            // ctx = { chapter, constants, board, emit, acquire, release, dispatch, gameTime }
createEffects(ctx + pressure)
createSkills(ctx + pressure)
round.acquire(reason, durationMs?, onEnd?, detail?)   // detail 随 tokenStart 事件发给界面；
                                                       // 在 round-flow.md 的签名后面追加的可选参数

// 界面层
export function computeLayout({ width, height, safeArea, rows, mode })  // 纯函数
export function createView(root, { progress, texts, constants })   // 页面加载时建一次
view.bindRound(round)          // 每回开局时绑定：经 round.systems() 拿到 board/effects/pressure/skills，只调用查询函数
view.unbindRound()             // 离开对局时
view.render(dtReal, events)
export function createInput(root, { enqueue, layout, now })            // 只产生意图
```

### Implementation Guidelines

- 必须：事件只含数据，名字和字段按上表；新增类型在本条追加。
- 必须：界面只通过查询接口读规则状态，只通过意图队列和生命周期入口影响规则（唯一例外是 `round.endingDone()`，见上）。
- 必须：盘面的格子、选中、待命只由 board-link 自己改；其他规则模块只能调用它的修改接口（board-link 规则 11），界面只读。
- 必须：HUD 缓存上次显示的值，只在变化时写 DOM；绝不每帧整块重写 `innerHTML`。
- 必须：一切动画只动 `transform`、`opacity`；时长从常量来。
- 必须：每块 ≤ 3 个节点；对局中可见 DOM ≤ 500。
- 必须：开发版诊断（`DEV` 为真时才有，正式包里没有）：R1 单向断言（遮罩、横幅、亮相、覆盖卡盖在盘上时盘必须锁住，整局违反 0 次）、每回开局数一次对局内 DOM 节点、缩放比例 < 0.85 警告、`will-change` 计数、rAF 帧率计（美术圣经第 8 节：小红书里大概率开不了远程调试）。
- 绝不：在界面里根据动画是否播完来推进规则（规则上的时间只在令牌和 `gameTime` 里）。
- 绝不：在规则层里格式化给玩家看的文字。
- 绝不：用 CSS `filter`、`backdrop-filter`、`mix-blend-mode`、运行时 SVG `<filter>`（构建检查会拦）。

## Alternatives Considered

### Alternative 1: Canvas 2D 整屏绘制
- **Description**: 每帧把盘、HUD、演出画进一块 canvas。
- **Pros**: 绘制开销可预测，不受 DOM 层数影响；动画写法自由。
- **Cons**: 中文系统字体在 canvas 里的清晰度、换行和高 DPI 缩放都要自己处理（必读字 18 px、对比 ≥ 7:1 的要求更难守）；点击命中要自己算；每帧重画整屏在低端机上反而更费电；美术圣经的 SVG 合集要先栅格化。
- **Rejection Reason**: 文字可读性是目标人群的硬要求，DOM 文字更稳；48 块的盘远在 DOM 预算之内。

### Alternative 2: 全局事件总线（发布 / 订阅）
- **Description**: 各系统往总线发事件，谁关心谁订阅，包括规则系统之间。
- **Pros**: 松耦合，加新的订阅者方便。
- **Cons**: 订阅顺序决定结算顺序，正是 round-flow 规则 6 要消灭的竞态；调试时看不出谁先谁后。
- **Rejection Reason**: 违反“谁先谁后只规定一次”。本方案的出口只通往界面，而且是同步、按顺序、每帧取一次。

### Alternative 3: 界面只靠比较前后两帧的状态，不要事件
- **Description**: 每帧读全部状态，和上一帧比，推出该播什么。
- **Pros**: 只有一种通道。
- **Cons**: 连线的折线、`miss` 的晃动、同一帧里先选中再消除这类瞬时的东西推不出来；比较整个盘的开销也更大。
- **Rejection Reason**: 信息不够。本方案对持续状态用查询、对瞬时的东西用事件。

### Alternative 4: 用一个响应式界面框架
- **Description**: 引入轻量的响应式库做数据绑定。
- **Pros**: 少写更新 DOM 的代码。
- **Cons**: 第三方库，违反硬约束。
- **Rejection Reason**: ADR-0001。

## Consequences

### Positive
- 规则层和界面完全分开：规则层在 Node 里测，界面的布局计算也能在 Node 里测。
- 事件清单就是“界面要播什么”的完整列表，界面故事可以照着逐条验收。
- DOM 文字直接用系统字体，清晰度、字号锁定都由浏览器负责。

### Negative
- 要手写 HUD 的差量更新代码。
- 新增事件类型要同时改规则和界面，靠本条的清单协调。

### Neutral
- `acquire` 多了一个可选的 `detail` 参数，round-flow.md 的签名不变（只是追加），不需要改设计文档。

## Risks

- **低端安卓上 DOM 动画掉帧**：动画只动合成层属性、同时动的元素有上限（常态 ≤ 12、高潮 ≤ 24）；真机测过不达标时，先减少同时动的块（分批），再考虑把连线层改成 canvas（只改连线层，不改通道）。
- **宿主 WebView 不支持 `touch-action`**：在 `touchstart`/`touchmove` 上 `preventDefault()` 作后备（需要 `{ passive: false }`）。
- **事件在出口里堆积**（界面某帧没取）：出口只在 `drainEvents()` 时清空；开发版在出口超过 200 条时警告。

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| round-flow.md | 规则 6.3：`match`/`miss` 按清除效果 → 武将技能 → 战场压力 → 界面的顺序同步通知；分发表 | 对局流程在第 ④ 步才 `emit`，前三步是直接调用（TR-round-flow-005） |
| round-flow.md | 规则 5、9：盘锁时点击丢弃；覆盖卡按钮 `CARD_GUARD_MS` | 意图在第 ② 步按锁和防连点处理（TR-round-flow-003、-009） |
| board-link.md | 规则 7、8：结果作为返回数据交给对局流程，不直接调用其他系统；折线 2–4 个点供界面画线；`match` 带 `broken`、`revealed` | `match.path`、`broken`、`revealed` 经出口送达（TR-board-link-004、-003） |
| board-link.md | 规则 5、9、13、17：层叠与翻牌、拒马、`clear` 带 `buried`/`blocks`/`revealed`；查询 `depthAt`、`buriedCount`、`blocks`、`rowContents` | `match`/`clear` 的追加字段 + 第 1 节查询清单（2026-10-30） |
| battle-pressure.md | 规则 5：`push {row, empty}`、`scared`、`lastWave`、`foodSpent {amount, cause}`、`hostAttack {kind, line?, heart?, special?, cells?, general?}`、`bossPhase`、`seal`、`unseal` 直接发给界面；`hud()` 供界面读（规则 26） | ctx 里的 `emit` + 查询接口；字段与 battle-pressure 规则 5 一致（TR-battle-pressure-002、-003） |
| round-flow.md | 规则 5a：关羽选排时的输入路由 | 第 2 节 `cell`、`card`、`offBoard` 意图的选排分支 |
| general-loadout.md | 武将牌最多 3 张，顺序是槽位顺序；水牌点将 | `skills.cards()`；点将走覆盖卡按钮意图 |
| chapter-design.md | 规则 4：文字模板里的花括号在显示时代入实际生效的参数 | 事件不带文字，界面用加载器的模板函数取句子（TR-chapter-design-003） |
| ui-interaction.md | 开发版诊断：R1 单向断言、DOM 计数、缩放 < 0.85 警告、`will-change` 计数、帧率计 | Implementation Guidelines 的开发版诊断（TR-ui-interaction-009） |
| general-skills.md | 牌的状态和说明文字；点不能放的牌只翻说明；诸葛亮结果横幅 | `skills.cards()` 查询 + `cardHint`、`skillResult` 事件（TR-general-skills-002） |
| clear-effects.md | 连斩退步“压住一步”、“{目标}已经没了”、预告圈 | `comboPushback`、`targetGone` 事件 + `previewTarget()` 查询（`interrupt` 2026-10-30 作废）（TR-clear-effects-003） |
| ui-interaction.md | 规则 1、22：画面与覆盖卡；盖住盘的东西只在盘锁时存在 | 覆盖卡由 `round.overlay()` 推出（TR-ui-interaction-001） |
| ui-interaction.md | 规则 4–7、23：fit_scale、舞台 ≤ 480、窗口变化下一帧重排 | `computeLayout` 纯函数（TR-ui-interaction-002） |
| ui-interaction.md | 规则 14–17：`isPrimary`、按下即选、武将牌四道防护、推行宽限 | `view/input.mjs` 的意图换算（TR-ui-interaction-003） |
| ui-interaction.md | 规则 31–34：只动 transform/opacity、DOM 预算、一个 SVG 连线层、差量更新、内联 SVG | 第 3 节渲染技术（TR-ui-interaction-004） |
| ui-interaction.md | 规则 26–30：两套字、字号锁定、`color-scheme: light`、少动版本 | 第 3 节页面设置（TR-ui-interaction-005） |
| ui-interaction.md | 规则 18、20、24：可见性和横竖屏转交对局流程；喊字位排队 | 生命周期入口（ADR-0002）+ 事件驱动的喊字（TR-ui-interaction-006） |

## Performance Implications
- **CPU**: 每帧取一次事件、比较十几个 HUD 值；DOM 写入只在变化时发生。预算：`view.render()` 每帧 ≤ 4 ms（基准机），剩下的帧时间留给浏览器的样式、布局、绘制和合成；点击到反馈 ≤ 100 ms 的链路是“指针事件 → 下一帧第 ② 步 → 同帧 `render`”，最多隔一帧（约 17 ms）。
- **Memory**: 对局中 DOM ≤ 500 个节点；事件对象每帧清空。
- **Load Time**: 开局一次性建好盘和 HUD 元素（≤ 200 ms 预算）。
- **Network**: 无。

## Migration Plan

没有现成代码。原型的 `innerHTML` 整块重写不迁移。

## Validation Criteria

- 单元测试：`computeLayout` 在 375×667、360×640、414×896 下按 fit_scale 选出预期档位和缩放比例。
- 集成测试：一串固定点击产生的事件序列与预期完全一致（含顺序）。
- 真机截图：三种模式的对局画面都放得下，HUD 变化时盘不移动（存进 `production/qa/evidence/`）。
- 真机：`pointerdown` 到选中框出现 ≤ 100 ms；高潮动画 ≥ 30 fps。

## Related

- ADR-0001、ADR-0002
- `design/gdd/ui-interaction.md`、`design/gdd/round-flow.md`、`design/art/art-bible.md` 第 7、8 节

## Revision History

- 2026-10-30：并入切片第四至六版和选将（见 `docs/architecture/change-impact-2026-10-30-slice-merge.md`），决策不变。
