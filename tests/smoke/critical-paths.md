# Smoke Test: Critical Paths

**Purpose**: Run these 10-15 checks in under 15 minutes before any QA hand-off.
**Run via**: `/smoke-check` (which reads this file)
**Update**: Add new entries when new core systems are implemented.

在基准机上打开**发布包**（`dist/release/index.html`）做；开发版只在排查时用。

## Core Stability (always run)

1. 打开后 2 秒内出现书目，没有报错页
2. 书目里三回都能点开，水牌显示回目、规则一句、出阵武将和技能说明
3. 点“开讲”后进入对局，盘面、台眉、武将牌都在屏内，盘不被遮挡

## Core Mechanic (update per sprint)

<!-- 每个冲刺把实现了的核心玩法加在这里 -->
4. [核心玩法 — 第一个规则系统实现后补上：例如“点两块同种兵能连线消除，连不上会晃”]

## Data Integrity

5. 赢一回后结算卡显示星级；回到书目，这一回的星级已更新（存档实现后）
6. 彻底关掉再打开，星级还在（存档实现后；平台探测确认存储可用之前，结果记“待核实”）

## Lifecycle

7. 对局中切到别的 App 再切回来：显示“接着讲”卡，压力读数和切出前一样（对局流程实现后）
8. 对局中点暂停印：显示暂停卡，“回书目”能回到书目且这一回不计

## Performance

9. 对局中没有肉眼可见的掉帧（目标 60 fps；开发版帧率计 P95 帧时 ≤ 20 ms）
10. 连玩 5 分钟后操作仍然跟手（点击到反馈 ≤ 100 ms）
