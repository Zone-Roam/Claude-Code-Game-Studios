<!-- PROTOTYPE - NOT FOR PRODUCTION -->
<!-- Question: 盘面中间叠两层、消掉上层才翻开下层（武将是藏在下层的“伏兵”），这种“揭开”会不会让连连看有发现感、不再无聊？ -->
<!-- Date: 2026-10-26 -->

# Concept Prototype Report: 叠层连连看（变体 B）

> **Date**: 2026-10-26
> **Prototype Path**: HTML
> **Concept File**: design/gdd/game-concept.md（第一版）

## Hypothesis
盘面中间叠两层，消掉上层才翻开下层，武将作为“伏兵”藏在下层。“下面是什么”的好奇心会让人想继续消下去。

## Riskiest Assumption Tested
叠层会不会造成无解局。**确实会**：最后两块同种的叠在同一格时，永远消不掉。

## Approach
三回的叠层区域分别是 2×4、3×4、4×4；带黑点、往上浮起的块下面压着一块；翻开时有翻牌动画，翻出伏兵时提示“伏兵！”。21 KB。

**Path chosen:** HTML　**Reason for path:** 目标平台就是浏览器。
**Shortcuts taken (intentional):** 只有两层；遇到死局时先在原有层里重洗，还是无解就把叠着的块摊开到空格里。

## Result
- 自测：第一版第一回卡死，最后两块同种的叠在同一格。修复（死局时摊开）后，每回 30 局，共 90 局全部打通，最多洗牌 5 次。
- 用户评价同阵法版：“都还行，但没有挑战性，没有太大的紧迫感。”

## Metrics

| Metric | Value |
|--------|-------|
| Path used | HTML |
| Prototype duration | 约 15 分钟（含修死局） |
| Playtesters | 1 |
| Feel assessment | 不无聊了，但缺紧迫感 |
| Hypothesis verdict | PARTIALLY CONFIRMED |

## Recommendation: PIVOT

“发现感”能带来新鲜，但带不来挑战。没被选作压力版的底子。

## If Pivoting
**Pivot direction:** 见压力版。
**What to keep:** “伏兵藏在下层”适合做编排里的“发现回”，比如草船借箭、空城计这类讲计谋的回目；“叠层会出无解局”的教训要写进以后的系统设计文档。
**Next step:** `prototypes/yali-concept/`。

## Lessons Learned
- 任何改变块分布的机制（叠层、斩一行、增兵），都要在设计里写明“怎么保证盘面还能消完”。后面关羽斩一排的“顺带再斩一块同种的”，就是从这里来的。
