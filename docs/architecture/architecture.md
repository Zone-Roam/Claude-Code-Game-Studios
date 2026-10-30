# 评书连连看·三国 — Master Architecture

## Document Status
- Version: 4（v1 当天经 `/architecture-review` 全量审查为 CONCERNS；v2 按审查意见修订装配顺序、覆盖卡计时归属、事件字段、构建检查、开放问题；复核发现 v2 带进的新问题，v3 修订；第二次复核又发现 2 个中等问题（开讲渐隐的起点、发布时去注释会删坏正则），v4 修订：`starting` 时 `overlay()` 为 `null`，MVP 发布包不去注释、改为用 `node:vm` 编译检查。按事先定的停止标准，复核到此为止，低严重度的遗留项见审查报告末尾）
- Last Updated: 2026-10-30（加入选将 general-loadout，Feature 层；ADR-0001..0004 已 Accepted 并于 2026-10-30 就地修订）
- Engine: 不用引擎 — 原生 H5（HTML/CSS/JS，ES2017），跑在小红书“小工具”WebView 里；平台参考 `docs/engine-reference/web-h5/VERSION.md`
- Workflow tier: standard（按 `/create-architecture` 的 standard 规定：系统分层图 + 关键决策记录清单；模块归属、数据流、接口边界只写到决策记录需要的程度）
- GDDs Covered: board-link、round-flow、clear-effects、battle-pressure、general-skills、general-loadout、chapter-design、progress-save、ui-interaction（8 份 MVP + 2026-10-30 加入的选将；均在复审中，状态 In Review）
- ADRs Referenced: ADR-0001、ADR-0002、ADR-0003、ADR-0004（均为 Proposed）
- TD-ARCHITECTURE: 2026-10-27 — skipped — lean mode
- LP-FEASIBILITY: 2026-10-27 — skipped — lean mode
- Engine validation: NOT ASSESSED — no engine configured (`engine.name` unset in `project.yaml`, deliberate; see ADR-0001)

## Engine Knowledge Gap Summary

没有引擎，所以没有“引擎版本超出模型知识”的问题。风险换成了**平台**：

| 领域 | 风险 | 说明 | 由谁处理 |
|---|---|---|---|
| 通用 Web 标准（DOM、Pointer Events、rAF、CSS transform、localStorage API） | LOW | 训练数据覆盖充分 | — |
| 小红书 WebView 的存储（会不会被清、来源会不会随发版变化、配额） | **HIGH** | 完全不知道，影响存档能不能留住 | ADR-0004，开放问题 OQ-1 |
| 小红书 WebView 的生命周期事件（`visibilitychange`、`pagehide`、返回键、横竖屏） | **HIGH** | 不知道会不会来 | ADR-0002 的隐式后台兜底，OQ-1 |
| 能不能多文件、`fetch`、模块脚本 | **HIGH** | 不知道 | ADR-0001：发布包默认单文件、不用 `fetch`，不依赖这三项 |
| 内核版本和语法支持 | MEDIUM | 千元安卓机的 WebView 可能很旧 | ADR-0001：语言基线 ES2017，不转译 |
| 宿主字号放大、强制深色、安全区 | **HIGH** | 完全不知道，影响布局和对比度 | ADR-0003（`text-size-adjust`、`color-scheme`，Verification Required）；OQ-1 |

这些都靠平台探测页（`tools/platform-probe/`）在真机上核实。结果回来前，所有 HIGH 项都有不依赖结果的兜底。

## Technical Requirements Baseline

Extracted from 8 GDDs | 38 requirements listed here | 50 registered（TR registry: `docs/architecture/tr-registry.yaml`）
（`/architecture-review` 2026-10-27 原样登记了下表 38 条，又补了 12 条；完整清单和逐条覆盖以 `tr-registry.yaml` 和 `requirements-traceability.md` 为准，下表只作概览）

| Req ID | GDD | System | Requirement | Domain |
|--------|-----|--------|-------------|--------|
| TR-board-link-001 | board-link.md | 盘面与连通 | 6 列 × 6–8 行的可玩格加一圈永远为空的外圈；12 种兵 id 固定、顺序固定 | Core |
| TR-board-link-002 | board-link.md | 盘面与连通 | 从 `seed` 派生 4 条互相独立的随机流 `deal`/`shuffle`/`wave`/`add`；同一种子、同一串操作，结果完全相同 | Core |
| TR-board-link-003 | board-link.md | 盘面与连通 | 连通判定：拐弯 ≤ 2 次，按“拐弯少 → 总长短 → 拐点行优先”取第一条，返回 2–4 个点的折线 | Core |
| TR-board-link-004 | board-link.md | 盘面与连通 | 点击和修改接口只返回数据（`match`/`miss`/`clear`/`push`/`add`/`reshuffle`），不调用其他系统 | Core |
| TR-board-link-005 | board-link.md | 盘面与连通 | 不变量 I1（每种兵偶数块）：开发版报错，正式版拒绝修改并写日志 | Core |
| TR-board-link-006 | board-link.md | 盘面与连通 | 结算点调用 `ensurePlayable()`：在已占格内用 `shuffle` 流洗牌，失败走确定性的对调保底 | Core |
| TR-round-flow-001 | round-flow.md | 对局流程与时钟 | 唯一的游戏时钟 `gameTime`：只在“对局”且没有令牌时推进，单帧 ≤ `MAX_STEP_MS`，`dtReal > BG_GAP_MS` 视为隐式后台 | Core |
| TR-round-flow-002 | round-flow.md | 对局流程与时钟 | 令牌集合：7 种原因，有时长的按前台真实时间计时，超过 `TOKEN_MAX_MS` 强制归还且效果只完成一次 | Core |
| TR-round-flow-003 | round-flow.md | 对局流程与时钟 | 盘锁 ⇔ 状态不是“对局”或令牌集合不为空；盘锁时的点击直接丢弃、不缓存 | Input |
| TR-round-flow-004 | round-flow.md | 对局流程与时钟 | 每帧五步顺序（隐式后台 → 点击 → 令牌计时 → tick → 结算点），每次点击后就地结算 | Core |
| TR-round-flow-005 | round-flow.md | 对局流程与时钟 | `match`/`miss` 按固定顺序同步通知：清除效果 → 武将技能 → 战场压力 → 界面；其他结果按分发表 | Core |
| TR-round-flow-006 | round-flow.md | 对局流程与时钟 | 胜负只在结算点查询 `outcome()`（先胜后负）；进入“结束”立即 `settle(RoundResult)` | Core |
| TR-round-flow-007 | round-flow.md | 对局流程与时钟 | 后台、暂停、横屏用 `background`/`pause` 令牌表达；“回书目”清空令牌、不通知持有者 | Core |
| TR-round-flow-008 | round-flow.md | 对局流程与时钟 | `seed = hash32(chapterId, attempt, salt)`；`salt` 页面加载时随机；`seed=N` 只在开发版和测试包读取 | Core |
| TR-round-flow-009 | round-flow.md | 对局流程与时钟 | 覆盖卡按钮出现后 `CARD_GUARD_MS` 内不响应 | Input |
| TR-clear-effects-001 | clear-effects.md | 清除效果与连斩 | 连斩窗口按游戏时钟计（3000 ms），门槛 3 | Core |
| TR-clear-effects-002 | clear-effects.md | 清除效果与连斩 | 效果申请 `effect` 令牌 380 ms，令牌到点后才调用 `clearKind` | Core |
| TR-clear-effects-003 | clear-effects.md | 清除效果与连斩 | 连斩奖励经战场压力兑现；敌将打断每个出手周期最多 50 | Core |
| TR-battle-pressure-001 | battle-pressure.md | 战场压力 | 只由 `tick(dtGame)` 推进；压境波次表开局用 `wave` 流预先生成，最后一波后空行继续下压 | Core |
| TR-battle-pressure-002 | battle-pressure.md | 战场压力 | `push`、`scared`、`lastWave`、`foodSpent`、`hostAttack` 事件直接发给界面，不经对局流程 | Core |
| TR-battle-pressure-003 | battle-pressure.md | 战场压力 | `hud()` 给界面读；`metrics()` 在结束时给结果对象 | UI |
| TR-battle-pressure-004 | battle-pressure.md | 战场压力 | 不主动通知胜负，只回答 `outcome()` 查询（解开与对局流程的循环依赖） | Core |
| TR-general-skills-001 | general-skills.md | 武将技能 | 消对应兵蓄力；点牌申请 `skill` 令牌 950 ms，令牌到点后技能才落到盘面 | Core |
| TR-general-skills-002 | general-skills.md | 武将技能 | 每张牌的状态（未蓄满 / 就绪 / 待命 / 无效果）和说明文字供界面读 | UI |
| TR-chapter-design-001 | chapter-design.md | 回目编排与难度 | 回目、敌将、文字放在数据文件里，启动时逐回校验：拒绝加载 / 只警告两张清单 | Core |
| TR-chapter-design-002 | chapter-design.md | 回目编排与难度 | 网址参数 `slow`、`seed` 只在开发版和测试包读，`ch` 只在开发版读，正式包一个都不读 | Core |
| TR-chapter-design-003 | chapter-design.md | 回目编排与难度 | 文字模板里的花括号在显示时代入实际生效的参数（乘过 `slow` 之后） | UI |
| TR-progress-save-001 | progress-save.md | 进度、三星与存档 | 存档键 `pslk.save`，结构 v1，读取时先看版本再逐条校验 | Core |
| TR-progress-save-002 | progress-save.md | 进度、三星与存档 | 只在 `settle()` 时写；写前重读、逐回取较大值合并再写 | Core |
| TR-progress-save-003 | progress-save.md | 进度、三星与存档 | 启动时读档 + `pslk.probe` 写读删探测；“正常 / 只读 / 仅内存”三态和四种提示 | Core |
| TR-progress-save-004 | progress-save.md | 进度、三星与存档 | 版本迁移逐版进行；新版本存档只读；损坏存档另存 `pslk.save.bad` | Core |
| TR-progress-save-005 | progress-save.md | 进度、三星与存档 | 不联网、不收集、不上传任何数据 | Networking |
| TR-ui-interaction-001 | ui-interaction.md | 界面与交互 | 书目 / 对局 / 出错页三个画面加 6 张覆盖卡；盖住盘的东西只在盘锁时存在（R1） | UI |
| TR-ui-interaction-002 | ui-interaction.md | 界面与交互 | 高度分配按 fit_scale 三档试，放不下才整体缩放；舞台宽 ≤ 480；窗口变化下一帧重排 | UI |
| TR-ui-interaction-003 | ui-interaction.md | 界面与交互 | 只处理 `isPrimary` 指针；块按下即选（含外圈换算、同格 200 ms 防抖、推行宽限 150 ms）；武将牌抬手判定加四道防护 | Input |
| TR-ui-interaction-004 | ui-interaction.md | 界面与交互 | 只对 transform/opacity 做动画，禁用滤镜和混合模式；对局中 DOM ≤ 500、每块 ≤ 3 个节点、连线只用一个 SVG；HUD 只在数值变化时更新 | Rendering |
| TR-ui-interaction-005 | ui-interaction.md | 界面与交互 | 两套字（MVP 都用系统黑体栈）、锁定 `text-size-adjust: 100%`、`color-scheme: light`、跟随“减弱动态效果” | UI |
| TR-ui-interaction-006 | ui-interaction.md | 界面与交互 | 可见性、横竖屏、返回键转成调用交给对局流程；喊字位排队规则（跟令牌的优先） | UI |

## System Layer Map

依赖只能往下走：上层可以调用下层，下层绝不引用上层。规则层（`src/rules/`、`src/core/`）不碰页面、不读时间、不取随机数，需要的平台能力都由上层注入。

```
┌───────────────────────────────────────────────────────────────────────┐
│ PRESENTATION  src/view/       界面与交互：画面、布局、输入换算、演出、喊字位 │
├───────────────────────────────────────────────────────────────────────┤
│ FEATURE       src/rules/      战场压力 · 武将技能 · 选将 · 进度三星存档（逻辑部分） │
│               src/data/       回目编排与难度：数据文件 + 加载校验            │
├───────────────────────────────────────────────────────────────────────┤
│ CORE          src/rules/      对局流程与时钟 · 清除效果与连斩               │
├───────────────────────────────────────────────────────────────────────┤
│ FOUNDATION    src/rules/board-link.mjs  盘面与连通                        │
│               src/core/       随机流（hash32、四条流）、开发断言、常量表      │
│               src/app/        主循环（唯一的 rAF）、画面状态机、构建参数      │
│               src/platform/   存储适配、可见性 / 横竖屏 / 返回键转接          │
├───────────────────────────────────────────────────────────────────────┤
│ PLATFORM      小红书 WebView：DOM、Pointer Events、rAF、localStorage（不是本项目的代码） │
└───────────────────────────────────────────────────────────────────────┘
```

分层与设计文档一致：盘面与连通标的是 Foundation，对局流程、清除效果标的是 Core，战场压力、武将技能、选将、回目编排、进度标的是 Feature，界面标的是 Presentation。多出来的 `src/core/`、`src/app/`、`src/platform/` 不对应任何设计文档系统，是承接平台和整体运转的基础代码。

**装配根是例外**：`src/main.mjs`、`src/app/`、`src/platform/lifecycle.mjs` 负责把各层接起来（建 round、建界面、把平台事件转成调用），所以会引用上层。它们只做装配和转接，不含规则；“下层不引用上层”约束的是 `src/core/`、`src/rules/`、`src/data/` 和 `src/platform/storage.mjs`。

## Module Ownership

| 模块 | 独占的状态 | 对外提供 | 谁用 |
|---|---|---|---|
| `src/rules/board-link.mjs` | 格子、选中、赵云待命、四条随机流 | 点击 → 结果数据；修改接口；查询接口（board-link 规则 11、14） | 对局流程、清除效果、战场压力、武将技能；界面只读 |
| `src/rules/round-flow.mjs` | 一回的状态、`gameTime`、令牌集合、覆盖卡计时、事件出口（`attempt` 计数归 `src/app/screens.mjs`，见 ADR-0002） | `frame(dtReal)`、`acquire`/`release`/`dispatch`、可见性和暂停的入口、查询 | 主循环；各规则系统申请令牌；界面读状态 |
| `src/rules/clear-effects.mjs` | 连斩计数、窗口、效果待结算、打断额度 | `onMatch`、查询（连斩数、预告目标） | 对局流程；界面只读 |
| `src/rules/battle-pressure.mjs` | 压境波次表与倒计时、粮数、敌将血量与蓄力、心 | `onMatch`/`onMiss`/`onClear`/`tick`/`outcome`/`metrics`/`hud`；张飞用的接口 | 对局流程、武将技能；界面读 `hud()` |
| `src/rules/general-skills.mjs` | 每位武将的蓄力、待命、释放次数 | `onMatch`、`tapCard(id)`、`cards()` | 对局流程；界面 |
| `src/rules/general-loadout.mjs` | 槽位（主将锁定 + 副将）、推荐阵容；已解锁武将由各回 `wins` 推出，不另存 | `slots`、`lead`、`recommend`、`unlock`/`starters`、`showPicker`、`available`；开讲时把定下的阵容交给武将技能 | 对局流程（水牌点将走覆盖卡按钮意图）；界面读槽位；写档的 `loadout` 经 `progress.settle` |
| `src/rules/progress-save.mjs` | 内存进度、存储状态（正常 / 只读 / 仅内存）、待显示的提示 | `boot()`、`settle(RoundResult)`、书目查询、`nextNotice()` | 对局流程；界面 |
| `src/data/chapters.mjs` + `src/rules/chapter-loader.mjs` | 静态数据（无运行状态） | `loadChapters(data, flags)` → 能加载的回目、警告清单 | 启动流程；所有规则系统读参数 |
| `src/core/rng.mjs` | 无（纯函数） | `hash32(...parts)`、`createStream(seed, name)` | 盘面、对局流程 |
| `src/app/main-loop.mjs` | 上一帧时间戳、输入队列 | 启动、每帧驱动 | 页面入口 |
| `src/platform/storage.mjs` | 无 | 存储端口 `read/write/remove`（异常照抛） | 只由 `progress-save` 经注入使用 |
| `src/view/*.mjs` | 只有演出用的临时状态（动画、喊字排队、档位停留） | 渲染、输入换算 | 主循环 |

**界面不持有任何规则状态**（ui-interaction Overview）：盘面、时钟、压力、蓄力都从规则模块的查询读出来。

## Data Flow

**一帧**（ADR-0002 定义，顺序以 round-flow 规则 6.7 为准）：

```
rAF(now) ─► main-loop: dtReal = now − last
   │
   ├─► round-flow.frame(dtReal, inputQueue)
   │      ① 隐式后台判断
   │      ② 逐个处理点击：board.tap → match/miss → effects → skills → pressure → 出口
   │           effects 连斩达标 → pressure.comboReward()；武将牌 → skills.tapCard → acquire(skill)
   │         每次点击后：结算点（outcome() → ensurePlayable()）
   │      ③ 令牌计时，到点通知持有者 → 持有者改盘面 → dispatch(clear…) → 出口
   │           skill 到点：关羽 / 诸葛亮改盘面；张飞调用 pressure.scareNextPush / addFood / resetCharge
   │      ④ 无令牌时 gameTime += dtGame；pressure.tick(dtGame) → push/hostAttack 直接进出口
   │      ⑤ 结算点
   │
   └─► view.render(round.drainEvents(), 查询接口)   只读，按事件播演出、按查询更新 HUD
```

**一回的生命周期**：书目（读 `progress` 查询）→ 开讲水牌（`chapters` 数据；点将区读写 `general-loadout`，点“开讲”时定下 `loadout` 交给武将技能）→ 对局（上面的每帧循环）→ 结束（`progress.settle(RoundResult)` 当场写档 → `SettleOutcome`）→ 收尾演出 → `endingDone()` → 结算卡 → 下一回 / 再来一回 / 书目。

**输入**：指针事件在到达时由界面换算成意图（格子坐标、武将 id、按钮），进入输入队列，在下一帧第 ② 步按到达顺序处理。可见性、横竖屏、返回键不排队，直接调用对局流程的入口（页面进后台后 rAF 会停，不能等下一帧）。

## API Boundaries

接口名一律沿用设计文档里的名字（round-flow 规则 4、6，board-link 规则 11、14，battle-pressure 的 `hud()`/`metrics()`/`outcome()`，progress-save 规则 5）。决策记录只补设计文档没定的部分：

- 规则模块之间：直接同步调用，顺序由对局流程固定（ADR-0003）。
- 规则 → 界面：每帧一次的事件出口 `drainEvents()`，加只读查询（ADR-0003）。
- 界面 → 规则：输入队列和生命周期入口（ADR-0003）。
- 规则 → 平台：只通过注入的端口（存储端口、`salt`、开发参数），规则层自己不碰 `window`（ADR-0001、ADR-0004）。

## ADR Audit

| ADR | Engine Compat | Version | GDD Linkage | Conflicts | Valid |
|-----|--------------|---------|-------------|-----------|-------|
| ADR-0001: 不用引擎，原生 H5 与单文件发布 | ✅（无引擎，写明平台） | ✅（平台参考，版本待探测） | ✅ | 无 | ⚠️ Proposed |
| ADR-0002: 主循环、对局时钟与确定性 | ✅ | ✅ | ✅ | v1 与 ADR-0003 装配成环、覆盖卡计时无归属 → 已修 | ⚠️ Proposed |
| ADR-0003: 规则层与界面层的通道，DOM + SVG 渲染 | ✅ | ✅ | ✅ | v1 事件字段与 battle-pressure 规则 5 不一致 → 已修 | ⚠️ Proposed |
| ADR-0004: 本机存档 | ✅ | ✅ | ✅ | 无 | ⚠️ Proposed，待平台探测核实 |

v1 写这张表时自评“无冲突”，独立审查（`docs/architecture/architecture-review-2026-10-27.md`）找出 3 处。v2 修好了这 3 处，但复核又发现 v2 的修改带进了新问题（其中一处会让暂停卡的按钮永远点不动），v3 已修（ADR-0002 第 2、3 节）。4 份都还没被接受。

**Traceability**：以 `docs/architecture/requirements-traceability.md` 为准。审查时 50 条需求：39 条有决策记录覆盖（都还是 Proposed）、11 条部分覆盖、0 条缺口；Foundation 层没有缺口。

## Required ADRs

**Must have before coding starts (Foundation & Core decisions):**
- ADR-0001 不用引擎，原生 H5 与单文件发布 — 已写（Proposed）
- ADR-0002 主循环、对局时钟与确定性（画面切换、帧顺序、令牌、随机流）— 已写（Proposed）
- ADR-0003 规则层与界面层的通道，DOM + SVG 渲染（事件、输入、渲染）— 已写（Proposed）
- ADR-0004 本机存档（localStorage）— 已写（Proposed，待探测核实）

**Should have before the relevant system is built:**
- 毛笔体的选型、子集化和加载（等用户同意下载字体后再写；MVP 用系统黑体，不需要它）
- 如果探测显示能多文件：发布包拆分字体文件（会取代 ADR-0001 的一部分）

**Can defer to implementation:**
- 连线飞白的 dasharray 取值、泼墨三帧的切换方式（美术圣经第 8 节已定原则）
- 开发版帧率计的显示方式

## Performance Budgets

用户 2026-10-27 把美术圣经第 8 节的建议值定为正式预算（`project.yaml` 里有键的写在那里，其余在这里）。运行时的预算超了只警告（`performance.enforce: warn`），真机测过后可以再调。**发布包 2 MB 不同**：它是用户的硬约束，不是性能预算，构建脚本超了直接失败。

| 项 | 预算 | 怎么量 |
|---|---|---|
| 发布包 | ≤ 2,000,000 字节（解压后原始字节） | 构建脚本，超了构建失败（ADR-0001） |
| 帧率 | 对局 60 fps，P95 帧时 ≤ 20 ms；高潮动画 ≥ 30 fps，无 > 100 ms 卡顿 | 开发版 rAF 帧率计，基准机实测 |
| 每帧规则计算 | ≤ 2 ms（基准机；死局洗牌那一帧例外，见 ADR-0002） | 开发版计时；Node 里跑压力测试做粗估 |
| 每帧界面计算 | ≤ 4 ms（基准机，不含浏览器的布局和绘制） | 开发版计时 |
| 点击到反馈 | ≤ 100 ms | 同上 |
| 开局发牌 | ≤ 200 ms | 同上 |
| 冷启动到显示水牌 | ≤ 2 秒 | 基准机实测 |
| DOM | 对局中可见 ≤ 500 个节点，整页 ≤ 1000，每块 ≤ 3 个 | 开发版断言 |
| 同时动的元素 | 常态 ≤ 12，高潮 ≤ 24；常驻循环动画 ≤ 2；`will-change` ≤ 6；全屏合成层 ≤ 3 | 代码审查 + 开发版计数 |

## Architecture Principles

1. **规则是纯数据进、纯数据出**：`src/rules/`、`src/core/` 不碰页面、不读时间、不取随机数，全部能在 Node 里直接测（coding-standards“所有公开方法可单元测试”）。
2. **时间只有一只表**：带时间的规则只读 `gameTime`；演出时长按前台真实时间计在令牌上；界面从不自己决定规则上的“演出什么时候结束”。唯一例外是收尾演出后的 `endingDone()`：那时胜负、星级、存档都已定，见 ADR-0002 第 2 节。
3. **谁先谁后只规定一次**：同一次点击的结算顺序只在对局流程里写死，规则模块之间不互相订阅。
4. **发布包不依赖未核实的平台能力**：单文件、不 `fetch`、不联网、ES2017；探测结果回来以后只会放宽，不会推翻。
5. **数值和文字都是数据**：回目参数、阈值、台词、规则句都在 `src/data/`，代码里只有设计文档 Tuning Knobs 表的缺省常量，集中在 `src/core/constants.mjs`。

## Open Questions

| ID | 问题 | 优先级 | 解决途径 |
|---|---|---|---|
| OQ-1 | 小红书 WebView 的存储是否持久、来源是否随发版变化、生命周期事件和返回键来不来、能否多文件；宿主是否放大字号、强制深色，安全区多大 | High | 平台探测结果 → 更新 `web-h5/VERSION.md`，必要时修订 ADR-0004、ADR-0001 |
| OQ-2 | 毛笔体选哪一款、授权、子集体积 | Medium | 用户同意下载后实测；新写一份决策记录 |
| OQ-3 | 667 高的小屏整体缩放后格距约 47 px，低于美术圣经的 52 | Medium | 真机核实（ui-interaction 规则 5，门禁已接受的风险） |
| OQ-4 | 千元安卓机的 WebView 内核版本，ES2017 基线是否够保守 | Medium | 探测结果里的 `userAgent` |
| OQ-5 | 音效不在 MVP；如果要做，2 MB 预算里另外分 | Low | Full Vision 再定 |
