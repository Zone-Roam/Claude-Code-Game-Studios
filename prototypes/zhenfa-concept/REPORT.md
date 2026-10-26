<!-- PROTOTYPE - NOT FOR PRODUCTION -->
<!-- Question: 每消一对，剩下的块按“阵法”整体挪动，会不会让连连看从“找”变成“想”，不再无聊？ -->
<!-- Date: 2026-10-26 -->

# Concept Prototype Report: 阵法连连看（变体 A）

> **Date**: 2026-10-26
> **Prototype Path**: HTML
> **Concept File**: design/gdd/game-concept.md（第一版）

## Hypothesis
每消一对，剩下的块按这一回的阵法整体挪动，玩家得先想“消了这对，阵会变成什么样”，所以不再无聊。

## Riskiest Assumption Tested
块会动，会不会让中老年看不懂、找不到刚才盯着的那一块。**试玩里没有人提这个问题。**

## Approach
在评书三国的基础上，把每回改成一个阵法：长蛇阵向左收拢、锋矢阵向上推进、鹤翼阵向两翼分开。19.5 KB。

**Path chosen:** HTML　**Reason for path:** 目标平台就是浏览器。
**Shortcuts taken (intentional):** 阵法只有 3 种，滑动动画 0.2 秒，没有阵法预告。

## Result
- 自测：每回自动打 30 局，全部打通；每消一对都核对一次，块都按方向挤紧，画面位置和数据一致。
- 用户对三个变体的统一评价：“其实都不错，这三个玩法都还行，但是还是没有挑战性，只有时间限制，但是没有太大的紧迫感。”

## Metrics

| Metric | Value |
|--------|-------|
| Path used | HTML |
| Prototype duration | 约 10 分钟（三个变体合计约 40 分钟） |
| Playtesters | 1 |
| Feel assessment | 不无聊了，但缺紧迫感 |
| Hypothesis verdict | PARTIALLY CONFIRMED |

## Recommendation: PIVOT

“不再无聊”成立了，但用户要的“挑战和紧迫感”这一版给不了。下一版没选它做底子，而是选了兵种版。

## If Pivoting
**Pivot direction:** 给盘面加看得见的压力（见压力版）。
**What to keep:** “阵法”这个说法很好讲。可以在编排里，作为敌军压境的一种变体：敌军按阵法压过来。
**Next step:** 压力版 `prototypes/yali-concept/`。

## Lessons Learned
- 块会动，本身不制造紧迫感：没有东西在逼你，动起来也只是换了个排列。
