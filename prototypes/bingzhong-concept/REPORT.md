<!-- PROTOTYPE - NOT FOR PRODUCTION -->
<!-- Question: 让某些兵种消掉时有效果，一下清掉一大片，会不会带来“割草”的爽快和“先消哪对”的讲究，不再无聊？ -->
<!-- Date: 2026-10-26 -->

# Concept Prototype Report: 兵种连连看（变体 C）

> **Date**: 2026-10-26
> **Prototype Path**: HTML
> **Concept File**: design/gdd/game-concept.md（第一版）

## Hypothesis
某些兵种消掉时有效果：火烧掉所有营帐，马冲散所有弓兵，水冲垮所有城寨。一下清掉一大片，能带来“割草”的爽快，也让“先消哪对”有了讲究。

## Riskiest Assumption Tested
清掉一整类块，会不会让盘面消不完。**不会**：被清掉的那类块，每种都是偶数个。

## Approach
效果块有红框，右下角的小图标表示它会清掉哪一种；三回依次引入火、马、水。20.6 KB。

**Path chosen:** HTML　**Reason for path:** 目标平台就是浏览器。
**Shortcuts taken (intentional):** 每种效果每回只有 1 对；效果的目标固定。

## Result
- 自测：三回各 8 局，全部打通，剩余块数和对数始终对得上。
- 用户评价同另外两个变体：“都还行，但没有挑战性。”

## Metrics

| Metric | Value |
|--------|-------|
| Path used | HTML |
| Prototype duration | 约 12 分钟 |
| Playtesters | 1 |
| Feel assessment | 不无聊，清一大片的瞬间有爽感，但缺紧迫感 |
| Hypothesis verdict | PARTIALLY CONFIRMED |

## Recommendation: PIVOT（被选为下一版的底子）

爽感成立了，缺的是压力。选它做压力版的底子，因为效果块天然是“解压阀”：敌军压上来，一把火烧掉一片，能形成一紧一松。

## If Pivoting
**Pivot direction:** 去掉单纯的倒计时，换成三种看得见的压力：敌军压境、粮草有限、敌将反击。
**What to keep:** 兵种效果和三国名场面的对应：火烧连营、铁骑冲阵、水淹七军。
**Next step:** `prototypes/yali-concept/`。

## Lessons Learned
- “爽”和“紧”是两件事：只有爽、没有紧，一样会腻。
