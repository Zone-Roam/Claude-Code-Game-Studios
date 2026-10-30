# Control Manifest

> **Engine**: 无引擎 — 原生 H5（ES2017），小红书“小工具”WebView（版本未知，见 `docs/engine-reference/web-h5/VERSION.md`）
> **Last Updated**: 2026-10-27
> **Manifest Version**: 2026-10-27
> **ADRs Covered**: ADR-0001, ADR-0002, ADR-0003, ADR-0004（全部 Accepted）
> **Status**: Active — regenerate with `/create-control-manifest update` when ADRs change

`Manifest Version` is the date this manifest was generated. Stories embed it when
they are written, and `/story-readiness` compares a story's version with this one
to find stories written against old rules. It always equals `Last Updated`: the
same date, for different readers.

This manifest is a programmer's quick reference taken from the Accepted ADRs, the
technical preferences and the engine reference docs. For the reason behind a rule,
read its ADR.

TD-MANIFEST skipped — Lean mode.

---

## Foundation Layer Rules

*Applies to: scene management, event architecture, save/load, engine start-up —
本项目是 `src/core/`、`src/app/`、`src/platform/`、`src/rules/board-link.mjs`、构建脚本*

### Required Patterns
- **语法基线 ES2017**：不用 `?.`、`??`、`||=`、`&&=`、不带参数的 `catch {`、`.finally(`、`Object.fromEntries`、`.flat(`、`.at(`、`globalThis`、`BigInt`、私有字段、数字分隔符、正则命名组等（完整清单见 ADR-0001 构建检查第 5 条）；对象展开 `{...a}` 和类字段靠代码审查 — source: ADR-0001
- **代码根目录和分层**：`src/core/`、`src/rules/`（一份设计文档一个文件）、`src/data/`、`src/app/`、`src/platform/`、`src/view/`、`src/assets/`；测试在 `tests/unit/<system>/`、`tests/integration/<system>/` — source: ADR-0001
- **模块写法**：只用静态具名导入导出（`import { a } from './x.mjs'`、`export function / const / class`），相对路径带 `.mjs`；不用默认导出、`export *`、`import * as`、动态 `import()` — source: ADR-0001
- **工厂函数加注入**：每个规则模块导出工厂函数，依赖从参数传入，不用模块级可变单例 — source: ADR-0001
- **常量集中**：Tuning Knobs 缺省值、兵种表（12 个 id，固定顺序）、`BOARD_COLS = 6`、武将 id 表都在 `src/core/constants.mjs`，名字与设计文档一致；按兵种遍历一律按兵种表顺序 — source: ADR-0001
- **唯一帧循环**：只有 `src/app/main-loop.mjs` 调用 `requestAnimationFrame`，先排下一帧再执行本帧，本帧异常交 `screens.fail(err)` 进出错页 — source: ADR-0002
- **画面状态机**：顶层 `catalog / round / error` 归 `src/app/screens.mjs`；每次开局新建 round 对象；`attempt` 计数在 `screens.mjs`；能加载的回目为空直接进 `error` — source: ADR-0002
- **装配根**：`src/main.mjs`、`src/app/`、`src/platform/lifecycle.mjs` 负责接线，可以引用上层；`systems` 工厂表由 `screens.mjs` 传给 `createRound`，`round-flow` 里不写缺省值 — source: ADR-0002、architecture.md
- **随机流**：`src/core/rng.mjs` 的 `hash32`（FNV-1a + fmix32）和 `createStream`（mulberry32），`seed = hash32(chapterId, attempt, salt)`；`salt` 只在 `main.mjs` 生成一次（或取开发、测试包的 `seed=N`） — source: ADR-0002
- **黄金值测试**：`tests/unit/core/rng.test.mjs` 钉死 `hash32` 和各条流前几个输出；改算法要新写决策记录 — source: ADR-0002
- **事件出口**：规则层经 ctx 的 `emit(event)` 往 round 的出口追加普通对象（带 `type`），界面每帧 `drainEvents()` 一次；事件类型和字段按 ADR-0003 的事件表，只追加不改名 — source: ADR-0003
- **意图队列**：界面把指针事件换成意图（`cell` / `card` / `pauseStamp` / `button`），下一帧第 ② 步按到达顺序处理；可见性、横竖屏、返回键直接调用 round 的入口，不排队 — source: ADR-0002、ADR-0003
- **存储端口**：只有 `src/platform/storage.mjs` 碰 `localStorage`（键 `pslk.save`、`pslk.save.bad`、`pslk.probe`），端口不吞异常 — source: ADR-0004
- **单文件发布**：`node tools/build/build.mjs <test|release>` 把模块改写成函数作用域，连同 CSS、SVG、数据内联成一个 HTML；`release` 不读任何网址参数、`devAssert` 为空函数；打包后用 `node:vm` 编译一遍 — source: ADR-0001

### Forbidden Approaches
- **Never 在 `src/rules/`、`src/core/` 里引用 `document`、`window`、`localStorage`、`Date.now()`、`performance.now()`、`Math.random()`、`setTimeout`** — 规则要能在 Node 里用注入的时间、种子和存储测试 — source: ADR-0001（`tests/integration/architecture/rules-layer-purity.test.mjs` 会拦）
- **Never 在发布包里放第三方代码**（库、框架、CDN、复制来的片段） — 用户硬约束、2 MB — source: ADR-0001
- **Never 写依赖模块脚本、多文件或 `fetch` 才能运行的发布逻辑** — 平台未核实 — source: ADR-0001
- **Never 用引擎导出网页版或网页游戏框架** — 体积和第三方约束 — source: ADR-0001 Alternatives 1、2
- **Never 用 `setTimeout`/`setInterval` 驱动任何游戏计时** — 演出期间不停表、后台回来会补触发、顺序靠计时器排队 — source: ADR-0002 Alternative 1
- **Never 用长寿命 round 加 `reset()`** — 漏重置的字段会带进下一回 — source: ADR-0002 Alternative 3
- **Never 用全局事件总线让规则系统互相订阅** — 订阅顺序会变成结算顺序 — source: ADR-0003 Alternative 2、ADR-0002
- **Never 用 IndexedDB 或 cookie 存档**（除非新的决策记录取代 ADR-0004） — source: ADR-0004 Alternatives 1、2
- **Never 让存储异常冒泡到主循环，或因存储失败阻止进入游戏** — source: ADR-0004
- **Never 发布时去注释或压缩**（自写切分器认不出正则字面量） — source: ADR-0001

### Performance Guardrails
- **发布包**：≤ 2,000,000 字节，超了构建失败（硬约束） — source: ADR-0001
- **代码部分**：> 160 KB 警告 — source: ADR-0001、美术圣经第 8 节
- **规则每帧**（`round.frame()`）：≤ 2 ms（基准机）；死局洗牌那一帧例外，`RESHUFFLE_TRIES` 次全失败的耗时在 Node 里测，超过 16 ms 就调低 `RESHUFFLE_TRIES` — source: ADR-0002

---

## Core Layer Rules

*Applies to: core gameplay loop — 本项目是 `src/rules/round-flow.mjs`、`src/rules/clear-effects.mjs`*

### Required Patterns
- **每帧五步**：① 隐式后台（`dtReal > BG_GAP_MS`）② 意图（盘上、牌上的点击在“状态不是 `play`、或本帧开始时、或此刻有令牌”时丢弃；每次点击后令牌为空就做结算点）③ 令牌计时 ④ 无令牌且 `play` 时推进 `gameTime`，`dtGame > 0` 才 `tick` ⑤ 结算点 — source: ADR-0002
- **结算点**：先 `pressure.outcome()`（先胜后负），分出胜负进 `end`；否则 `board.ensurePlayable()`，洗了牌就申请 `reshuffle` 令牌；本帧调用过 `tick` 也是结算点 — source: ADR-0002
- **令牌**：按申请顺序的数组；`background`、`pause` 各最多一个；有时长的按前台真实时间计时（持有 `background`/`pause` 时不计），本帧新申请的下一帧才计；超过 `TOKEN_MAX_MS` 强制归还且效果只完成一次 — source: ADR-0002
- **覆盖卡计时**：`overlayAgeMs` 在 `overlay()` 变化或进入 `settle` 时清零，**持有 `background`/`pause` 时照样累计**；按钮意图在 `< CARD_GUARD_MS` 时丢弃；暂停印不受防连点和盘锁影响 — source: ADR-0002
- **开讲**：点“开讲”进入子状态 `starting`（`overlay()` 为 `null`，发 `state` 事件），计满 `OPEN_FADE_MS` 才进入 `play` — source: ADR-0002
- **进入 `end`**：停钟、锁盘、立即 `progress.settle()` 一次；`end → settle` 只由 `round.endingDone()` 触发 — source: ADR-0002
- **装配顺序**：`createBoard(chapter, { seed, streams? })` → ctx（`gameTime` 是函数 `() => ms`）→ `createPressure(ctx)` → `createEffects`、`createSkills`（ctx 加 `pressure`，用 `Object.assign`，不用对象展开）；`round.systems()` 给界面读 — source: ADR-0002
- **分发顺序**：`match`/`miss` 依次给清除效果 → 武将技能 → 战场压力 → `emit`（界面）；效果、技能的 `clear` 先给 `pressure.onClear` 再 `emit` — source: ADR-0002、ADR-0003
- **测试**：五步顺序、“本帧开始时或此刻”的丢弃、覆盖卡计时（暂停卡 500 ms 后“接着讲”有效、失败卡 300 ms 无效 600 ms 有效、胜利卡按钮出现后同理、开局立即点暂停印有效）各有集成测试，用假的 `dtReal` 逐帧驱动 — source: ADR-0002

### Forbidden Approaches
- **Never 在 `play` 以外推进 `gameTime`** — source: ADR-0002
- **Never 在结算顺序之外让规则模块互相调用通知** — 顺序只在 `round-flow` 里写一次 — source: ADR-0002
- **Never 在 `round-flow.mjs` 里 import Feature 层模块**（`systems` 由装配根传入） — source: ADR-0002
- **Never 用固定步长累积器** — 与已批准的 `dt_game` 公式不一致 — source: ADR-0002 Alternative 2

### Performance Guardrails
- **规则每帧**：≤ 2 ms（同 Foundation） — source: ADR-0002

---

## Feature Layer Rules

*Applies to: 本项目是 `src/rules/battle-pressure.mjs`、`general-skills.mjs`、`progress-save.mjs`、`chapter-loader.mjs` 和 `src/data/`*

### Required Patterns
- **只读 ctx 里的时间**：带时间的规则只读 `ctx.gameTime()` 或 `tick(dtGame)` 的参数；演出时长只放在令牌上 — source: ADR-0002
- **随机只从盘面取**：`board.rng('wave')`、`board.rng('add')` — source: ADR-0002
- **战场压力的事件字段**：`push {row, empty}`、`scared`、`lastWave`、`foodSpent {amount, cause}`、`hostAttack {line}`，经 ctx 的 `emit` 直接发；只回答 `outcome()`，不主动结束一回 — source: ADR-0003
- **武将技能**：点不能放的牌 `emit({ type: 'cardHint', general, reason })`；能放就申请 `skill` 令牌，令牌到点才落到盘面 — source: ADR-0003、ADR-0002
- **改盘面只走 board-link 的修改接口**，格子、选中、待命只由 board-link 自己改 — source: ADR-0003
- **数据**：回目、敌将、文字在 `src/data/chapters.mjs`（只有 `export const` 数据）；网址参数由 `build-flags.mjs` 的 `readUrlFlags` 按构建读取 — source: ADR-0001
- **存档逻辑**：`createProgress({ storage, chapters, now })` 纯代码；每次端口调用包 `try/catch`；写入只在 `settle()`、启动探测、损坏备份三处；`settle()` 同步、从不抛异常、同一回只结算一次（第二次开发版报错、正式版返回第一次的结果） — source: ADR-0004
- **存档测试**：`tests/unit/progress-save/` 用假端口覆盖 progress-save 规则 13 的重读结果表和规则 14–17 的状态转换 — source: ADR-0004

### Forbidden Approaches
- **Never 在对局中途、切后台、回书目放弃时写档** — source: ADR-0004
- **Never 把存档内容发到任何地方** — 不联网 — source: ADR-0004
- **Never 在规则层里格式化给玩家看的文字**（文字由界面从 `texts` 取） — source: ADR-0003

---

## Presentation Layer Rules

*Applies to: rendering, audio, UI, VFX, shaders, animations — 本项目是 `src/view/`、`src/assets/`*

### Required Patterns
- **DOM + 一个 SVG 连线层**：每块一个 `div` 加 `<svg><use/></svg>`（≤ 3 个节点），位置用 `transform: translate()`；连线每条一个 `<polyline>`；图形全部来自内联的 `<symbol>` 合集 — source: ADR-0003
- **只读查询、只发意图**：界面经 `round.systems()` 只调用查询函数；`createView(root, { progress, texts, constants })` 建一次，每回 `view.bindRound(round)` / `unbindRound()` — source: ADR-0003
- **HUD 差量更新**：缓存上次显示的值，变了才写 DOM — source: ADR-0003
- **布局先留好**：开局建好全部 HUD、覆盖卡、喊字位元素，之后只改文字、class、transform — source: ADR-0003
- **`computeLayout` 是纯函数**，在 Node 里测；窗口变化下一帧重算，下压动画中等动画结束 — source: ADR-0003
- **演出跟令牌**：和令牌对应的演出按 `tokenStart`/`tokenEnd` 开始和结束；CSS 时长从常量写进自定义属性 — source: ADR-0003
- **收尾演出**：用每帧 `dtReal` 累计前台时间，满 `ENDING_WIN_MS`（1100）/ `ENDING_LOSE_MS`（300）调用 `round.endingDone()`，这是唯一由界面计时推进的规则状态 — source: ADR-0002、ADR-0003
- **页面设置**：`touch-action: none`（盘和牌）、`user-select: none`、`overscroll-behavior: none`、`text-size-adjust: 100%`、`color-scheme: light`；跟随 `prefers-reduced-motion` — source: ADR-0003
- **开发版诊断**（只在 `DEV`）：R1 单向断言、开局 DOM 计数、缩放 < 0.85 警告、`will-change` 计数、rAF 帧率计 — source: ADR-0003

### Forbidden Approaches
- **Never 对 transform 和 opacity 以外的属性做动画**（`left/top/width/height/font-size` 等，构建检查第 6 条） — source: ADR-0003、ADR-0001
- **Never 用 CSS `filter`、`backdrop-filter`、`mix-blend-mode`、运行时 SVG `<filter>`** — source: ADR-0003（构建检查第 2 条）
- **Never 用 emoji 当图标**（© ® ™ 除外） — source: ADR-0001（构建检查第 7 条）
- **Never 根据 `transitionend` 或界面计时器推进规则**（`endingDone()` 除外） — source: ADR-0003、registry `animation_driven_rules`
- **Never 每帧整块重写 `innerHTML`** — source: ADR-0003
- **Never 整屏 Canvas 绘制** — 系统字体可读性 — source: ADR-0003 Alternative 1
- **Never 引入响应式界面框架** — 第三方 — source: ADR-0003 Alternative 4

### Performance Guardrails
- **界面每帧**（`view.render()`）：≤ 4 ms（基准机，不含浏览器布局绘制） — source: ADR-0003
- **对局中可见 DOM**：≤ 500 个节点 — source: ADR-0003
- **点击到反馈**：≤ 100 ms（指针事件 → 下一帧第 ② 步 → 同帧 `render`） — source: ADR-0003

---

## Global Rules (All Layers)

### Naming Conventions
| Element | Convention | Example | Source |
|---------|-----------|---------|--------|
| Classes | PascalCase | `RoundResult` | `naming.classes` in project.yaml |
| Variables | camelCase | `gameTime`、`overlayAgeMs` | `naming.variables` in project.yaml |
| Signals/Events | camelCase（事件的 `type` 字符串） | `hostAttack`、`tokenStart` | `naming.signals` in project.yaml |
| Files | kebab-case | `board-link.mjs`、`round-flow.mjs` | `naming.files` in project.yaml |
| Constants | SCREAMING_SNAKE | `CARD_GUARD_MS`、`BOARD_COLS` | `naming.constants` in project.yaml |
| Screens / overlays | camelCase | `catalog`、`round`、`resume`、`landscape` | `naming.scenes` in project.yaml |

### Performance Budgets
| Target | Value | Source |
|--------|-------|--------|
| Framerate | 60（P95 帧时 ≤ 20 ms，高潮 ≥ 30 fps） | `performance.target_framerate` in project.yaml；architecture.md |
| Frame budget | 16.67 ms | `performance.frame_budget_ms` in project.yaml |
| Draw calls | 不适用（无引擎） | `performance.draw_call_limit: null` |
| Memory ceiling | 未定（WebView 里量不到） | `performance.memory_ceiling_mb: null` |

### Approved Libraries / Addons
- 无。发布包不允许任何第三方代码（ADR-0001）；开发时只用本机 Node 24 自带的 `node:test`、`node:assert`、`node:fs`、`node:path`、`node:http`、`node:vm` — source: ADR-0001、technical-preferences.md（Allowed Libraries 为空）

### Forbidden APIs (H5 platform, version unknown)
本项目没有引擎，也就没有引擎的弃用 API 表；下面是平台参考里的禁用清单：
- 一切网络 API：`fetch`、`XMLHttpRequest`、`WebSocket`、`navigator.sendBeacon`
- `eval`、`new Function`、动态 `import()`
- 探测结果回来前慎用：`IndexedDB`、`navigator.storage`、Clipboard API、`document.fonts`
- Source: `docs/engine-reference/web-h5/VERSION.md`（“禁用”“慎用”两节）

### Cross-Cutting Constraints
- 每个公开函数写文档注释 — source: coding-standards、ADR-0001
- 游戏数值和文字都是数据，不写死在逻辑里 — source: coding-standards、ADR-0001
- 平台未核实的事（存储是否持久、生命周期事件、多文件、字号放大、强制深色）都有不依赖探测结果的兜底；探测结果回来后更新 `web-h5/VERSION.md`，需要时新写决策记录取代 — source: architecture.md OQ-1
