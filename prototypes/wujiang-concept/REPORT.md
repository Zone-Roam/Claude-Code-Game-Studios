<!-- PROTOTYPE - NOT FOR PRODUCTION -->
<!-- Question: 武将不再是盘上的块，而是盘下的技能（消对应的兵蓄力，满了点头像放技能），会不会让武将有存在感、让“什么时候放”成为一个有意思的决定？ -->
<!-- Date: 2026-10-26 -->

# Concept Prototype Report: 武将连连看（压力版 + 武将技能栏）

> **Date**: 2026-10-26
> **Prototype Path**: HTML
> **Concept File**: design/gdd/game-concept.md（本报告之后改版）

## Hypothesis
“兵是消的，将是用的”：武将从盘面上挪到盘下变成技能，消对应的兵给他蓄力，满了点头像放技能。这样武将有了存在感，“现在放还是留着”也成了一个有意思的决定。

## Riskiest Assumption Tested
技能会不会把压力消解掉，让游戏又变得没挑战。**用户的反馈是“对味了”，没有说变简单。**

## Approach
四位武将：关羽（⚔️ 过关斩将）、张飞（🥁 当阳一吼）、赵云（🛡️ 七进七出）、诸葛亮（📜 神机妙算）。默认蓄满要 2 对；放技能时喊评书台词，期间暂停计时。34 KB。

**Path chosen:** HTML
**Reason for path:** 目标平台就是浏览器。这里的手感就是成品的手感，模板说的“浏览器延迟会骗你”不适用。

**Shortcuts taken (intentional):**
- 四位武将每回都在，没有按故事决定谁出阵。
- 张飞的技能在三种模式下效果不同。
- 关羽斩一排后，如果某种兵剩下单数，会顺带再斩一块同种的，保证盘面还能消完。
- 粮草余量从 3 降到 2。

## Result
- 用户原话：“不错，挺好玩的感觉！这个用技能的感觉对味了。”
- 自测：
  - 四个技能在三种模式下都验证过。
  - 机器人边打边放技能，27 局全部正常结束，每一步都核对过：没有单数块，敌将血量始终是整数，控制台没有报错。
  - 测试中出现过一次“血量 5.5”，原因是两个测试脚本同时操作同一个盘面，换干净页面重测后正常。

## Metrics

| Metric | Value |
|--------|-------|
| Path used | HTML |
| Iterations to playable | N/A |
| Prototype duration | 约 20 分钟（含测试） |
| Playtesters | 1（开发者本人，非目标人群） |
| Feel assessment | 放技能“对味”：有决定、有高潮 |
| Hypothesis verdict | CONFIRMED |

## Recommendation: PROCEED

从“经典连连看”到“压力加武将技能”，迭代链终于得到了一个“好玩、有挑战、武将有存在感”的组合。但试玩者只有开发者本人，**还没有中老年和摸鱼上班族真人试过**，这是进入设计阶段后要尽快补上的。

CD-PLAYTEST skipped — Lean mode.

## If Proceeding

- **Core tuning values discovered（作为系统设计文档调参项的起点）:**
  - 敌军压境：三回间隔 7、6、5 秒；起始 4、4、5 行；波数 8、10、12
  - 粮草有限：粮草 = 总对数 − 兵种效果能清掉的对数 + 余量 2
  - 敌将反击：蓄力时间 10、9、8 秒；三连斩以上打断 25%；点错加 15%；增兵 2 对；3 颗心
  - 武将：蓄满要 2 对；张飞推迟 10 秒或补 3 份粮
  - 连斩：3 秒内连消算连斩
- **Assumptions confirmed:** 看得见的压力比倒计时有效；武将当技能比当方块有存在感。
- **Assumptions disproved:** “在经典玩法上加故事皮就够新鲜”（评书三国）；“让块动起来就有挑战”（阵法版）。
- **Emergent mechanics:** 张飞的技能在三种模式下各有用处，说明技能可以按压力类型定制；“留着关羽等最下面那排快压到红区再放”这种盘算值得在编排里鼓励。

**Next steps（standard 档）:** `/art-bible` → `/design-review design/gdd/game-concept.md` → `/gate-check` → `/map-systems` → `/design-system`（把上面的调参值写进 Tuning Knobs）。

## Lessons Learned
- **做出来之后被推翻的假设：** 武将当盘面块就能有存在感。
- **头脑风暴时没想到的：** 一个人来回试 7 版，靠的是用户每次一句话的直觉反馈。模板的复盘五问一次也没有完整问完：用户每次都用一两句话直接给了方向。
- **下次测法的改进：** 尽早找目标人群（中老年、摸鱼上班族）真人试玩，开发者自己的口味不能代表他们。
