# ADR-0001: 不用引擎，原生 H5 与单文件发布

## Status

Accepted（用户 2026-10-27 接受）

> **Who may move this to `Accepted`: the user, or `technical-director` on the
> user's explicit confirmation. No other agent, and no skill on its own.**

## Date

2026-10-27（2026-10-30 修订，见文末修订记录）

## Last Verified

2026-10-27

## Decision Makers

用户（硬约束：小红书小工具、离线 H5、≤ 2 MB、发布包不用第三方库；2026-10-26 决定“不用引擎写进配置和决策记录”）；主会话起草。

## Summary

游戏要在小红书“小工具”的 WebView 里离线运行，包体 ≤ 2 MB、不能带第三方库，三个受支持的引擎都不适合。决定用原生 HTML/CSS/JS（ES2017）写，开发时按 ES 模块拆文件、规则代码用 Node 自带的 `node:test` 测试，发布时用只依赖 Node 自带功能的构建脚本打成**一个 HTML 文件**，并在构建时去掉调试参数、检查体积和禁用写法。

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | 无引擎 — 原生 H5（ES2017），目标运行环境：小红书“小工具”WebView（版本未知） |
| **Domain** | Core |
| **Layer** | Foundation |
| **Knowledge Risk** | HIGH（平台行为未知；通用 Web 标准本身为 LOW） |
| **References Consulted** | `docs/engine-reference/web-h5/VERSION.md`；`design/art/art-bible.md` 第 8 节；`tools/platform-probe/README.md` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | 平台探测：`protocol`、`moduleScript`、`extraScript`、`fetchJson`、`userAgent`。单文件发布包在真机上能打开、能玩完一回 |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | None |
| **Enables** | ADR-0002、ADR-0003、ADR-0004（都建立在这里定的目录、模块规则和构建方式上） |
| **Blocks** | 所有实现类史诗和故事（代码根目录、测试方式、发布方式都由本条决定） |
| **Ordering Note** | 平台探测结果回来后复查一次；若能多文件，只会放宽（比如单独的字体文件），由新的决策记录取代相应部分 |

## Context

### Problem Statement

模板假定项目用 Godot、Unity 或 Unreal。本项目的发布目标是一个离线 H5 小工具：2 MB 的包装不下任何一个引擎的网页运行时，用户也明确不用引擎、不带第三方库。需要定下：代码怎么组织、怎么测试、怎么打包，以及在平台能力没核实之前怎样保证发布包能跑。

### Current State

只有概念阶段的 7 个一次性原型（`prototypes/*/prototype.html`，单文件、规则和页面混在一起），正式代码一行没写。原型永远不进正式版。

### Constraints

- 发布包 ≤ 2,000,000 字节（解压后原始字节，美术圣经第 8 节最严口径）。
- 发布包里不能有第三方库、框架、CDN，不能联网。
- 开发时只能用本机已有的 Node 24 自带功能，不安装任何包。
- WebView 内核版本未知，可能是很旧的安卓系统 WebView；不能用转译器（转译器是第三方库）。
- 能不能多文件、能不能 `fetch`、能不能用模块脚本，都要等探测结果。

### Requirements

- 规则代码能脱离页面单独测试（coding-standards：公开方法可单元测试；board-link、round-flow 的实现备注）。
- 数值和文字都在数据里，不写死在逻辑中（coding-standards：gameplay values data-driven）。
- 开发版和 MVP 测试包能读网址参数 `seed`、`slow`（开发版另加 `ch`），正式包一个都不读（chapter-design 规则 14、round-flow 规则 12）。
- 开发断言在正式包里不生效（board-link 规则 8、round-flow 规则 8）。

## Decision

**1. 语言和基线**：原生 JavaScript，语法基线 ES2017。不用 ES2020 起的语法（`?.`、`??`、`BigInt`、`globalThis`）。CSS 不用嵌套语法、`:has()`、容器查询。

**2. 目录**（代码根目录 `src/`，与 `.claude/docs/directory-structure.md` 的 Godot 行一致）：

```
src/
  index.html          开发入口：<script type="module" src="./main.mjs">
  main.mjs            组装：读构建参数 → 加载回目 → 启动存档 → 启动主循环
  core/               纯函数：rng.mjs、constants.mjs（Tuning Knobs 缺省值）、assert.mjs
  rules/              规则层，一份设计文档一个文件：board-link.mjs、round-flow.mjs、
                      clear-effects.mjs、battle-pressure.mjs、general-skills.mjs、
                      progress-save.mjs、chapter-loader.mjs
  data/               chapters.mjs（回目、敌将、文字：只有 export const 数据）
  app/                main-loop.mjs、screens.mjs、build-flags.mjs（三种构建各一份实现）
  platform/           storage.mjs、lifecycle.mjs（只有这里碰 localStorage 和生命周期事件）
  view/               界面层：layout、board-view、hud、cards、shouts、input 等
  assets/             sprite.svg（<symbol> 合集）、styles.css
tests/
  unit/<system>/      *.test.mjs，直接 import src/rules、src/core
  integration/<system>/
tools/
  dev-server.mjs      node:http 静态服务（模块脚本在 file:// 下不能加载）
  build/build.mjs     打包与检查
  platform-probe/     平台探测页（已有）
dist/                 构建产物，不进版本库
```

**3. 模块规则**（构建脚本靠这些规则工作，违反就构建失败）：
- 只用静态的具名导入导出：`import { a, b } from './x.mjs'`、`export function`、`export const`、`export class`。
- 不用默认导出、`export *`、`import * as`、动态 `import()`；导入路径只能是以 `./` 或 `../` 开头的相对路径，带 `.mjs` 后缀。
- `src/rules/`、`src/core/` 不许引用 `src/view/`、`src/app/`、`src/platform/`，也不许出现 `document`、`window`、`localStorage`、`Date.now()`、`performance.now()`、`Math.random()`（时间、随机和存储都由上层注入，见 ADR-0002、ADR-0004）。

**4. 构建**（`node tools/build/build.mjs <test|release>`，只用 `node:fs`、`node:path`）：
- 从 `src/main.mjs` 出发收集模块图，按依赖顺序把每个模块包成一个函数作用域：导入改写成从模块表里解构，导出改写成函数的返回值。整个程序放进一个普通 `<script>`，不是模块脚本。
- `src/app/build-flags.mjs` 换成对应构建的实现：`test` 读 `seed`、`slow`；`release` 什么都不读、`DEV = false`。开发时不打包，直接用 `src/` 下的原文件（读 `seed`、`slow`、`ch`）。
- 正式包去掉开发断言：`assert.mjs` 的 `devAssert` 在 `release` 里换成空函数。
- CSS、SVG 合集、数据全部内联进 `dist/<build>/index.html`，输出**一个文件**。
- 检查，第 1–7 项任一不过就构建失败：
  1. 总字节 > 2,000,000；
  2. CSS 里出现 `filter`、`backdrop-filter`、`mix-blend-mode`，SVG 里出现 `<filter`；
  3. JS 里出现 `eval(`、`new Function`、`import(`、`fetch(`、`XMLHttpRequest`、`WebSocket`、`navigator.sendBeacon`；
  4. 规则层文件里出现上面“模块规则”第 3 条禁止的全局对象（与 `tests/integration/architecture/rules-layer-purity.test.mjs` 用同一个检查器）；
  5. 超出 ES2017 的写法（去掉注释和字符串后查）：`?.`、`??`（含 `??=`）、`||=`、`&&=`、`catch {`（不带参数的 catch）、`.finally(`、`Promise.allSettled`、`Object.fromEntries`、`Object.hasOwn`、`.flat(`、`.flatMap(`、`.findLast(`、`trimStart`、`trimEnd`、`globalThis`、`BigInt`、`matchAll`、`replaceAll`、`.at(`、`for await`、`this.#`（私有字段）、数字分隔符（**以数字开头**的数字字面量里出现 `_`，如 `1_000`；`cell_1_2` 这类变量名不算）、正则里的 `(?<`；
  6. 动画写到了布局属性：`transition-property` 的取值、`transition` 简写里的属性名、`@keyframes` 块里的**属性名**（冒号左边）出现 `left`、`top`、`right`、`bottom`、`width`、`height`、`font-size`、`all`。只查属性名，不查取值，`transform-origin: top left` 这类不算；
  7. 源文件和数据里出现 emoji（Unicode `Extended_Pictographic`，但放过 ©、®、™ 三个字符，字体授权文本里会有）。
  - 只警告、不失败：`will-change` 超过 6 处（数的是声明处，实际同时生效的个数靠代码审查）；代码部分（HTML、CSS、JS）超过 160 KB（美术圣经第 8 节的分配）。
  - 查不了、只靠代码审查的：对象展开和剩余（`{...a}`，ES2018；和数组展开分不开）、类里的字段声明（ES2022）、正则的 `s` 标志、同时动的元素个数。
- MVP 发布包**不去注释、不压缩**：自己写的切分器认不出正则字面量（`/[/*]/` 会被当成注释开头），去注释可能只在发布包里把代码删坏；2 MB 里余量充足（美术圣经第 8 节估 818 KB），代码超过 160 KB 只警告。以后真要压缩，先给切分器补上正则字面量和多行模板字符串，再写新的决策记录。
- 打包后用 `node:vm` 的 `new vm.Script(code)` 编译一遍整个脚本，有语法错误就构建失败（Node 自带，查的是打包脚本自己有没有拼错）。
- 打印分类体积表（代码 / 数据 / 图形），对照美术圣经第 8 节的预算分配。

**5. 测试**：`node --test "tests/**/*.test.mjs"`（已写进 `project.yaml` 的 `commands.test`）。测试直接 import 规则模块，用假的 `dtReal`、假的存储端口、固定的种子，不碰页面。

**6. 开发运行**：`node tools/dev-server.mjs` 在 `127.0.0.1` 起一个静态服务，浏览器打开 `src/index.html`；页面上的东西改完直接刷新。

### Architecture Diagram

```
开发：  src/*.mjs ──(浏览器模块加载)──► 浏览器        src/rules + src/core ──► node:test
发布：  src/*.mjs ──build.mjs──► 改写成函数作用域 ──► 内联 CSS/SVG/数据 ──► dist/release/index.html（单文件）
                                    └─ 检查：体积、禁用写法、规则层纯净度
```

### Key Interfaces

```
// src/app/build-flags.mjs（三种实现，同样的导出）
export const BUILD = 'dev' | 'test' | 'release'
export const DEV = boolean              // 开发断言和日志是否生效
export function readUrlFlags(search)    // → { seed: int|null, slow: boolean, ch: string|null }
                                        //   release 永远返回 { seed: null, slow: false, ch: null }

// src/core/assert.mjs
export function devAssert(cond, message)  // DEV 时抛错；release 里是空函数
export function devWarn(message)          // DEV 时 console.warn
```

### Implementation Guidelines

- 必须：每个规则模块导出工厂函数（如 `createBoard(config, deps)`），依赖从参数传入，不用模块级的可变单例。
- 必须：Tuning Knobs 表里的缺省值集中在 `src/core/constants.mjs`，名字与设计文档一致（`MAX_STEP_MS`、`CARD_GUARD_MS` 等）；回目能覆盖的值从回目数据读。
- 必须：兵种表（board-link 规则 2 的 12 个 id，按固定顺序）、层叠上限 `STACK_DEPTH = 1`（board-link 规则 1）、槽位上限 `SLOT_MAX = 3`（general-loadout）、武将 id 表也放在 `src/core/constants.mjs`，盘面、回目加载器和 `rng.pickWeighted` 共用这一份；任何按兵种遍历的地方都按这张表的顺序，不按对象的键序。
- 必须：盘宽不写死。每回的盘宽来自回目字段 `cols`（5 或 6，缺省 6；正式版默认按 5 列编排，board-link 规则 1），由回目加载器校验后交给盘面和界面；规则层和 `computeLayout` 都从回目读，不用常量。
- 必须：每个公开函数写文档注释（coding-standards）。
- 绝不：在发布包里引入任何第三方代码，包括“复制进来的一小段”。
- 绝不：在 `src/rules/`、`src/core/` 里引用页面、时间、随机或存储。
- 绝不：写依赖模块脚本、多文件或 `fetch` 才能运行的发布逻辑（探测结果回来前）。

## Alternatives Considered

### Alternative 1: 用 Godot 导出网页版
- **Description**: 按模板默认路线，用 Godot 4 做，导出 Web。
- **Pros**: 模板的技能、代理、测试流程全部现成可用。
- **Cons**: 网页运行时本身就远超 2 MB；需要 WebAssembly 和较新的 WebView；离线小工具里能否运行未知。
- **Rejection Reason**: 违反 ≤ 2 MB 和“不用引擎”两条硬约束。

### Alternative 2: 用一个小型网页游戏框架（Phaser、PixiJS 之类）
- **Description**: 用现成的 2D 渲染框架，打包进发布包。
- **Pros**: 动画、精灵、输入都现成。
- **Cons**: 发布包里有第三方库（违反硬约束）；体积几百 KB 起；Canvas 渲染下中文系统字体的清晰度和换行要自己处理。
- **Rejection Reason**: 违反“发布包不用第三方库”。

### Alternative 3: 不分模块，直接写一个大 HTML（像原型那样）
- **Description**: 所有代码写在一个文件里，不需要构建。
- **Pros**: 零构建，直接打开就能跑。
- **Cons**: 规则和页面混在一起，不能用 Node 单独测试；原型已经证明这样改到第 7 版就很难维护（美术圣经指出的 `renderSkills` 整块重写问题）。
- **Rejection Reason**: 不满足“规则可单元测试”，也撑不起 8 个系统的规模。

### Alternative 4: 开发时用经典脚本加全局命名空间，不打包
- **Description**: 每个文件往 `window.PSLK` 上挂东西，`<script>` 按顺序引入。
- **Pros**: 不需要构建脚本。
- **Cons**: Node 测试要额外模拟全局对象；多文件依赖平台支持多个脚本文件（未核实）；加载顺序靠手排。
- **Rejection Reason**: 依赖未核实的多文件能力，测试也更绕。

## Consequences

### Positive
- 规则层可以在 Node 里直接测，不需要浏览器。
- 发布包是一个文件，探测结果是什么都能运行（除非平台连单个 HTML 都不让跑，那就整个项目都要重议）。
- 构建检查把美术圣经第 8 节的禁用清单和 2 MB 预算变成了自动的门槛。

### Negative
- 要自己写并维护一个小打包脚本（约 150 行），只支持受限的导入导出写法。
- 不能用新语法和转译，写代码时要守 ES2017。
- 单文件里图片和字体只能内联：毛笔体如果 base64 内嵌，体积按 1.34 倍记账（美术圣经第 8 节）。

### Neutral
- 模板里的引擎专家代理、引擎参考库、引擎相关检查都不适用，相关技能按“不适用”处理并记录原因。

## Risks

- **平台连单个本地 HTML 都有限制**（比如只允许上传特定格式）：探测页的上传过程本身就会暴露；那时整个发布方式要重议。
- **打包脚本出错导致发布包和开发版行为不一致**：集成测试里加一条“用打包后的脚本在 Node 的 `vm` 里跑一遍规则层的冒烟流程”；每次发布前在真机上打开发布包玩一回。
- **ES2017 仍然太新**（极旧的内核）：`userAgent` 结果回来后复查；必要时把基线降到 ES2015，并在构建检查里加上对应的禁用语法。

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| board-link.md | 规则函数只接收数据、返回数据，不读写页面元素，可以用 Node 自带的测试框架直接测试（Dependencies 实现备注） | 规则层纯净规则 + `node:test` + 构建检查第 4 条（TR-board-link-007） |
| board-link.md | 规则 1、2：`cols` 列（5 或 6，回目给出）可玩格加外圈，每格两层（`STACK_DEPTH = 1`）；12 种兵 id 固定、顺序固定 | 兵种表和 `STACK_DEPTH` 集中在 `src/core/constants.mjs`，按表的顺序遍历；盘宽从回目的 `cols` 读（TR-board-link-001） |
| board-link.md | 不变量 I1：开发版报错，正式版拒绝修改并写日志（规则 8） | `devAssert` 在开发和测试构建生效、正式构建为空函数；拒绝逻辑本身保留（TR-board-link-005） |
| round-flow.md | 状态机和时钟只做计算，不读写页面元素，测试时可以直接喂假的 `dtReal`（Dependencies 实现备注） | 规则层不读时间，`dtReal` 由主循环传入（TR-round-flow-001） |
| round-flow.md | `seed=N` 只在开发版和 MVP 测试包读取（规则 12） | `build-flags.mjs` 三种实现（TR-round-flow-008） |
| chapter-design.md | 回目数据格式与加载检查；`slow`/`seed`/`ch` 参数分构建读取（规则 1–9、14） | 数据放在 `src/data/chapters.mjs`，加载器在 `src/rules/chapter-loader.mjs`；参数由 `readUrlFlags` 按构建读取（TR-chapter-design-001、-002） |
| progress-save.md | 不收集、不上传任何数据；不联网（规则 20） | 构建检查第 3 条禁止一切网络 API（TR-progress-save-005） |
| ui-interaction.md | 包体 ≤ 2 MB；不用 emoji，图标全部内联 SVG（Overview、规则 34） | 构建检查第 1、7 条；SVG 合集内联（TR-ui-interaction-008）。注（2026-10-30）：垂直切片改用了内嵌的位图头像和兵图标（data URI）。这条要不要改，等美术圣经按位图修订时再定；在那之前本条决策不变 |
| ui-interaction.md | 只对 transform/opacity 做动画，禁用滤镜和混合模式（规则 31） | 构建检查第 2、6 条（TR-ui-interaction-004） |

## Performance Implications
- **CPU**: 打包后的函数作用域包装没有可测量的运行时开销。
- **Memory**: 单文件一次载入；整个包 ≤ 2 MB。
- **Load Time**: 单文件不需要额外请求；冷启动到水牌 ≤ 2 秒的预算主要看 SVG 和字体解析，由 ADR-0003 和美术圣经约束。
- **Network**: 无（发布包禁止联网）。

## Migration Plan

没有现成代码要迁移。原型不迁移、不复用代码，只复用其中被验证过的规则（已写进设计文档）。

## Validation Criteria

- `node --test "tests/**/*.test.mjs"` 能跑通示例测试（技术准备阶段）。
- 第一个可玩版本：`dist/release/index.html` 单文件 ≤ 2,000,000 字节，构建检查全部通过，在基准安卓机和 iPhone 上打开能玩完一回。
- 平台探测结果回来后，本条的 Verification Required 逐项有结论。

## Related

- ADR-0002（主循环和确定性：时间、随机由上层注入的具体做法）
- ADR-0003（规则层与界面层的通道）
- ADR-0004（存储端口）
- `docs/architecture/architecture.md`、`docs/engine-reference/web-h5/VERSION.md`
- `design/art/art-bible.md` 第 8 节（体积预算和禁用写法的出处）

## Revision History

- 2026-10-30：并入切片第四至六版和选将（见 `docs/architecture/change-impact-2026-10-30-slice-merge.md`），决策不变。
