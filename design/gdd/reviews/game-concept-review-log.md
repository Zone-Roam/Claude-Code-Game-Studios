# Review Log: game-concept.md

## Review — 2026-10-26 — Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 4 | Recommended: 8
Summary: 概念自洽，原型验证过的核心（看得见的压力 + 盘下武将技能）表述清楚，支柱之间的拉扯也写明了。阻塞项都是一致性问题：两处和美术圣经冲突（震屏、就绪发光），一处兵种数量对不上（14 vs 12），一处 MVP 和支柱 3 冲突（四将全上 vs 按故事出阵）。备注：GDD 的 8 节清单不适用于概念文档，完整性改按概念模板和门禁的质量检查项判断；lean 模式下审查者就是文档作者（主会话），不算独立审查。
Prior verdict resolved: First review
Findings:
- [BLOCKING] Player Experience Analysis: Sensation 一行写了“震屏”，与美术圣经第 7 节“全作不震屏”矛盾
- [BLOCKING] Flow State Design: “技能蓄满时头像发光”与美术圣经“不发光，用四重提示”矛盾
- [BLOCKING] Technical Considerations: “约 14 种兵种图标”与原型、美术圣经的 12 种不符
- [BLOCKING] MVP Definition: MVP 四将全上，与支柱 3“出阵武将由故事决定”冲突，且文档没有说明这是例外
- [RECOMMENDED] Visual Identity Anchor: 色彩哲学一段仍写“发光边框”
- [RECOMMENDED] Game Pillars: 支柱 5“星级只看用时和连斩”在粮草模式下不适用，三星标准待系统设计定
- [RECOMMENDED] Core Mechanics: 连斩在压境、粮草模式里的作用没有写
- [RECOMMENDED] Anti-Pillars: “武将星级”和三星评价同名，有歧义
- [RECOMMENDED] Technical Considerations: 2 MB 包体硬约束没有明写
- [RECOMMENDED] Unique Hook: “有原型证据”没写明试玩者只有开发者本人
- [RECOMMENDED] Scope Tiers: 约 6 周的估算早于美术圣经，PR-SCOPE 在 lean 下被跳过，需要重估
- [RECOMMENDED] MVP Definition: MVP 一次教 3 种压力、4 位武将、3 种效果，检验不了支柱 4
Reviewed-Content-Hash: design/gdd/game-concept.md 8c20b6231e09d99bd0540f70b0fc5d0344883d92
Reviewed-Content-Hash: design/registry/entities.yaml dfeacb02917f751cb1dfd88cf490c7ec3d8d2d0f
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/art/art-bible.md 8ed5835f726d685d71fe17723b76d999bae2f723

### Revision — 2026-10-26（同一会话，审查之后）
用户选择“现在改”。4 项阻塞全部改掉；建议项第 1、4、5、6、7、8 条也一并改掉；第 2、3 条（各模式的三星标准、连斩在各模式里的作用）留给系统设计阶段。MVP 出阵由用户决定：四将全上，写明是例外，按故事出阵从竖切片开始执行。修订后没有复审。
