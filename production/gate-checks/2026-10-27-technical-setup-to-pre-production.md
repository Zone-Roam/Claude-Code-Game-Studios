## Gate Check: Technical Setup → Pre-Production

**Date**: 2026-10-27
**Checked by**: gate-check skill（`workflow: standard`、`review_mode: lean`、`qa.level: standard`、`team.size: individual`）

### Required Artifacts: 10/10 present（standard 档）

- [x] 已选技术栈：`CLAUDE.md` Technology Stack 为“None — native H5”，ADR-0001 已接受（不是 `[CHOOSE]` 占位）
- [x] 项目配置：`project.yaml` 有 `platform`、`naming`、`performance`（60 fps / 16.67 ms；draw calls、内存为 null 并写明原因）；`engine.name` 按 ADR-0001 有意不设
- [x] 美术圣经第 1–4 节：`design/art/art-bible.md` 9 节齐全（standard 档只在有视觉资产任务时必需）
- [x] ≥ 3 份 Foundation 层决策记录：ADR-0001（不用引擎、单文件发布）、ADR-0002（主循环、画面状态机、随机流 = 画面切换）、ADR-0003（规则↔界面通道、DOM + SVG = 事件架构、输入、渲染）、ADR-0004（本机存档 = 存档），4 份均 Accepted（用户 2026-10-27）
- [x] 引擎参考：无引擎，以平台参考 `docs/engine-reference/web-h5/VERSION.md` 顶替（`CLAUDE.md` 已改为导入它）
- [x] 测试目录：`tests/unit/`、`tests/integration/`
- [x] CI：`.github/workflows/tests.yml`（只在本地，未推送）
- [x] 示例测试：`tests/unit/architecture/purity-detector.test.mjs`、`tests/integration/architecture/rules-layer-purity.test.mjs`
- [x] 架构总文档：`docs/architecture/architecture.md` v4
- [x] `/architecture-review` 已跑：`docs/architecture/architecture-review-2026-10-27.md`，`Mode: full`

`artifact-check.sh --phase technical-setup`：7 步全部 PRESENT，NO_CHECK 0（含工作流目录列为必需的 control-manifest、accessibility-doc、interaction-patterns）。

**推荐项**：`design/accessibility-requirements.md`（档位 Basic）、`design/ux/interaction-patterns.md`、`docs/architecture/requirements-traceability.md`、`docs/architecture/control-manifest.md` 都有；逐屏的界面规格一份都没有开始。

### Quality Checks

- [x] 架构覆盖渲染、输入、状态管理：ADR-0003（渲染、输入）、ADR-0002（状态管理）
- [x] 命名规则和性能预算已设：`project.yaml`；规则每帧 2 ms、界面每帧 4 ms 登记在 `docs/registry/architecture.yaml`
- [x] 无障碍档位已定：Basic（`design/accessibility-requirements.md`，含提到 Basic 之上的项目和不做的项目）
- [ ] 至少一屏的界面规格已开始 — 没有（standard 档为推荐项 → 顾虑）
- [x] 每份决策记录都有 Engine Compatibility 节（写明无引擎和平台基线）和 GDD Requirements Addressed 节
- [N/A] 决策记录不引用 `deprecated-apis.md` 里的 API — 无引擎，没有这份清单（见下）
- [x] 平台参考里的 HIGH 风险项都在架构总文档 OQ-1 或决策记录的 Verification Required 里列出
- [x] 追溯矩阵 Foundation 层 0 缺口（全量审查：50 条需求、0 缺口）
- [x] 决策记录依赖无环：`adr-dep-graph.sh` 4 条边，无 CYCLE、无 NO_DEPS_SECTION、无 UNFILLED_DEPS
- [x] 测试：`node --test "tests/**/*.test.mjs"` 6 个，4 通过、0 失败、2 跳过（`src/rules`、`src/core` 还不存在，跳过不算通过）；纯净检查已人为放入违规文件验证过会失败
- **引擎相关三项记为 NOT APPLICABLE**（用户 2026-10-26 决定、2026-10-27 再次确认；技术总监同样归类）：弃用 API 检查（没有引擎 API 面）、引擎专家把关（没有对应专家）、引擎版本一致（4 份记录写的是同一个平台基线）。平台自己的禁用清单和 ES2017 禁用语法查过，没有违反，但不把它算作弃用检查的“通过”。
- **平台实际情况 NOT ASSESSED**（内核版本、来源是否稳定、存储、生命周期事件、字号放大、安全区、帧率）：探测页还没在手机上跑。这不是本门的必需项，本门只要求列为开放问题，已做到。

### Director Panel Assessment

Technical Director: CONCERNS
  必需项全部到位并经得起检查；上一轮复核后的两处中等修改（开讲渐隐、发布不去注释）已亲自核过。顾虑：平台探测没跑（最大技术风险）、追溯表和审查指纹过时、纯净检查对正则字面量有盲区、CI 从没跑过。

Producer: CONCERNS
  必需项和推荐项都在，没有阻塞。顾虑：排期没重估、文档约 460 KB 而游戏代码为 0、目标人群没试玩、平台探测是外部依赖、“竖切片”在概念文档和模板里含义不同、CI 没跑过。建议预制作按游戏大小缩小。

Panel: 2 of 4（`workflow: standard`）。创意总监和美术总监没有参与；要完整的四人评审，需要把 `modes.rigor` 调到 `full`。

### Blockers

无。

### Recommendations

1. 预制作第一件事：把 `tools/platform-probe/` 传到小红书里，在安卓和 iPhone 上各跑一次；存档和后台相关的任务排在探测之后；结果和 ADR-0001、ADR-0004 矛盾就重开对应的记录。
2. 拆史诗之前重跑 `/architecture-review`，刷新追溯表和文件指纹。
3. 写第一个规则任务之前，给 `tests/helpers/purity.mjs` 补上正则字面量（或禁止规则层写含 `//`、`/*` 的正则字面量）。
4. 用户决定先做垂直切片：按新规则在 `prototypes/` 下做出能玩的第一回，用来找目标人群试玩，再拆任务、估排期。
5. 第一次推送时确认 CI 能跑通，核对 `actions/setup-node` 的版本。
6. 逐屏的界面规格可以记为“由 ui-interaction.md 覆盖”，不必重写。

### Verdict: CONCERNS

Chain-of-Verification: 5 questions checked — verdict unchanged。
- 重新读了 4 份决策记录的 Status 行（全部 Accepted）[TOOL ACTION]；
- 查了追溯表里还残留 Proposed 状态（2 处），确认“审查过时”是顾虑而不是阻塞（追溯表在 standard 档为推荐项，Foundation 0 缺口来自全量审查本身）[TOOL ACTION]；
- 没有未解决的 MANUAL CHECK 项；
- 引擎三项是否把“无法评估”软化成了“不适用”：这是用户 2026-10-26 的明确决定，本次再次询问并确认，技术总监独立给出同样的归类；
- 各条顾虑合起来不构成阻塞：都能在预制作里处理，最大的平台风险已有不依赖探测结果的兜底。

### Accepted Risks（用户 2026-10-27 接受并推进）

1. 平台探测还没跑；存档、生命周期、多文件、字号放大等平台事实未核实 — accepted by the user, 2026-10-27
2. 追溯表和审查指纹早于 v2–v4 的修改 — accepted by the user, 2026-10-27
3. 纯净检查对正则字面量有盲区 — accepted by the user, 2026-10-27
4. CI 从没跑过，Action 版本未核实 — accepted by the user, 2026-10-27
5. 排期没有重估 — accepted by the user, 2026-10-27
6. 目标人群没有试玩过（连续第三道门） — accepted by the user, 2026-10-27
7. 文档多、能玩的东西少，预制作有重复写界面规格的风险 — accepted by the user, 2026-10-27
8. 逐屏的界面规格没有开始 — accepted by the user, 2026-10-27
9. 引擎相关三项记为 NOT APPLICABLE — accepted by the user, 2026-10-27
