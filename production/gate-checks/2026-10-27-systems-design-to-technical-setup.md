## Gate Check: Systems Design → Technical Setup

**Date**: 2026-10-27
**Checked by**: gate-check skill（review_mode lean · workflow standard · qa.level standard · team.size individual）

### Required Artifacts: 3/3 present
- [x] design/gdd/systems-index.md — 12 个系统，8 个 MVP，8 个 MVP 的状态都是 Approved
- [x] 全部 MVP GDD（8 份）存在，并单独通过 `/design-review` — 每份最新结论都是 APPROVED（4–8 轮 lean 复审，全新子代理）；`gdd-structure-check.sh`：8 份都有全部 8 节
- [x] 跨文档总审报告（standard 档为推荐项）— design/gdd/gdd-cross-review-2026-10-27.md，重跑结论 CONCERNS

`artifact-check.sh --phase systems-design`：review-all-gdds PRESENT；design-system、design-review、consistency-check 为 NO_CHECK（脚本查不到），已人工核对：系统索引 8 个 MVP 全为 Approved；8 份审查记录最新结论全为 APPROVED；consistency-check（可选）没跑，用 `registry.sh validate`（全 0）加脚本核对 35 个常量代替。

### Quality Checks: 4/6 passing, 2 with concerns
- [x] 全部 MVP GDD 通过单独审查，没有 MAJOR REVISION NEEDED
- [x] `/review-all-gdds` 结论不是 FAIL（第一次 FAIL，按用户决定修订后重跑为 CONCERNS，0 个阻塞项）
- [~] 跨文档问题已解决或已明确接受 — 约 20 条警告未处理，由用户在本门接受（见 Accepted Risks）
- [~] 系统依赖已映射且双向 — 系统索引的依赖图漏两条非 MVP 的反向依赖（W2 余项）
- [x] MVP 优先级已定义
- [~] 没有过时引用 — 系统索引的进度表和 Next Steps、概念文档的 MVP 清单（“解锁进度”）与“一回 1–3 分钟”过时；不在 GDD 正文
- 审查回执：8 份 GDD 的回执都显示 CHANGED。7 份经重算核实，批准后只改了状态行；board-link 在第四轮批准后多了两句（坐标写法说明、与对局流程对齐的结算点措辞），没有再复审。

引擎相关检查：不适用。本项目不用游戏引擎（纯 HTML/CSS/JS，见 project.yaml 注释），没有引擎参考文档。

### Director Panel Assessment

Technical Director: CONCERNS
  GDD 足够细，能直接做架构（令牌表、每帧顺序、结算点、RoundResult、盘面返回数据、四条独立随机流、outcome() 查询、存档版本与兜底）。顾虑：平台探测没做，单文件还是多文件、能否用 module script 和 fetch、localStorage 会不会被清，这些架构决定都等它；跨文档总审有两个代理在 20 轮上限处被打断，接口契约只抽查过；武将牌点击的归属两份文档说法不一（架构里统一为“所有输入进对局流程的每帧队列”）；N3（张飞清零是否重置打断额度）、W9（增兵对数读哪里）影响实现；性能预算没进 project.yaml；CLAUDE.md 的技术栈还是引擎占位、还导入了 Godot 参考。

Producer: CONCERNS
  内容范围守住了（3 回、4 将、3 压力、3 效果，MVP 去掉解锁反而更小），但每个系统写得更深（8 份约 216 KB、约 200 行验收）。排期没按上一道门的建议重估，概念文档仍写“MVP 1–2 周”，粗估到可玩 MVP 约 3.5–5 周（无速度数据，置信度低）。上一道门接受的风险：不用引擎、三星标准、连斩作用、字体移出 MVP 变好了；目标人群试玩错过了原定时机，平台核实还没做且已成技术准备的第一项前置，性能预算和真机数据仍空。

Panel: 2 of 4（`workflow: standard`，来自 `modes.rigor: standard`）。创意总监、美术总监没有参与；要完整的四人组，把 `modes.rigor` 调到 `full`。

### Blockers
无。

### Recommendations
1. 技术准备第一项：真机探测页（文件形态、2 MB 口径、内核、file:// 还是 http、module script 与 fetch、localStorage 留存与配额、visibilitychange/pagehide、返回键、能否远程调试）。
2. “不用引擎”的决策记录，同时定代码形态（规则层 ES 模块、Node 直接测）和发布打包（只用 Node 内置功能，去掉开发参数和断言）；CLAUDE.md 技术栈的修改要用户批准。
3. 主循环、存档、事件与渲染通道各一份技术决策记录；写死 hash32 和随机数算法。
4. 性能预算和命名规则写进 project.yaml，用原型在基准机上测一次。
5. 技术准备结束前用 `/estimate` 重估排期，写回概念文档。
6. 与技术准备同时找目标人群试玩第 7 版原型（3–5 位五十岁以上、2–3 位上班族，默认档和慢速档，三回打乱顺序，记首次放弃率）。
7. 顺手改掉系统索引和概念文档里的过时写法；处理总审的 N3、W9。

### Verdict: CONCERNS

### Accepted Risks
用户于 2026-10-27 接受以下风险并推进到 Technical Setup：
- 小红书平台未核实（文件形态、2 MB 口径、存储留存、可见性事件）— 由技术准备第一项的探测页处理（用户负责上传运行）。
- 目标人群未试玩，参数只代表开发者手感；第一回吕布是硬仗且排在最前。
- 排期未重估（粗估 3.5–5 周到可玩 MVP，置信度低）。
- 跨文档总审剩余警告：粮草可能给多（D5）、打断额度用完无读数、张飞效果无处说明（用户决定：水牌上加一行）、压境吓退“有兵就放”、N1–N5、W2、W9、W12、D6、D7、D9、D10。
- 审查覆盖不完整：lean 模式无专家；总审两个代理被截断，常量由脚本补核、接口契约只抽查。
- 小屏格距约 47（低于美术圣经 52），待真机核实。
- board-link 批准后的两句小改没有再复审。
