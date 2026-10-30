# Systems Index: 评书连连看·三国

> **Status**: Approved（8 个 MVP 系统全部通过单独审查；跨文档总审 CONCERNS；门禁 2026-10-27 推进到 Technical Setup）
> **Created**: 2026-10-26
> **Last Updated**: 2026-10-27
> **Source Concept**: design/gdd/game-concept.md

---

## Overview

这是一款竖屏单指的离线 H5 连连看，核心循环是：消兵、给武将蓄力、在看得见的压力下决定何时放技能。机制的分量集中在三层：

- **盘面层**：连通判定、消除，以及“永远消得完”的不变量。
- **规则层**：兵种效果、连斩、三种战场压力、武将技能。
- **数据层**：回目编排，决定每一回打什么仗、谁出阵（支柱 3）。

界面与交互单独成一个系统，因为美术圣经第 7 节给它定下了硬约束：触控防误触、遮挡要和锁定输入同时出现同时消失、喊的字放在喊字位、不闪不震。

本项目**不用引擎**（纯 HTML/CSS/JS，≤ 2 MB，见 `project.yaml` 的说明），所以没有物理、相机、场景管理这类系统；“输入”并进了界面与交互。

各系统简述：

- **盘面与连通**：所有规则的地基。发牌（可以固定随机种子）、最多拐两个弯（可绕外圈）的路径判定、消除、死局洗牌，以及两条不变量：每种兵的数量始终是偶数；盘面没清空时至少有一对能连上。凡是会改动盘面的机制（效果、技能、压境、增兵）都必须遵守它们。
- **对局流程与时钟**：一回的状态机，依次是开讲 → 对局 → 结算。它持有唯一的“游戏时钟”：放台词、结算效果、切到后台时都暂停（UX 规则 R1、R5），并负责判定胜负。
- **清除效果与连斩**：火、马、水三种兵种效果，加上连斩判定。连斩在三种压力模式下各起什么作用，是门禁留下的待定项，在本系统里定。
- **战场压力**：敌军压境、粮草有限、敌将反击三种模式，共用一套“每帧推进、结算点查询胜负、结束时交出指标”的接口。这是挑战感的来源（体验排序第 1）。参数初值来自原型实测，只代表开发者本人的手感。
- **武将技能**：消对应的兵来蓄力，蓄满后点头像释放；四位武将各有技能，其中张飞在三种模式下效果不同；台词在释放时喊出。这是支柱 2“将在人为”的落点。
- **回目编排与难度**：每一回的数据，包括盘面大小、兵种组成、压力类型和参数、出阵武将、新登场的效果、回目标题、台词和预告。MVP 只做 3 回，而且四将全上（MVP 例外）。
- **进度、三星与存档**：三星标准（门禁留下的待定项，三种模式各定一套）、解锁进度（MVP 三回全开，竖切片起按故事解锁）、本地存档的版本与迁移、存储不可用时的兜底。“进度码”按用户决定放到竖切片（2026-10-26）。
- **界面与交互**：台眉、台面、桌沿的布局，开讲水牌，胜利和失败卡；触控规则（单点加四道防护）、喊字位、动效时长；依据美术圣经第 7 节。
- **教学引导**（竖切片）、**难度与无障碍选项**（Alpha）、**音效**和**图鉴**（完整版）放在后面。

---

## Systems Enumeration

| # | System Name | Category | Priority | Status | Design Doc | Depends On |
|---|-------------|----------|----------|--------|------------|------------|
| 1 | 盘面与连通 | Gameplay | MVP | Approved | design/gdd/board-link.md | — |
| 2 | 对局流程与时钟 (inferred) | Core | MVP | Approved | design/gdd/round-flow.md | 盘面与连通, 战场压力（只查询 outcome，见循环依赖）, 回目编排与难度（数据） |
| 3 | 清除效果与连斩 | Gameplay | MVP | Approved | design/gdd/clear-effects.md | 盘面与连通, 对局流程与时钟 |
| 4 | 战场压力 | Gameplay | MVP | Approved | design/gdd/battle-pressure.md | 盘面与连通, 对局流程与时钟, 清除效果与连斩 |
| 5 | 武将技能 | Gameplay | MVP | Approved | design/gdd/general-skills.md | 盘面与连通, 对局流程与时钟, 清除效果与连斩, 战场压力 |
| 6 | 回目编排与难度 | Progression | MVP | Approved | design/gdd/chapter-design.md | 盘面与连通, 清除效果与连斩, 战场压力, 武将技能 |
| 7 | 进度、三星与存档 | Persistence | MVP | Approved | design/gdd/progress-save.md | 对局流程与时钟, 战场压力, 回目编排与难度 |
| 8 | 界面与交互 (inferred) | UI | MVP | Approved | design/gdd/ui-interaction.md | 全部 MVP 系统 |
| 9 | 教学引导 (inferred) | Meta | Vertical Slice | Not Started | design/gdd/onboarding.md | 对局流程与时钟, 界面与交互, 回目编排与难度 |
| 10 | 难度与无障碍选项 (inferred) | Meta | Alpha | Not Started | design/gdd/accessibility-options.md | 战场压力, 界面与交互 |
| 11 | 音效 | Audio | Full Vision | Not Started | design/gdd/audio.md | 界面与交互 |
| 12 | 图鉴 | Progression | Full Vision | Not Started | design/gdd/codex.md | 进度、三星与存档, 武将技能 |
| 13 | 选将与解锁 | Progression | Vertical Slice | Draft | design/gdd/general-loadout.md | 武将技能, 回目编排与难度, 进度、三星与存档 |
| 14 | 成就 | Meta | Alpha | Not Started | design/gdd/achievements.md | 进度、三星与存档, 选将与解锁（奖励必须是确定的，支柱 5） |

---

## Categories

| Category | Description | Typical Systems |
|----------|-------------|-----------------|
| **Core** | Foundation systems everything depends on | 对局流程与时钟 |
| **Gameplay** | The systems that make the game fun | 盘面与连通、清除效果与连斩、战场压力、武将技能 |
| **Progression** | How the player grows over time | 回目编排与难度、图鉴 |
| **Persistence** | Save state and continuity | 进度、三星与存档 |
| **UI** | Player-facing information displays | 界面与交互 |
| **Audio** | Sound and music systems | 音效 |
| **Meta** | Systems outside the core game loop | 教学引导、难度与无障碍选项 |

不适用的类别：**Economy**（无货币、无掉落，见反支柱）、**Narrative**（故事只通过回目、预告、台词讲，台词作为数据并入“回目编排与难度”）。

---

## Priority Tiers

| Tier | Definition | Target Milestone | Design Urgency |
|------|------------|------------------|----------------|
| **MVP** | Required for the core loop to function. Without these, you can't test "is this fun?" | First playable prototype | Design FIRST |
| **Vertical Slice** | Required for one complete, polished area. Demonstrates the full experience. | Vertical slice / demo | Design SECOND |
| **Alpha** | All features present in rough form. Complete mechanical scope, placeholder content OK. | Alpha milestone | Design THIRD |
| **Full Vision** | Polish, edge cases, nice-to-haves, and content-complete features. | Beta / Release | Design as needed |

> **门禁带来的待定项**（`production/gate-checks/2026-10-26-concept-to-systems-design.md`）：(1) 三种模式各自的三星标准，在“进度、三星与存档”里定；(2) 连斩在压境模式和粮草模式里的作用，在“清除效果与连斩”里定。
>
> **lean 模式跳过的评审**：TD-SYSTEM-BOUNDARY、PR-SCOPE、CD-SYSTEMS 都没有运行。系统边界、范围和创意方向这三项，本索引没有经过总监评审。

---

## Dependency Map

### Foundation Layer (no dependencies)

1. 盘面与连通：每条规则都要读写盘面，“永远消得完”的不变量也在这里定义。

### Core Layer (depends on foundation)

1. 对局流程与时钟：依赖盘面与连通（判断盘面是否清空、是否死局）。
2. 清除效果与连斩：依赖盘面与连通（效果按兵种整类清除，连斩挂在每一次消除上）、对局流程与时钟（游戏时钟、`effect` 令牌、通知顺序）。

### Feature Layer (depends on core)

1. 战场压力：依赖盘面与连通（压境要推行、敌将要增兵）、对局流程与时钟（时钟和判负）、清除效果与连斩（连斩能打断敌将蓄力）。
2. 武将技能：依赖盘面与连通（斩一排、清一种兵）、对局流程与时钟（放技能时暂停）、清除效果与连斩（靠消除来蓄力）、战场压力（张飞的技能改的是压力）。
3. 回目编排与难度：依赖盘面与连通（兵种组成）、清除效果与连斩（新效果什么时候登场）、战场压力（参数）、武将技能（谁出阵）。
4. 进度、三星与存档：依赖对局流程与时钟（结果对象）、战场压力（评星指标）、回目编排与难度（回目的 id、解锁顺序和阈值覆盖）。

### Presentation Layer (depends on features)

1. 界面与交互：依赖所有 MVP 系统（显示它们的状态，转发输入）。
2. 音效：依赖界面与交互（在动效节点上触发）。

### Polish Layer (depends on everything)

1. 教学引导：依赖对局流程与时钟（锁住输入）、界面与交互（遮罩和指引）。
2. 难度与无障碍选项：依赖战场压力（慢速档调的是压力参数）、界面与交互（少动模式）。
3. 图鉴：依赖进度、三星与存档（已解锁的武将）。

---

## Recommended Design Order

| Order | System | Priority | Layer | Agent(s) | Est. Effort |
|-------|--------|----------|-------|----------|-------------|
| 1 | 盘面与连通 | MVP | Foundation | game-designer, systems-designer | L |
| 2 | 对局流程与时钟 | MVP | Core | game-designer | M |
| 3 | 清除效果与连斩 | MVP | Core | systems-designer | S |
| 4 | 战场压力 | MVP | Feature | systems-designer, game-designer | L |
| 5 | 武将技能 | MVP | Feature | game-designer | L |
| 6 | 回目编排与难度 | MVP | Feature | level-designer, game-designer | M |
| 7 | 进度、三星与存档 | MVP | Feature | systems-designer | M |
| 8 | 界面与交互 | MVP | Presentation | ux-designer | L |
| 9 | 教学引导 | Vertical Slice | Polish | ux-designer | S |
| 10 | 难度与无障碍选项 | Alpha | Polish | ux-designer | S |
| 11 | 音效 | Full Vision | Presentation | sound-designer | S |
| 12 | 图鉴 | Full Vision | Polish | game-designer | S |
| 13 | 选将与解锁 | Vertical Slice | Feature | game-designer, systems-designer | M |
| 14 | 成就 | Alpha | Polish | game-designer | S |

---

## Circular Dependencies

- **对局流程与时钟 ↔ 战场压力**：时钟驱动压力推进，压力又决定胜负。**解法是查询契约**（2026-10-27 首轮审查后由“事件”改为“查询”）：流程在 `dtGame > 0` 的帧调用压力的 `tick(dtGame)`，并在结算点调用 `outcome()` 询问胜负；压力从不主动结束一回。这样“胜利优先”和“效果结算完再判负”都只由流程的结算顺序决定（对局流程规则 6、7）。
- **对局流程与时钟 ↔ 界面与交互**：演出时要让时钟停下、盘锁住。**解法是带原因的令牌**（2026-10-27 修订）：令牌由规则系统或对局流程申请（效果、技能、敌将出手、洗牌、后台、暂停），界面只负责播放和上报事件（可见性、横竖屏、点暂停印），不自己申请；只要还有令牌，时钟就不走。完整令牌表见“对局流程与时钟”规则 4。

---

## High-Risk Systems

| System | Risk Type | Risk Description | Mitigation |
|--------|-----------|-----------------|------------|
| 战场压力 | Design | 参数（压境 7 → 6.5 → 6 秒、敌将 10/9/8 秒、余量 2）只代表开发者本人的手感，中老年可能觉得太凶 | 所有参数做成调参项，GDD 写明安全范围；尽早找目标人群试玩；难度选项留在 Alpha |
| 进度、三星与存档 | Technical | 小红书 WebView 的存储行为还没核实，可能被清除 | 数据带版本号；存储不可用时降级；竖切片加“进度码”兜底；平台核实后再定方案 |
| 盘面与连通 | Technical / Design | 改动盘面的机制多（效果、斩一排、压境推行、增兵、洗牌），任何一处破坏不变量都会造成卡死局 | 不变量写成可测的验收标准；规则层不碰页面元素，可以单独测试；发牌可以固定种子 |
| 界面与交互 | Technical | 2 MB 包体、毛笔字体、低端安卓上的性能 | 遵守美术圣经第 8 节的预算和禁用清单；MVP 先用系统字体，配简化 SVG |
| 回目编排与难度 | Scope | 20 回的编排和调参工作量容易被低估 | MVP 3 回，竖切片 8 回，20 回要不要做看试玩结果（制作人的建议） |

---

## Progress Tracker

| Metric | Count |
|--------|-------|
| Total systems identified | 14（2026-10-30 加选将与解锁、成就） |
| Design docs started | 9 |
| Design docs reviewed | 8（单独复审 4–8 轮；跨文档总审 2026-10-27 第一次 FAIL，修订后重跑 CONCERNS） |
| Design docs approved | 8/8（2026-10-27，单独复审 3–8 轮；跨文档总审重跑中） |
| MVP systems designed | 8/8 |
| Vertical Slice systems designed | 1/2（选将与解锁 Draft，未审；教学引导未开始） |

---

## Next Steps

- [x] Review and approve this systems enumeration（用户确认写入，2026-10-26）
- [x] Design MVP-tier systems first（8 份 GDD，2026-10-27）
- [x] Run `/design-review` on each completed GDD（8 份全部 APPROVED，2026-10-27）
- [x] Run `/review-all-gdds`（重跑结论 CONCERNS，见 design/gdd/gdd-cross-review-2026-10-27.md）
- [x] Run `/gate-check technical-setup`（CONCERNS，用户接受风险并推进，2026-10-27）
- [ ] Validate the highest-risk systems with `/vertical-slice` before committing to Production
