# Accessibility Requirements

> **Status**: In Design
> **Author**: 用户 + 主会话（`/ux-design accessibility`，guided）
> **Last Updated**: 2026-10-27
> **Template**: Accessibility Requirements

本文把美术圣经第 2–4、7 节和 ui-interaction.md 规则 14–34 里已经定下的无障碍要求归到一处，并写明哪些不做、为什么。没有新增设计决定；数值以那两份文档为准，这里只引用。

## Accessibility Tier Definition

### Tier Definitions

模板的四档：**Basic**（必读字可读、不只靠颜色、无光敏风险、音量可调）/ **Standard**（另加全部输入可重映射、字幕、可调字号、色盲模式、所有限时操作可延长或关闭）/ **Comprehensive** / **Exemplary**。

### This Project's Commitment

**Target Tier**: Basic

**Rationale**: 目标玩家里有中老年和上班摸鱼的人，最要紧的是“看得清、点得准、不误触、不晃眼”，这些在美术圣经和界面文档里已经定得比 Standard 还严（必读字对比 ≥ 7:1、块的命中区铺满整格、武将牌四道防误触）。但 Standard 档要求的“所有限时操作可延长或关闭”“可调字号”在 MVP 里做不到：压境和敌将本身就是限时压力，放慢档位（`slow=1`）只在测试包里，正式的难度选项排在 Alpha（系统 10“难度与无障碍选项”）；字号锁定是为了布局不跳。所以诚实的档位是 Basic，另外把几项提到 Basic 之上。

**Features explicitly in scope (beyond tier baseline)**:
- 必读文字对比 ≥ 7:1（WCAG AAA），次要 ≥ 4.5:1，图形 ≥ 3:1（美术圣经第 4 节对比度表）——目标人群视力退化。
- 跟随系统“减弱动态效果”（Comprehensive 档的项目，ui-interaction 规则 29）。
- 兵种靠形状区分、颜色只加快辨认；阵营、压力档位都有形状或位置备份（美术圣经第 3、4 节“色盲安全”）。
- 触控目标：块 52 px 整格命中、武将牌 ≥ 72 px 宽、暂停印 44 × 44（ui-interaction 规则 7、19）；武将牌四道防误触（规则 16）。
- 对局中随时可暂停，盘锁住时也能点暂停印（round-flow 规则 11）。

**Features explicitly out of scope**:
- 输入重映射：全程单指点按，没有可映射的按键（N/A）。
- 字幕：MVP 没有语音和音效（N/A）。
- 可调字号、UI 缩放：MVP 不做，字号锁定（见 Known Intentional Limitations）。
- 限时操作可延长：MVP 不做，Alpha 的难度选项再做（见 Known Intentional Limitations）。
- 屏幕阅读器：MVP 不做（见 Known Intentional Limitations）。

---

## Visual Accessibility

| Feature | Target Tier | Scope | Status | Implementation Notes |
|---------|-------------|-------|--------|---------------------|
| 必读字最小字号 | Basic | 全部画面 | Not Started | 读的字必读 18 px、次要 16 px；喊的字 ≥ 24 px（ui-interaction 规则 26）。锁定 `text-size-adjust: 100%`，宿主放大时由探测键 `font16pxComputed` 核实 |
| 文字对比 | Basic（提到 AAA） | 全部文字 | Not Started | 必读 ≥ 7:1、次要 ≥ 4.5:1（美术圣经第 4 节色值已核算）；声明 `color-scheme: light`，防宿主强制深色反转 |
| 不只靠颜色 | Basic | 盘面、HUD、武将牌 | Not Started | 下表逐项列出备份 |
| 光敏 | Basic | 全部演出 | Not Started | 闪烁不超过每秒 2 次；危机靠“换档”不靠闪烁；失败不用红叉、裂屏、震屏（美术圣经第 1、2 节） |
| 少动版本 | Comprehensive | 全部动画 | Not Started | 跟随系统设置；读不到按默认版本，默认版本本身不闪不震（ui-interaction 规则 29） |
| 色盲模式 | Standard | — | N/A | 不需要单独的模式：没有任何信息只靠颜色（下表） |
| 字号调节、UI 缩放 | Standard | — | Out of scope | 见 Known Intentional Limitations |

### Color-as-Only-Indicator Audit

| Location | Color Signal | What It Communicates | Non-Color Backup | Status |
|----------|-------------|---------------------|-----------------|--------|
| 盘上 12 种兵 | 三组器物色 | 兵种 | 形类 × 主轴唯一，灰度下逐一可认（美术圣经第 3 节测试） | Designed |
| 朱 vs 墨青 | 我方 / 敌方压力 | 阵营 | 圆对齿或城垛；位置下对上；运动方向 | Designed |
| 墨青 vs 墨 | 压力物 / 普通线 | 是否为压力 | 墨青永远带齿或城垛 | Designed |
| 朱 vs 描金 | 就绪 / 星 | 武将可出手、星级 | 就绪配令牌和抬起；实心星对空心星 | Designed |
| 连线变朱 | 连斩 ≥ 2 | 连斩中 | 连斩字（数字）出现在第二块上方 | Designed |
| 赵云的一对 | 朱虚线 | 这一对是待命强消 | 虚线（不只是颜色） | Designed |
| 警戒档位 | 墨青晕、底牌 | 压力到了第几档 | 读数换到 36 px 底牌、线变粗、晕加一级 | Designed |

---

## Motor Accessibility

| Feature | Target Tier | Scope | Status | Implementation Notes |
|---------|-------------|-------|--------|---------------------|
| 单指操作 | Basic | 全部 | Not Started | 只处理 `isPrimary` 指针，其他手指忽略（ui-interaction 规则 14） |
| 无长按、无拖动、无连点 | Basic | 全部 | Not Started | 所有操作都是单次点按（board-link 规则 15） |
| 大触控目标 | Basic | 盘、牌、按钮 | Not Started | 块命中区铺满整格（格距 52）；牌 ≥ 72 px 宽、牌间死区 ≥ 8；盘与牌之间死区 ≥ 20（ui-interaction 规则 7、16） |
| 防误触 | Basic | 武将牌、覆盖卡 | Not Started | 牌抬手判定加四道防护；覆盖卡按钮出现 500 ms 内不响应（ui-interaction 规则 2、16） |
| 手抖容错 | Basic | 盘 | Not Started | 同一格 200 ms 内重复按下忽略；下压后 150 ms 按下压前的位置算（规则 15、17） |
| 输入重映射 | Standard | — | N/A | 没有按键 |
| 限时窗口调节 | Standard | 压境、敌将 | Out of scope | 见 Known Intentional Limitations |

---

## Cognitive Accessibility

| Feature | Target Tier | Scope | Status | Implementation Notes |
|---------|-------------|-------|--------|---------------------|
| 随时暂停 | Basic | 对局中全部状态 | Not Started | 三种模式都有暂停印，演出期间也可点；切后台自动停（round-flow 规则 10、11） |
| 一回只引入一样新东西 | Standard | 回目编排 | Not Started（竖切片起） | chapter-design 规则 12；MVP 不执行 |
| 规则说在开局前 | Basic | 开讲水牌 | Not Started | 水牌写压力规则一句、出阵武将的技能说明、新效果一行（ui-interaction 规则 1） |
| 失败给一句提示 | Basic | 失败卡 | Not Started | `texts.failHint[原因]` |
| 可再看说明 | Standard | 武将牌 | Not Started | 点不能放的牌翻出说明 1500 ms，可以反复点（不扣任何东西） |
| 自动消失的文字 | Standard | 喊字位 | Not Started | 喊字停留 1200 ms（SHOUT_MS），低于模板建议的 5 秒；这些字都不需要玩家操作，“关羽可以出手了”同时有牌面的持续就绪提示。书目提示条要点一下才收起 |
| 难度选项 | Standard | — | Out of scope | Alpha |

---

## Auditory Accessibility

MVP 没有音频（音效是 Full Vision 的系统 11）。游戏从一开始就按“静音也能玩”设计：所有信息都有画面表达。

| Feature | Target Tier | Scope | Status | Implementation Notes |
|---------|-------------|-------|--------|---------------------|
| 字幕 | Basic | — | N/A | 没有语音；台词本来就是喊字位上的字 |
| 独立音量 | Basic | — | N/A（加音效时必做） | 加音效时：默认静音或很轻，提供开关 |

### Gameplay-Critical SFX Audit

| Sound Effect | What It Communicates | Visual Backup | Caption Required | Status |
|-------------|---------------------|--------------|-----------------|--------|
| （MVP 无音效） | — | — | — | N/A |

---

## Platform Accessibility API Integration

| Platform | API / Standard | Features Planned | Status | Notes |
|----------|---------------|-----------------|--------|-------|
| 小红书 WebView（iOS / Android） | WCAG 2.1、系统“减弱动态效果” | `prefers-reduced-motion`；`color-scheme: light`；字号锁定 | Not Started | 宿主是否放大字号、强制深色、是否传出减弱动态效果，都等平台探测 |
| VoiceOver / TalkBack | 读屏 | 不做 | Out of scope | 见 Known Intentional Limitations |

---

## Per-Feature Accessibility Matrix

| System | Visual Concerns | Motor Concerns | Cognitive Concerns | Auditory Concerns | Addressed | Notes |
|--------|----------------|---------------|-------------------|------------------|-----------|-------|
| 盘面与连通 | 12 种兵要分得清 | 点得准 | 连通规则（≤ 2 拐） | — | Yes | 形状定种；整格命中；连线画出路径 |
| 对局流程与时钟 | — | — | 演出时压力不走 | — | Yes | 令牌停钟 |
| 清除效果与连斩 | 效果块、预告圈 | — | 效果规则要先说 | — | Yes | 双线框 + 角印；水牌写规则 |
| 战场压力 | 档位 | 限时 | 三种压力规则不同 | — | Partial | 限时不可延长（MVP） |
| 武将技能 | 就绪提示 | 误放技能 | 四人四技能 | — | Yes | 四重就绪提示；四道防护；水牌技能说明 |
| 回目编排与难度 | — | — | 一回一样新东西 | — | Partial | 竖切片起执行 |
| 进度、三星与存档 | 星级 | — | 为什么没满星 | — | Yes | 实心对空心；原因一句 |
| 界面与交互 | 对比、字号 | 触控 | 喊字停留 | — | Yes | 见上各表 |

---

## Accessibility Test Plan

| Feature | Test Method | Test Cases | Pass Criteria | Responsible | Status |
|---------|------------|------------|--------------|-------------|--------|
| 对比度 | 截图取色，按 WCAG 公式算 | 三种模式各档位、水牌、结算卡 | 必读 ≥ 7:1、次要 ≥ 4.5:1 | 主会话 | Not Started |
| 色盲与灰度 | 截图转灰度，做红、绿、蓝黄色盲模拟 | 每个状态 | 认得出阵营、兵种、就绪武将、压力档位（美术圣经第 4 节验收） | 主会话 | Not Started |
| 少动版本 | 系统打开“减弱动态效果”后玩一回 | 消除、下压、亮相、洗牌 | 没有缩放和位移类动画，规则时长不变 | 主会话 | Not Started |
| 触控 | 基准机上快速点、手抖双击、点牌边缘 | 规则 15–17 的每种情况 | 没有误放技能；同格双击不取消选中 | 用户试玩 | Not Started |
| 目标人群 | 找 50 岁以上和上班族各几位试玩 | 三回打乱顺序 | 不用解释就能开始玩；能说出武将牌怎么用 | 用户 | Not Started（门禁已接受的风险） |

---

## Known Intentional Limitations

| Feature | Tier Required | Why Not Included | Risk / Impact | Mitigation |
|---------|--------------|-----------------|--------------|------------|
| 限时操作可延长 | Standard | 压境、敌将本身就是限时玩法；难度选项排在 Alpha | 手慢的人可能卡在第一回 | MVP 三回全开（不被卡住）；测试包 `slow=1`；Alpha 做难度设置 |
| 可调字号 | Standard | 布局按固定字号排；字号改了盘会被挤小 | 视力差的人看不清 | 基础字号已经较大（18 px / 24 px）；对比 ≥ 7:1 |
| 读屏 | Comprehensive | 连连看是纯视觉的找对玩法，读屏玩不了 | 盲人玩家无法游玩 | 菜单按钮仍用真实的按钮元素和文字，不妨碍以后补 |

---

## Audit History

| Date | Auditor | Type | Scope | Findings Summary | Status |
|------|---------|------|-------|-----------------|--------|
| 2026-10-26 | art-director + 主会话 | 设计审查 | 美术圣经色值 | 原型金字对比只有 2.2，已换色；灰字加深到 5.7 | Closed |

---

## External Resources

| Resource | URL | Relevance |
|----------|-----|-----------|
| WCAG 2.1 | https://www.w3.org/TR/WCAG21/ | 对比度、字号 |
| Game Accessibility Guidelines | https://gameaccessibilityguidelines.com | 游戏无障碍清单 |

---

## Open Questions

| Question | Owner | Deadline | Resolution |
|----------|-------|----------|-----------|
| 宿主会不会放大字号、强制深色、传出“减弱动态效果” | 主会话 | 平台探测结果回来时 | — |
| 667 高小屏整体缩放后字号约 16.3 px，是否还够大 | 用户 | 真机试玩 | — |
