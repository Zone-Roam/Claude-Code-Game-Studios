<!-- PROTOTYPE - NOT FOR PRODUCTION -->
<!-- Question: 第一次玩的人（含 50+ 岁）只看一行规则，能否在竖屏单指连连看里 120 秒消掉至少一半，并愿意再来一局？ -->
<!-- Date: 2026-10-26 -->

# Concept Prototype Report: 摸鱼连连看

> **Date**: 2026-10-26
> **Prototype Path**: HTML
> **Concept File**: design/game-brief.md（minimal 档的一页纸简报）

## Hypothesis
第一次玩的人（含 50+ 岁）只看一行规则，在竖屏手机上点两块连消，会感到“两分钟清空一盘”的小满足。证据：不加解释的第一局，120 秒内消掉至少 12 对，并且主动点“再来一局”。

## Riskiest Assumption Tested
节奏和难度：6×8 盘面、120 秒（约 5 秒一对），对中老年是否太紧；“最多拐两个弯”在小屏上能否一眼看懂。**两点都没有经过真人检验。**

## Approach
一个 13 KB 的 HTML 文件，约 15 分钟写完。

**Path chosen:** HTML
**Reason for path:** 目标平台本身就是浏览器（小红书 H5），HTML 原型就是在真实平台上测。

**Shortcuts taken (intentional):** emoji 图块、无音效、无存档、无开始页；URL 参数 `?time=`、`?rows=`、`?hints=` 代替设置界面。

## Result
- 自测：连通判定与一个独立写的 BFS 对照了 116,434 对，0 处不一致；自动打 20 整局，全部清盘；手机尺寸 375×812 下布局正常。
- **没有单独试玩。** 之后切到 standard 档，概念换成《评书连连看·三国》。用户试玩那一版时说“还是连连看，有点无聊”，可以看作对“经典连连看核心本身”的间接评价。

## Metrics

| Metric | Value |
|--------|-------|
| Path used | HTML |
| Iterations to playable | N/A |
| Prototype duration | 约 15 分钟 |
| Playtesters | 0 |
| Feel assessment | 未评估 |
| Hypothesis verdict | 未评估 |

## Recommendation: NOT ASSESSED — built but nobody has played it

这一版没有被单独玩过，不下结论。它的连通判定代码被后面所有原型复制使用（原型之间不互相引用）。

## Lessons Learned
- **做出来之后被推翻的假设：** “经典规则加大字号就够了”。后续试玩说明，光有经典核心不够有意思。
- **头脑风暴时没想到的：** 节奏问题后来不是靠调时间解决的，而是靠换掉“只有倒计时”这种压力形式。
- **下次测法的改进：** 同一个原型里放“经典版”和“改动版”两个开关，让试玩者直接对比。
