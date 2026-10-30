# Review Log — general-loadout

## Review — 2026-10-30 — Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: M
Specialists: none (lean)
Blocking items: 7 | Recommended: 6
Summary: 设计意图成立，注册表数值零冲突，但规则、公式和验收标准之间互相对不上（灰牌、`slots = 1`、验收标准 7 和 12），“空槽”行为没定，依赖表不完整，game-concept 里还留着旧支柱 3 的说法。用户决定后（灰牌只在点将区已展开时显示；“再来一回”保留内存槽位）7 项阻塞全部改掉。
Prior verdict resolved: First review
Findings:
- [BLOCKING] 规则 10–12 / Formulas / AC 7、8: 灰牌算不算可选 — 已修（D3：不计入 `available`，只在已展开时画灰牌；AC 改用第九回无鼓；第八回刘备例子改为不展开）
- [BLOCKING] Formulas `showPicker`: `slots = 1` 时算错 — 已修（要求 `slots ≥ 2`，加 AC）
- [BLOCKING] AC 12: 后半句无法测出 — 已修（拆成两条）
- [BLOCKING] 规则 9、13、14: 空槽与“再来一回” — 已修（D4：再来一回保留内存槽位含空槽；其他入口主将在首位、存档阵容、推荐补位、去重；`loadout` 1–3 个，空的不写；加 AC）
- [BLOCKING] Dependencies: 缺对局流程与时钟、武将技能不双向、“对其他文档的改动”过期 — 已修（systems-index 依赖列同步）
- [BLOCKING] game-concept 三处旧说法、缺选将系统一项 — 已修（见 game-concept.md）
- [BLOCKING] AC 11、5、2 不可独立测试 — 已修（card_width 96–112、自包含、拆分）
- [RECOMMENDED] 规则 4 第三回三样新东西 — 已修（D7：写为显式例外并列入试玩观察清单）
- [RECOMMENDED] Open Questions 点将区排版 — 已修（指向界面规则 7a）
- [RECOMMENDED] Tuning Knobs `starters` 归属与 `slots` ≤ `SLOT_MAX`；Last Verified — 已修
- [RECOMMENDED] 推荐阵容用完后 `showPicker` 为假时补满 — 未改（留待复审）
- [RECOMMENDED] 缺的验收（补位顺序、“×”清槽、放弃不写、`recommend` 拒载、输了不上锁等）、`loadout` 校验职责划分 — 未改（部分已由新 AC 覆盖；其余留待复审）
Reviewed-Content-Hash: design/gdd/general-loadout.md 056a3d751fc41ce60c7543d6f6743ddd69f54b3a
Reviewed-Content-Hash: design/registry/entities.yaml 9b88f1c949f5e636c3d0ba131a4bc5616d38c526
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/game-concept.md 708e6a1dbcb7840c0636f08728c9120ab87604cb
（以上哈希取修订前的 git 版本 f3a96f9，即本次审查读到的版本；由主会话补填）
