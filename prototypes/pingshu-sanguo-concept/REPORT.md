<!-- PROTOTYPE - NOT FOR PRODUCTION -->
<!-- Question: 连斩 + 消到武将时盘内弹一句评书台词，会不会让人比普通连连看更想“再来一回”？台词会不会打断爽感？ -->
<!-- Date: 2026-10-26 -->

# Concept Prototype Report: 评书连连看·三国

> **Date**: 2026-10-26
> **Prototype Path**: HTML
> **Concept File**: design/gdd/game-concept.md（第一版）

## Hypothesis
在连连看里打出连斩、消到武将时盘内弹一句评书台词，玩家会比玩普通连连看更想“再来一回”。证据：3 回里至少一次主动点“下一回”或“再来”，事后能复述出至少一句台词。

## Riskiest Assumption Tested
盘内台词即使只停 0.8 秒、期间暂停计时，也会打断连斩的爽感。**最后没走到这一步：** 玩家根本没觉得爽。

## Approach
3 回（6×6、6×7、6×8），每回 3 位武将块，加连斩（3 秒内连消、每次 +1 秒）、回目标题和下回预告。18 KB，约 7 分钟写完，连通判定复制自上一个原型。

**Path chosen:** HTML
**Reason for path:** 目标平台就是浏览器。

**Shortcuts taken (intentional):** 武将用彩色圆脸加大字占位；没有星级、图鉴、存档、音效；`?line=0`、`?linems=` 用来对比台词开关和时长。

## Result
用户试玩后的原话：“没什么感觉啊，还是连连看，有点无聊。”

## Metrics

| Metric | Value |
|--------|-------|
| Path used | HTML |
| Iterations to playable | N/A |
| Prototype duration | 约 7 分钟 |
| Playtesters | 1（开发者本人） |
| Feel assessment | “还是连连看”：台词和连斩都是装饰，核心动作没有变 |
| Hypothesis verdict | REFUTED |

## Recommendation: PIVOT

核心动作还是“找两块一样的”，台词和连斩都只是找到之后的点缀。概念文档里的独特钩子“台词长在盘面上”，其实没过模板自己的钩子标准：要影响玩法，不能只改外观。lean 模式跳过了创意总监审查（CD-PILLARS），没人在写原型前指出这一点。

## If Pivoting

**Pivot direction:** 先调研现成的连连看衍生作品（棋盘移动、叠层、方块有效果等），再从里面挑方向做变体对比。
**What to keep:** 三国题材、评书口吻、连斩手感。
**Next step:** 三个变体原型：阵法移动、叠层翻开、兵种有效果。

> 转向笔记（PIVOT-NOTE）没有单独写：用户直接要求先调研再做三个变体，“保留什么、改什么”就写在上面。

## Lessons Learned
- **做出来之后被推翻的假设：** “给经典玩法加一层故事，就够新鲜。”
- **头脑风暴时没想到的：** 完整版 `/brainstorm` 问了 12 个问题，却没有一步去看现成作品；用户一句“多看看连连看的衍生作品”比这些问题更管用。
- **下次测法的改进：** 写概念前先调研同类作品；钩子要先问一句“它改的是玩法还是外观”。
