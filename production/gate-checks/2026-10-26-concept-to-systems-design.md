## Gate Check: Concept → Systems Design

**Date**: 2026-10-26
**Checked by**: gate-check skill（workflow: standard · review_mode: lean · qa.level: standard · team.size: individual）

### Required Artifacts: 1/1 present
- [x] `design/gdd/game-concept.md`：存在，18.7 KB，没有模板占位

**Recommended（standard 档下由必需降为推荐）：3/3**
- [x] 游戏支柱：5 条，另有反支柱（概念文档“## Game Pillars”）
- [x] 视觉锚点：在概念文档“## Visual Identity Anchor”，已由 `design/art/art-bible.md` 展开为 9 节
- [x] 概念原型结论为 PROCEED：`prototypes/wujiang-concept/REPORT.md`，迭代链见 `prototypes/index.md`

**`artifact-check.sh --phase concept` 的观测（不影响结论）**
- `engine-setup` 标为 required，状态 ABSENT：流程目录把它放在概念阶段，但本门的清单里没有这一项；本项目按用户的硬约束不用引擎（纯 HTML/CSS/JS 离线 H5）
- `map-systems` 标为 required，状态 ABSENT：这是下一阶段的第一步，不在本门清单里
- NO_CHECK 2 项：`brainstorm`（概念文档在，视为做过）、`design-review-concept`（已手动核对审查记录）

### Quality Checks: 4/4 passing
- [x] 概念已审查，结论不是 MAJOR REVISION NEEDED：`design/gdd/reviews/game-concept-review-log.md`，结论 NEEDS REVISION（lean 模式，审查者就是作者）；4 项阻塞已改，**改后没有复审**
- [x] 核心循环有描述（“## Core Loop”，四个时间尺度）
- [x] 目标人群明确（“## Target Player Profile”）
- [x] 视觉锚点有一句话规则，以及 3 条支撑原则

### Director Panel Assessment（2 of 4，`workflow: standard`，来源 `rigor:standard`）

Technical Director: **CONCERNS**
  技术上可以进入系统设计。7 个单文件 HTML 原型（合计约 157 KB，最大 34 KB）已经在浏览器里实现了全部核心机制；按第 8 节的上限算，2 MB 余量 818 KB。列出 6 条要在系统设计阶段回答的风险（见下文 Recommendations 1、2、5、6、7、8）。

Producer: **CONCERNS**
  本门要求、推荐的东西都在。排期基线过时：重估 37–69 个工作日（约 7.5–14 周，中位 10–11 周），是原估“约 6 周”的 1.5–2 倍，置信度低。最大的风险是方向：目标人群一个都没试过。

Creative 和 Art 两个视角没有参与。要请齐四位，把 `modes.rigor` 调到 `full`（或单独设 `modes.workflow: full`）。

### Blockers
无。

### Recommendations（在系统设计阶段解决，最晚在 Systems Design → Technical Setup 那道门之前）
1. **定下“不用引擎”的路径**（TD）。模板后面的 `/create-architecture`、`/test-setup`，以及 Technical Setup → Pre-Production 门在 standard 档都要求已选引擎。建议在 `project.yaml` 写明“不用引擎（原生网页）”，再写一条决策记录，定下代码根、测试根和测试工具；之后门里和引擎有关的项，按“不适用”记录理由。
2. **核实小红书“小工具”的平台约束**（TD、PR）：能不能放多个文件、2 MB 的计算口径、WebView 内核和版本、本地存储会不会被清、能不能远程调试、分发机制。做一个几 KB 的探测页，或者把原型实际上传一次。
3. **找目标人群试玩**（PR）：用 #7 原型，找 3–5 位五十岁以上的人、2–3 位上班族，默认档和慢速档（`?every=9000&charge=15000`）各玩一局。要在写“战场压力”和“难度曲线”两份 GDD 之前完成。
4. **重定排期**（PR）：推荐只承诺“MVP + 竖切片（8 回）”，20 回做不做看试玩结果；MVP 用占位美术。跑完 `/map-systems` 后用 `/estimate` 重估，结果回写到概念文档。
5. **存档当作基础系统来设计**（TD）：第一条关键 ADR。数据带版本号；存储不可用时有兜底；“进度码”方案要避开 0/O、1/l 这类易混字符。
6. **性能预算写进 `project.yaml`**（TD），尽早在基准机上实测。
7. **把“盘面永远消得完”写成可测的验收标准**（TD）：规则层可以脱离页面单独测试，发牌可以固定种子。还要确认“不用第三方库”只管发布包，还是连开发工具也管。
8. **毛笔体**（TD）：选定字体，从原始来源核实授权，切一个 100 字的子集实测体积。
9. **系统索引里登记两个待定项**（PR）：各模式的三星标准；连斩在压境和粮草模式里起什么作用。

### Verdict: CONCERNS
Chain-of-Verification: 5 questions checked（2 by tool: 重读概念文档确认没有占位；查审查记录的结论行）— verdict unchanged.

报告初稿时，用户先停下来写了试用小结。之后用户决定进入正式开发，明确接受了上面的风险。

### Accepted Risks
以下 9 条由用户接受，2026-10-26：
- 模板后面的步骤没有“不用引擎”的路径。用户选方案 A：配置里写明，再记一条决策记录，与引擎有关的检查按“不适用”处理
- 小红书“小工具”的平台约束还没核实（文件形态、2 MB 计算口径、内核、存储、调试、分发）
- 目标人群还没试玩，调参项暂时只代表开发者本人的手感
- 排期基线过时（重估为 37–69 工作日）
- 存档的设计依赖还没核实的存储行为
- 性能预算是建议值，没有真机数据
- “盘面永远消得完”还没写成可测的验收标准
- 毛笔字体没选、授权没核实、体积没实测
- 两个待定项（各模式的三星标准、连斩在压境和粮草模式里的作用）留到系统设计阶段

用户同时确定：“不用第三方库”只管发布包，开发时可以用本机已有的 Node 24 及其自带功能（不安装任何包）。

`project.stage` 推进为 **Systems Design**（2026-10-26）。
