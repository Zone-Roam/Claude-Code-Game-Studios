# 变更影响：切片第四至六版和选将并入 GDD

日期：2026-10-30
范围：`design/gdd/` 的 8 份 GDD（状态 Revised）对 ADR-0001 至 ADR-0004 的影响
结论：4 份 ADR 都是“需要复核 → 就地改”，决策都不变，状态仍是 Accepted。没有 ADR 被取代。

## 怎么对照的

GDD 还没进 git（`git status` 里是未跟踪文件），没有可比的旧版本，所以这次**不是按 git diff 比**，而是按主会话的合并说明（切片第四、五、六版改动单 + 用户 2026-10-30 的决定）逐条对照 ADR。需要核对的细节按节读了 GDD。

## 变更摘要（每份 GDD）

| GDD | 改了什么 |
|---|---|
| board-link.md | 盘宽来自回目字段 `cols`（5 或 6，缺省 6，正式版默认 5）。每格两层，`STACK_DEPTH = 1`，满盘模式多出的牌随机压底，上层消掉时底牌翻上来（`revealed`）。新增拒马（挡线、点不动、相邻消一对就碎，`match.broken`）。新增查询 `depthAt`、`buriedCount`、`buriedCells`、`blocks`、`rowContents`。 |
| round-flow.md | 新增 `phase` 令牌（1400 ms，停钟锁盘）。新增规则 5a：关羽选排的输入路由，不占令牌。开讲水牌加点将，开讲时定下 `loadout`。`RoundResult` 加 `loadout`、`bossPhase`。`ENDING_WIN_MS` 从 1100 改为 2000（击碎结局）。 |
| clear-effects.md | 连斩改为“不连错的连续消除”，不看时间。三连斩起敌将退 1 步（每次出手之间最多 2 步），这一对净不涨。“打断蓄力”取消。 |
| battle-pressure.md | 敌将不再按时间蓄力，改为按步数：连上 1 步、连错 2 步，`tick` 只检查换阶段和出手。两段血、二阶段特技（横扫、冲阵、虎啸）、护盾、破特技、预告。新增事件 `bossPhase`、`seal`、`unseal`；`hostAttack` 加 `kind`。只往空格放东西。 |
| general-skills.md | 出阵武将由选将给出，最多 3 位。关羽改为“点选一排斩”。张飞（敌将）退步加震慑。赵云（敌将）护盾，压境、粮草仍是待命。诸葛亮清最多的一种兵加破特技，有结果横幅。 |
| general-loadout.md | 新系统：槽位、主将、推荐阵容、解锁、点将、记住阵容。 |
| progress-save.md | 每回记录新增可选字段 `loadout`，`v` 仍为 1；形状校验出错只丢这一项；合并不取较大值。 |
| chapter-design.md、ui-interaction.md | 回目加 `cols`、`slots`、`lead`、`recommend`、`unlock`、`starters`、`boss.steps`、`boss.phase2`；界面加层叠标记、翻牌、拒马、暴怒和击碎演出、点将区、选排高亮。 |

## 对 ADR 的影响

| ADR | 判断 | 改了什么 |
|---|---|---|
| ADR-0001 不用引擎、单文件发布 | 需要复核 → 就地改 | `BOARD_COLS = 6` 写死改为从回目 `cols` 读；常量表放 `STACK_DEPTH`、`SLOT_MAX`；“图标全部内联 SVG”一行加注：切片用了 data URI 位图，等美术圣经修订再定 |
| ADR-0002 主循环、时钟与确定性 | 需要复核 → 就地改 | 敌将按步数：步数在 `onMatch`/`onMiss` 里累加，出手留到第 ④ 步 `tick`（有令牌时延后）；连斩不读时钟（TR-clear-effects-001 作废）；令牌加 `phase`；`ENDING_WIN_MS` 2000；第 ② 步加选排路由；水牌加点将 |
| ADR-0003 规则层与界面层的通道 | 需要复核 → 就地改 | 事件只追加：`interrupt` 标为作废；追加 `comboPushback`、`bossPhase`、`seal`/`unseal`、`skillResult`；`hostAttack` 加 `kind` 等字段；`match`/`clear` 加 `broken`、`revealed`、`buried`、`blocks`；查询加 `depthAt` 等；意图加 `offBoard` 和选排分支；武将牌最多 3 张 |
| ADR-0004 本机存档 | 需要复核 → 就地改 | 每回可选的 `loadout`：`v` 不升级、不迁移，`validate` 只查形状、出错只丢这一项，`merge` 按 progress-save 规则 13 |

核心决策（无引擎、单文件、唯一 rAF 循环、令牌、四条随机流、事件出口加查询、localStorage 端口）都没有动。

## 门禁

TD-CHANGE-IMPACT 这次按 lean 模式跳过：改动由用户在主会话里直接批准为“就地小改”，没有 ADR 被取代。

## 后续

- 关卡设计（按 5 列和选将重排第二、三回）完成后，重跑 `/architecture-review`：重算覆盖率，给新需求（层叠、拒马、选排、选将、两段血）登记 TR 编号，更新 `tr-registry.yaml` 和控制清单。
- `docs/architecture/requirements-traceability.md` 的 Superseded Requirements 已追加本次的主要几行。
- ADR-0003 里两个暂定的事件名（`comboPushback`、`skillResult`）和一个意图名（`offBoard`），等 GDD 定名后再对齐。
