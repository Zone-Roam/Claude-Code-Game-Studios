# Interaction Pattern Library

> **Status**: In Design
> **Author**: 用户 + 主会话（`/ux-design patterns`，guided）
> **Last Updated**: 2026-10-27
> **Version**: 1.0
> **Engine**: 无引擎 — 原生 H5（ADR-0001）
> **UI Framework**: DOM + 一个 SVG 连线层，CSS 只动 transform 和 opacity（ADR-0003）
> **Related Documents**:
> - `design/art/art-bible.md` 第 7 节 — 层级、尺寸、字体、动效时长、放置规则 R1–R7
> - `design/accessibility-requirements.md` — 无障碍承诺
> - `design/gdd/ui-interaction.md` — 画面、布局、触控、反馈落点（本文的出处）
>
> **Template**: Interaction Pattern Library

---

## Overview

本游戏的交互很少：全程单指点按，只有 12 种模式。本文把 ui-interaction.md 里分散在各条规则中的交互行为整理成可引用的模式，以后的画面规格（`design/ux/*.md`）写“用 覆盖卡按钮（主）”即可，不再重写一遍防连点和落点。数值以 ui-interaction.md 的 Tuning Knobs 为准，这里只引用名字。

还没有任何画面规格，所以“Used In”列按 ui-interaction.md 规则 1 的画面表填写。

---

## Pattern Catalog

### Pattern Catalog Index

| Pattern Name | Category | Description | Used In (Screens) | Status |
|-------------|----------|-------------|------------------|--------|
| 块：按下即选 | Game-Specific / Input | 盘上的块按下就选中，第二块按下就判定 | 对局 | Draft |
| 武将牌：抬手出手 | Game-Specific / Input | 抬手才算，加四道防误触；不能放时翻说明 | 对局 | Draft |
| 覆盖卡 | Overlay | 盖住盘的卡片，只在盘锁住时存在 | 水牌、胜利卡、失败卡、接着讲卡、暂停卡、横屏卡 | Draft |
| 覆盖卡按钮（主 / 次） | Input | 覆盖卡上的按钮，出现后 500 ms 内不响应 | 同上 | Draft |
| 暂停印 | Input / Navigation | 台眉左上角，随时可点，演出期间也可 | 对局 | Draft |
| 书目签 | Navigation / Input | 书目里每一回一枚签 | 书目 | Draft |
| 喊字位 | Feedback | 回目匾位置上的短字，不锁输入，按规则排队 | 对局 | Draft |
| 贴源反馈 | Feedback | 反馈出现在事件来源处，不在盘中央弹字 | 对局 | Draft |
| 换档 | Feedback | 压力加深靠线变粗、读数换底牌，不靠闪 | 对局 | Draft |
| 提示条 | Feedback | 书目顶部的亮纸条，点一下收起 | 书目 | Draft |
| 返回键 | Navigation | 安卓返回键：对局中等于暂停，其他画面回书目 | 全部 | Draft |
| 画面切换 | Navigation | 书目、对局之间整屏替换，不叠历史 | 全部 | Draft |

---

## Patterns

### 块：按下即选

**Category**: Game-Specific / Input
**Used In**: 对局

**Description**: 连连看的基本操作。按下（不是抬手）就选中，减少一次等待；第二块按下就判定连不连得上。

**Specification**:
- `pointerdown`、只认 `isPrimary`；位置换算成格子，走线带算外圈，死区不算盘（ui-interaction 规则 15）。
- 选中：块上移 3 px，朱框画在块外。再点同一块、点空格或外圈：取消；点不同种的块：换选（board-link 规则 5）。
- 同一格 `SAME_CELL_GUARD_MS` 内再按下忽略；下压后 `PUSH_GRACE_MS` 内按下压前的位置换算（规则 15、17）。
- 盘锁住时丢弃，不缓存、不补执行（round-flow 规则 5）。
- 消除：墨线连线后两块被抽走；连不上：两块各晃 3 px 一次（规则 21）。
- 无障碍：命中区铺满整格；兵种靠形状认，选中靠位移加框（不只靠颜色）。

**When to Use**: 盘上的块。
**When NOT to Use**: 有代价、不能撤回的操作（用“武将牌：抬手出手”）。

### 武将牌：抬手出手

**Category**: Game-Specific / Input
**Used In**: 对局

**Description**: 放技能是一次性、不能撤回的决定，所以用抬手判定加四道防护，宁可偶尔点不动，也不误放（用户 2026-10-26 决定）。

**Specification**:
- 按下和抬起落在同一张牌上才算，在抬起时判定；滑出或 `pointercancel` 取消（ui-interaction 规则 16）。
- 牌与盘之间死区 ≥ 20 px；按下距上一次盘上按下不到 `CARD_AFTER_BOARD_MS` 忽略。
- 不能放（未蓄满、此时无效果、已在待命）：只翻出说明 `UNREADY_HINT_MS`，不扣任何东西；可以反复点。
- 盘锁住时直接丢弃，不翻说明。没出阵的虚线空座不响应。
- 就绪：四重提示（general-skills）；赵云待命：牌上写“待命”加朱虚线框。
- 无障碍：牌宽 ≥ 72 px；就绪靠令牌和抬起，不只靠金色。

**When to Use**: 武将技能。
**When NOT to Use**: 盘上的块（需要快）。

### 覆盖卡

**Category**: Overlay
**Used In**: 开讲水牌、胜利卡、失败卡、接着讲卡、暂停卡、横屏卡

**Description**: 所有盖住盘的卡片。核心约束是 R1：盖住盘的东西只在盘锁住时存在（ui-interaction 规则 22）。

**Specification**:
- 由对局流程的状态和令牌推出来显示哪一张（ADR-0002 第 2 节），界面不自己决定。
- 遮罩是纯色加 opacity，同时只有 1 层；接着讲卡、暂停卡 55% 墨遮罩。
- 遮罩期间横幅只占盘的上方 1/3，不盖最下两排（R4）。
- 横屏卡没有按钮，转回竖屏后对局中换成暂停卡。

**When to Use**: 需要玩家先读再决定、且这时规则必须停住的时刻。
**When NOT to Use**: 不需要停住规则的提示（用“喊字位”或“贴源反馈”）。

### 覆盖卡按钮（主 / 次）

**Category**: Input
**Used In**: 全部覆盖卡

**Description**: 每张卡最多一个主按钮、一个或两个次按钮（ui-interaction 规则 1 的表）。

**Specification**:
- `pointerup` 判定；按钮出现后 `CARD_GUARD_MS`（500 ms）内不响应（round-flow 规则 9）。胜利卡的按钮在盖章落定后才出现。
- 主按钮：开讲 / 下一回（最后一回为再来一回）/ 再来一回 / 接着讲；次按钮：回书目、书目、再来一回。
- 不受盘锁影响。
- 无障碍：文字按钮，读的字 18 px，必读对比 ≥ 7:1；用真实的按钮元素。

**When to Use**: 覆盖卡上的决定。
**When NOT to Use**: 盘上（不放按钮）。

### 暂停印

**Category**: Input / Navigation
**Used In**: 对局（三种模式）

**Specification**:
- 台眉左上角 44 × 44（右上角留给宿主按钮），层级在横幅和遮罩之上，演出期间也看得见、点得到（ui-interaction 规则 19）。
- 点了由对局流程申请 `pause` 令牌、显示暂停卡（接着讲 / 回书目）。
- “回书目”放弃这一回，不计、不写档（round-flow 规则 11）。

### 书目签

**Category**: Navigation / Input
**Used In**: 书目

**Specification**:
- 每一回一枚签：回目号、标题、最好星级；未解锁画虚线框写“未开讲”（MVP 三回全开）。
- 点已解锁的签 → 开讲水牌；未解锁的不响应。

### 喊字位

**Category**: Feedback
**Used In**: 对局

**Description**: 回目匾的位置，用来放不锁输入的短字（R2）。它本身从不锁盘。

**Specification**（ui-interaction 规则 20）:
- 跟令牌的喊字（效果名、技能台词、敌将台词、“重新布阵”）优先：出现时撤掉正在显示的普通喊字，结束前新来的普通喊字排队。
- 普通喊字之间，后来的替换先来的，停留 `SHOUT_MS`。
- 赵云待命用掉时撤回“下一对同种兵必消”。
- 结束后换回回目。

**When NOT to Use**: 盘中央（不在盘上弹字，R3）。

### 贴源反馈

**Category**: Feedback
**Used In**: 对局

**Description**: 反馈出现在事件来源处（R3）：连斩字在第二块上方一格，粮数旁盖“−1”，打断的斩痕划过蓄力条，丢的心在原位变虚线（ui-interaction 规则 21 的表）。

**Specification**: 落点以 ui-interaction 规则 21 为准；不新增落点前先在这里加一行。

### 换档

**Category**: Feedback
**Used In**: 对局

**Specification**（ui-interaction 规则 10–13）:
- 1 档平常、2 档警戒、3 档危险；升档立即生效，降档要停满 `TIER_MIN_DWELL_MS`。
- 数字主读数在 2 档起换到墨青底牌、36 px；线变粗、晕加一级。不闪烁。
- 技能和效果演出期间暂停显示墨青晕，档位照常计算。

### 提示条

**Category**: Feedback
**Used In**: 书目

**Specification**（progress-save 规则 18）:
- 书目顶部的亮纸条，点一下收起；不自动消失。
- 每种提示每次页面加载最多一次；同时有几种时只显示优先级最高的一种。
- 不进对局画面，不影响盘的布局。

### 返回键

**Category**: Navigation
**Used In**: 全部

**Specification**（ui-interaction 规则 24）: 宿主把安卓返回键转成 `popstate` 时，对局中等于点暂停印，其他画面回书目。宿主是否转来未知（平台探测）。

### 画面切换

**Category**: Navigation
**Used In**: 书目、对局、出错页

**Specification**: 整屏替换，不叠历史（ADR-0002 第 2 节）。切换用 opacity 渐变；少动版本直接切换。

---

## Animation Standards

时长和曲线以美术圣经第 7 节为准；规则上的“演出结束”只由令牌决定（ADR-0003）。只动 transform 和 opacity。

---

## Gaps & Patterns Needed

- 教学引导（竖切片）：需要“引导手指”和 `tutorial` 令牌下的高亮模式。
- 难度与无障碍选项（Alpha）：需要开关和档位选择模式。
- 图鉴（完整版）：需要列表和详情模式。

---

## Open Questions

- 宿主是否把返回键转成 `popstate`（平台探测）。
- 推行宽限 150 ms 是否让人觉得“点歪”（试玩验证，ui-interaction 规则 17）。
