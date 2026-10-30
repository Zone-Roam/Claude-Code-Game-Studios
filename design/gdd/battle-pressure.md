# 战场压力

> **Status**: Revised（2026-10-30，并入切片第四至六版和选将；同日并入正式版前 10 回的新敌将、铁索连环、刘备接口、压境拒马；待重新审查）
> **Author**: 用户 + 主会话（lean 模式）
> **Last Updated**: 2026-10-30
> **Last Verified**: 2026-10-27
> **Implements Pillar**: 3 故事决定这一回打什么仗、1 一回一乐（挑战是体验排序第 1）

## Summary

每一回只用一种压力，它决定了这一回“怎么输”。**敌军压境**：敌军每隔几秒把整盘往下压一行，前几次压下来的是新兵，兵压完了照样往下压空行，最下一排有块时再压就破城。**粮草有限**：不限时，每消一对耗一份粮，连不上也扣，粮尽而盘上还有兵就输。**敌将反击**：你每走一步，敌将蓄一格（连上一对 1 步、连错 2 步，不动不涨），蓄满就出手，增兵并扣你一颗心，三颗心没了就输；敌将可以有两段血，第一段打空他暴怒，之后普通出手和特技轮流来，特技前会预告。三种模式共用一套接口：对局流程每帧推进它、在结算点问它“胜负如何”，结束时取走评星指标。

> **Quick reference** — Layer: `Feature` · Priority: `MVP` · Key deps: `盘面与连通、对局流程与时钟、清除效果与连斩`

## Overview

战场压力是挑战感的来源（体验排序第 1）。它把单纯的倒计时换成盘面上**看得见的威胁**，并让输赢由玩家的操作和判断决定（原型 #6 证明有效：“挑战上来了”）。三种模式分别对应三国里三类战役：被追、守城打压境，北伐、粮道打粮草，斗将、单挑打敌将反击（支柱 3）。系统本身只做计算：对局流程每帧调用 `tick`，把盘面的消除、连不上、整类清除交给它，在结算点调用 `outcome()` 查询胜负。它从不主动结束一回，所以“最后一刀”和“粮草归零”之间的先后只由对局流程决定。每一回的参数在回目数据里，全局常量（每步加几格、出手和暴怒演出时长、预告步数、特技数值）在本文的 Tuning Knobs 里；**初值只代表开发者本人和三次切片试玩的手感**，需要目标人群试玩后校准。

敌将模式在垂直切片第四至六版里改过三次（切片 `prototypes/hulao-vertical-slice/`，结论 PROCEED，用户 2026-10-28 至 2026-10-30 批准）：两段血和暴怒（第四版）；按步出手、二阶段特技、赵云护盾、张飞退步震慑（第五版，借鉴 Empires & Puzzles 的回合计时和 Boss 特技）；增兵和拒马只放空格、横扫只动上层（第六版，层叠）。按步出手的用意：中老年人找一对要 3–5 秒，按时间蓄力时“想一想就挨打”；按步蓄力后，压力只来自自己走的每一步，连错代价加倍。

## Player Fantasy

“城墙根下守住了。”敌军一排排压下来，冷色从盘底渗上来；粮袋一格格变空；吕布的蓄力点一颗颗亮起来，“还有 2 步出手”“下招：赤兔冲阵”。玩家在每种压力下都看得清还差几步，想清楚再动手不吃亏；看见预告，抢先放赵云挡、放诸葛亮破，最后一刀把局面扳回来。

## Detailed Design

### Core Rules

**通用**

1. 每一回从回目数据读取 `mode` ∈ {`press`, `food`, `boss`} 及其参数。参数的**合法范围**是下面各公式变量表里的 Range：超出就由回目加载器拒绝加载；超出 Tuning Knobs 的**安全范围**只警告。网址参数 `slow=1` 的倍率在校验之后、开局时才乘上去，结果不再校验（它只是测试用的放宽）。
2. 对局流程只在 `dtGame > 0` 的帧调用 `tick(dtGame)`；有令牌时不调用，压力不前进。压境用 `dtGame` 计时；敌将**不看时间**，`tick` 只检查“该不该换阶段、该不该出手”（规则 23），触发条件是步数（规则 22）。
3. 对局流程按固定顺序把盘面的结果交给本系统（对局流程规则 6）：`onMatch(match)`、`onMiss(miss)`、`onClear(clear)`；清除效果在连斩达标时调用 `comboReward()`；武将技能调用 `scareNextPush()`、`addFood(n)`（张飞，压境、粮草），`roarBack(back, stun)`（张飞，敌将）、`raiseShield()`（赵云，敌将）、`breakSpecial()`（诸葛亮，敌将）、`healHeart(n)`（刘备，敌将）、`refillFood(n)`（刘备，粮草），并读 `sealed(general)`、`canHeal()`、`canRefill()`。本系统自己调用的 `pushRowFromTop`、`addPairs`、`shuffleTopRows`、`placeBlocks`、`convertBlocks` 的结果由本系统直接拿到。
3a. **执行时序**（与对局流程规则 6 的分发表一致）：下压在 `tick` 里**当场**改盘面，不申请令牌，盘不锁（界面播 240 ms 的整盘下移，点击由推行宽限处理）；敌将出手和换阶段在 `tick` 里**当场**改盘面和读数（扣心、增兵、特技、补满援军），然后才申请 `hostAttack` 或 `phase` 令牌演出。
3b. **只放空格**（切片第六版）：本系统往盘上放东西（增兵、暴怒补兵、赤兔冲阵的拒马）时只放在**空格**上（这一格上层没有兵也没有拒马），不压到别的牌底下，也不新增压底的牌。压底只在发牌时发生（见“盘面与连通”）。
4. **胜负只回答查询**：`outcome()` 返回 `{result: 'win' | 'lose' | null, reason}`，**先判胜利、再判失败**。本系统不主动结束一回。
5. **给界面的事件**：`push {row, empty, dropped}`（`dropped` 是这次被推出盘面的拒马所在的列，没有为空表，见规则 9a）、`heal {heart}`、`foodRefill {amount}`、`scared`（一次下压被张飞吓退）、`lastWave`、`foodSpent {amount, cause: 'match' | 'miss'}`、`hostAttack {kind: 'normal' | 'special' | 'blocked' | 'broken', line?, heart?, special?, cells?, general?}`、`bossPhase {phase, name}`、`seal {general, left}`、`unseal {general}`。读数通过 `hud()` 查询（规则 26）。
6. **结束时**：`metrics()` 返回评星指标（规则 27）。

**敌军压境（press）**

7. 盘面固定 8 行、`cols` 列（回目字段，5 或 6，缺省 6；见“回目编排与难度”）。开局只在第 1 到第 `startRows` 行发牌（见“盘面与连通”规则 4）。压境**不用层叠**：不发压底的牌。开局的行里没有拒马；压境里的拒马只从 `waveList` 进盘（规则 9a）。
8. **波次表**：开局时一次性生成，之后不再变化。每一波的长度等于 `cols`（用户决定，2026-10-30），其中 `wavePairs = floor(cols / 2)` 对；`cols` 是单数时多出的一格是空格。
   - 回目写了 `waveList` 就照用：每项是 `cols` 个元素，每个元素是兵种 id、`null`（空格）或 `'jm'`（拒马，用户决定 4，2026-10-30），按列从左到右放；兵恰好 `wavePairs` 对、`null` 与 `'jm'` 合计恰好 `cols − 2 × wavePairs` 个，每种兵在一项里是偶数块。所以只有单数列（5 列）的回目能写拒马，每项最多 1 块；6 列回目写了 `'jm'` 就拒绝加载。
   - 没写 `waveList` 时生成的波次表里没有拒马。
   - 没写就用盘面的 `rng('wave')` 生成 `waves` 行：每行抽 `wavePairs` 对，每对按池权重抽一种兵（池 `pool` 见“回目编排与难度”，权重是正整数，缺省等于 `deck` 的对数；抽法是按兵种表顺序累加权重，取随机数落入的那一段），补上空格（单数列时一个），再把这 `cols` 格用同一条流打乱列位。
   - 同一个 `seed`，波次表完全相同，不受玩家操作和洗牌影响。
9. **下压**：`nextPush` 初始为 `interval`。当 `gameTime ≥ nextPush`：
   - 最下一行有兵（`bottomOccupied()`，拒马不算）→ 记下失败原因“破城”，不下压。
   - 否则调用盘面 `pushRowFromTop(行)`（最下一行只有拒马时照常下压，拒马被推出盘面，见规则 9a）：还有波次时放波次表的下一行，`wave += 1`；波次用完后放**空行**（用户决定，2026-10-27：最后一波之后空行继续下压，直到清空）。
   - 下压后：`nextPush = gameTime + interval`，`comboDelay_w = 0`。
   - 推完最后一波的那一次，发出 `lastWave`，喊字位显示“最后一波”。
9a. **压境里的拒马**（用户决定 4，2026-10-30；第 6 回教）：
   - 进盘：`waveList` 某项写了 `'jm'`，下压时这一格作为拒马放进第 1 行（上层），底下没有牌。
   - 随行下移：之后每次下压，拒马和兵一起下移一行。
   - 不算兵：不进 I1、`pairsLeft`，不算“盘面有块”（`isEmpty()`），不算“最下一行有块”（`bottomOccupied()`）。所以它不会破城，也不累计 `dangerMs`。
   - 推出盘面：下压时最下一行里的拒马直接移出盘面（不碎、不演出碎裂），列号记进 `push.dropped`。
   - 破法照“盘面与连通”规则 9：上下左右相邻消掉一对（`forced = false`）就碎；关羽斩排斩到就碎；效果、诸葛亮、洗牌不碎。赵云强制消除的一对不碎。
   - 拒马挡线、点不动，照“盘面与连通”规则 6、7。
10. **盘面清空**（`isEmpty()`：上层没有兵；只剩拒马也算清空）：
    - 还有波次：下一次 `tick`（`dtGame > 0`，暂停和后台时不会发生）立刻下压下一波（不等计时），之后同样 `nextPush = gameTime + interval`。这一次立刻下压不受张飞吓退标记影响（盘空时没有破城危险）：照常下压，标记保留，留给下一次到点的下压。
    - 波次已用完：胜利。
11. **胜利**：`wave == waves` 且盘面清空（盘上剩下的拒马不影响胜利）。
12. **连斩推迟**（粮草模式里 `comboReward()` 什么都不做）：`comboReward()` 时按“清除效果与连斩”的 press_delay 推迟 `nextPush`，两次下压之间累计不超过 `PRESS_DELAY_CAP_MS`。
13. **张飞“当阳一吼·吓退追兵”**（用户决定，2026-10-27，见“武将技能”规则 12）：`scareNextPush()` 设一个标记，**下一次到点的下压**被吓退（盘空时立刻的那一次不算，见规则 10）：不推行、不破城、不消耗波次，`nextPush = gameTime + interval`，`comboDelay_w = 0`，标记清掉。只有最下一行有兵（拒马不算）、且标记还没设时才算“有效果”（`canScare()`），否则一吼无用。
14. **危险时长** `dangerMs`：每次 `tick(dtGame)` 开始时（这一帧的点击已经处理完、本帧下压之前），如果最下一行有兵（拒马不算），`dangerMs += dtGame`。整回都累计（空行下压阶段照样有破城风险）。结束时向下取整。

**粮草有限（food）**

15. 满盘发牌，不限时，`tick` 不改变任何东西。
16. 初始粮草 `food = food_0`（公式 food_start）。
17. 扣粮：
    - `onMatch` 且不是赵云的一对（`forced = false`）：−1，发 `foodSpent {1, 'match'}`。（压境、粮草里的赵云暂保留旧规则“下一对同种兵必消”，用户决定 2026-10-30，见 Open Questions。）
    - `onMiss`：−1，`misses += 1`，发 `foodSpent {1, 'miss'}`。界面在粮数旁盖“−1”。
    - `onClear`（效果、技能的清除）：不扣。
18. 张飞“当阳一吼”：`addFood(ROAR_FOOD)`，可以超过开局值。
18a. **刘备“仁德”补粮**（用户决定 3，2026-10-30；数值 `LIU_FOOD` 归“武将技能”）：`refillFood(n)` **封顶到开局值** `food0`：`gain = max(0, min(n, food0 − food))`，`food += gain`，返回 `gain`；`gain > 0` 时发 `foodRefill {amount: gain}`，否则不发事件。`canRefill()` 在粮草模式且 `food < food0` 时为真，其他模式恒为假。刘备是“补回”，张飞是“抢来”：两者分开，`food` 被张飞抬到开局值以上时刘备补不了。补粮不改 `misses`。
19. **胜负**（在结算点查询）：盘面清空 → 胜利；否则 `food ≤ 0` → 失败“粮草断绝”。因为查询发生在效果结算之后，“消火把粮扣到 0、火烧清空盘面”判胜。

**敌将反击（boss）**

（本节按切片第四版两段血、第五版按步出手和特技、第六版层叠改写，用户 2026-10-28 至 2026-10-30 批准。）

20. **血量**：满盘发牌（用层叠，见“盘面与连通”）。敌将有一段或两段血：
    - 一阶段 `hp = hpMax = boss.hp`；回目没写 `boss.hp` 时取开局总对数（`deck` 总块数 ÷ 2，含压底的牌）。
    - 回目写了 `boss.phase2` 就有二阶段：必填 `phase2.hp`、`phase2.steps`，可选 `phase2.name`（如“暴怒吕布”）、`phase2.shout`（暴怒横幅）、`phase2.lines`（二阶段台词）、`phase2.specials`（特技轮换，规则 23a）。没写 `phase2` 的敌将只有一段血。
    - **一段血、无特技的敌将**（如第 3 回文丑 `wen_chou`，用户决定 1，2026-10-30）：回目不写 `phase2`。整回只有普通出手：没有暴怒、没有特技、没有预告（`forecast` 恒为 `null`）；诸葛亮 `breakSpecial()` 返回 `null`（规则 23c），只清兵；赵云护盾照常挡普通出手。
    - 血量不低于 0。一段血打空时多出来的伤害**不**带进下一段。
21. **伤害**：`onMatch` −1；`onClear` −`pairs`（效果、技能清掉几对就扣几，压在底下一起清掉的牌也算，见“盘面与连通”）。增兵和暴怒补兵**不加血**：它们只让盘面更挤、更难找对。
22. **步数** `steps`（0 到 `stepsMax`；一阶段 `stepsMax = boss.steps`，二阶段 `stepsMax = phase2.steps`），按事件发生的先后逐次计算：
    - **走一步**的定义：如果震慑 `stun > 0`，`stun −= 1`，`steps` 不变；否则 `steps = min(stepsMax, steps + 1)`。不管是否震慑，虎啸的镇住剩余步数都 −1（规则 23a），减到 0 就解除并发 `unseal`。
    - `onMatch`：走 `STEP_MATCH`（1）步。`onMiss`：走 `STEP_MISS`（2）步。`onClear`、放技能、点武将牌都**不算步**。
    - **不动就不涨**：`tick` 不改 `steps`。
    - `comboReward()`（连斩退步，与“清除效果与连斩”一致）：退 `cut = min(COMBO_PUSHBACK, COMBO_PUSHBACK_CAP − pushedSinceAttack, steps)` 步，`pushedSinceAttack += cut`，返回 `cut`；`cut = 0` 时什么都不做。对局流程先通知清除效果、再通知本系统（对局流程规则 6.3），所以打出三连斩的那一对是“先退 1 步、再走 1 步”。
    - 张飞 `roarBack(back, stun)`（当阳一吼，数值归“武将技能”：`ZHANG_PUSHBACK` 3、`ZHANG_STUN` 3）：`steps = max(0, steps − back)`，震慑设为 `stun`（覆盖，不累加）；不重置 `pushedSinceAttack`。
    - 慢速档 `slow=1`：开局时 `boss.steps`、`phase2.steps` 各乘 `SLOW_CHARGE_FACTOR`（1.5）后四舍五入（8 → 12、6 → 9）。倍率归“回目编排与难度”规则 14。
23. **出手**：每次 `tick` 先按规则 24 看要不要换阶段；没换阶段时，如果 `steps = stepsMax` 且 `hp > 0`，当场出手（血已打空时不出手，等结算点判胜或换阶段）：
    - 共同：`steps = 0`，`pushedSinceAttack = 0`；二阶段时出手序号 `attackNo += 1`（从 0 开始）。只有一段血的敌将没有二阶段，全部是普通出手。
    - 有护盾时这一次被挡下（规则 23b），不再往下走。
    - **一阶段**每次都是普通出手（用来教人）。**二阶段**轮流：`attackNo` 加 1 之前为偶数的那一次是特技（第 1、3、5……次），其余是普通出手。
    - **普通出手**：`hearts −= 1`；用盘面的 `rng('add')` 从增兵池（回目的 `pool`，缺省等于 `deck` 的对数）按权重抽 `boss.addPairs` 对（抽法同规则 8），调用 `addPairs`，只放空格（规则 3b），放不下的不放，照样扣心。台词按当前阶段的台词表依次轮换。申请 `hostAttack` 令牌 `HOST_ATTACK_MS`，发 `hostAttack {kind: 'normal', line, heart}`；丢掉的心在原位变成虚线。
23a. **特技**（只在二阶段）：不扣心、不增兵，只添乱。
    - **轮换列表**：按回目 `boss.phase2.specials` 的顺序轮换（第 `specialNo` 次特技取 `specials[specialNo mod specials.length]`）；回目没写时取缺省 `SPECIALS = ['sweep', 'charge', 'roar']`（吕布：画戟横扫 → 赤兔冲阵 → 虎啸 → 画戟横扫……）。合法 id：`sweep`、`charge`、`roar`、`chain`；列表非空，可以重复。空列表或有未知 id 时回目加载器拒绝加载。（用户决定 7，2026-10-30）
    - **显示名**：预告“下招：××”、特技横幅“××！”、诸葛亮的“破××”、`breakSpecial()` 返回的 `name`，都读 `enemies[boss.enemy].specialNames[id]`；没写或缺某个 id 时用缺省名 `SPECIAL_NAMES`：`sweep` 画戟横扫、`charge` 赤兔冲阵、`roar` 虎啸、`chain` 铁索连环。同一机制换名字只换文字，盘面上的东西样子不变（夏侯渊的 `charge` 叫“布鹿角”，放下的仍是拒马）。
    - 特技序号 `specialNo` 每轮到一次特技就 +1，不管这一招是生效、被护盾挡下还是被破。所有特技都用盘面的 `rng('wave')`（敌将模式不用波次，这条流空着）。
    - **画戟横扫** `sweep`：找出上层有兵的行里最上面的两行（拒马不算兵），把这两行**上层**的兵用随机流重新打乱位置。压底的牌、拒马、空格都不动，兵的总数和种类不变。玩家当前的选中清掉。
    - **赤兔冲阵** `charge`：在空格里随机放 `CHARGE_BLOCKS`（2）块拒马，空格不够就少放，一个都放不下也算出过这一招。拒马的规则（挡线、点不动、上下左右消掉一对就碎、不算兵、不算对）归“盘面与连通”。
    - **虎啸** `roar`：镇住出阵武将中“当前蓄力 ÷ 所需对数”最大的一位（并列时取出阵顺序靠前的；都为 0 时取第一位），`ROAR_SEAL`（3）步内不能放技能（剩余步数按规则 22 的“走一步”递减）；他的蓄力照常涨。已有镇住时改镇新目标。发 `seal {general, left}`。
    - **铁索连环** `chain`（曹操，用户决定 2，2026-10-30）：把盘上的兵就地连成营。重复 `CHAIN_PAIRS`（2）次：
      1. 候选兵种 `E` = 上层块数 ≥ 2 的兵种，去掉营、火、马、水（营换营没意义；效果兵不碰，火留给玩家），按兵种表顺序排。
      2. `E` 为空就停。否则用 `rng('wave')` 在 `E` 里等概率挑一种 `k`；再用同一条流在 `cellsOf(k)`（上层，行优先）里不放回地等概率挑 2 格。
      3. 调用盘面 `convertBlocks(这 2 格, 'ying')`：只改上层，底牌、拒马、位置都不动。
      - 每次只让一种兵 −2、营 +2，各兵种（含底牌）仍是偶数，I1 保持。一次都没换成（第一轮 `E` 就空）也算出过这一招，只播横幅。
      - 玩家当前的选中清掉（与画戟横扫一致，由 `convertBlocks` 负责）。
      - 设计意图：曹操的招就是他的破绽。盘上留着火时，营变多，火一烧清得更多；火已用完时，多出的营只是负担。玩家看见“下招：铁索连环”，就要决定“火先别消”。
    - 申请 `hostAttack` 令牌，横幅“××！”（特技显示名），发 `hostAttack {kind: 'special', special, cells | general}`（`chain` 的 `cells` 是被换成营的格子）。
23b. **护盾**（赵云 `raiseShield()`，敌将模式）：`shield = true`（已有护盾时赵云不能放，归“武将技能”）。下一次出手被挡下：`shield = false`，不扣心、不增兵、不放特技；这一次本该是特技的，`specialNo` 照样 +1（这一招跳过）。申请 `hostAttack` 令牌，横幅“赵云挡下！”，发 `hostAttack {kind: 'blocked'}`。护盾跨阶段保留。
23c. **破特技**（诸葛亮 `breakSpecial()`）：敌将有特技（这一回写了 `phase2`）、还没打完、且还没有“破”标记时有效；**一阶段放也有效，“破”标记留到二阶段的第一个特技**（用户决定，2026-10-30）：设 `broken = true`，返回 `{special, name, forecast}`。`special` 是下一个将轮到的特技；`forecast` 为真表示此刻预告正亮着（规则 23d）。其他情况（这一回没有二阶段、已经破过）返回 `null`。一阶段时 `special` 是二阶段的第一个特技，`forecast` 为假。诸葛亮据此出结果横幅（“清书 5 对 · 破赤兔冲阵”）；`forecast` 为假时界面在敌将框挂“破”字小标（用户决定，2026-10-30）。下一次轮到特技时（中间隔几次普通出手都一样）：`steps` 照常清零，什么都不发生，`broken = false`，`specialNo += 1`，申请 `hostAttack` 令牌，横幅“妙计已破”，发 `hostAttack {kind: 'broken', special}`。被护盾挡下的特技不消耗“破”标记，留给下一个特技。
23d. **预告**：二阶段、下一次出手是特技、且 `stepsMax − steps ≤ FORECAST_STEPS`（2）时，`hud().forecast = {id, name, broken}`（`name` 是显示名，规则 23a），界面在敌将框下亮“下招：××”；否则为 `null`。震慑中照样显示。
23e. **补心**（刘备“仁德”，用户决定 3，2026-10-30；数值 `LIU_HEAL` 归“武将技能”）：`healHeart(n)` 只在敌将模式有效：`gain = max(0, min(n, heartsMax − hearts))`，`hearts += gain`，返回 `gain`。补回的是最后丢的那几颗（原位虚线变实），每补回一颗发一次 `heal {heart}`（`heart` 的口径与 `hostAttack.heart` 相同：这颗心的位置）。`canHeal()` 在敌将模式、`hearts < heartsMax` 时为真，其他模式恒为假。补心不碰步数、震慑、护盾、镇住、“破”标记，不算步。心数永远不超过开局心数 `heartsMax`。
24. **暴怒（换阶段）**：有二阶段、还在一阶段、并且 `hp ≤ 0` 或盘面清空时，一阶段结束。这时 `outcome()` 返回 `null`（不算赢）。下一次 `tick`（`dtGame > 0`、没有令牌）当场：
    - `phase = 2`。数一数空格 `free`（上层没有兵也没有拒马的格子），用 `rng('add')` 按增兵池权重补 `floor(free / 2)` 对援军，只放空格（“补满援军”）。
    - `hp = hpMax = phase2.hp`，`stepsMax = phase2.steps`；`steps = 0`、`stun = 0`、`pushedSinceAttack = 0`；台词表换成 `phase2.lines`（没写就沿用），台词序号、`attackNo`、`specialNo` 都从 0 开始。护盾和镇住保留。
    - 发 `bossPhase {phase: 2, name}`，申请 `phase` 令牌 `PHASE_SHOW_MS`（1400 ms，停钟、锁盘），横幅 `phase2.shout`（如“吕布暴怒！”）。这一次 `tick` 不出手。
25. **胜负与判定顺序**（先看血、再出手）：
    - `outcome()`：一阶段刚结束、还没换阶段 → `null`；`hp ≤ 0` 或盘面清空 → 胜利；否则 `hearts == 0` → 失败“城破”。
    - `tick` 里先看换阶段，出手前再检查 `hp > 0`；对局流程在每次点击后的结算点先查 `outcome()`（对局流程规则 6.5）。所以打空血的最后一刀即使把步数走满，也不会再出手。
    - 最后一颗心被打掉时，等 `hostAttack` 演出播完、到结算点才判（对局流程规则 7）。

**查询与指标**

26. `hud()` 返回：
    - 压境 `{msToNextPush, wave, waves, bottomOccupied, scareArmed}`（`msToNextPush` 已含推迟）；
    - 粮草 `{food, food0, misses}`；
    - 敌将 `{hp, hpMax, phase, phases, steps, stepsMax, stepsLeft, hearts, heartsMax, stun, shield, seal: {general, left} | null, forecast, broken, pushedSinceAttack}`。界面的档位按剩余步数算：`stepsLeft ≤ BOSS_WARN_STEPS_1`（2）为 2 档，`stepsLeft ≤ BOSS_WARN_STEPS_2`（1）为 3 档（见“界面与交互”的 tier 公式）。
    - 另外 `canScare()` 供武将技能判断张飞在压境里有没有效果；`canHeal()`、`canRefill()` 供武将技能判断刘备的“补”这一半有没有效果（规则 18a、23e）；`sealed(general)` 返回这位武将被镇住的剩余步数（没被镇住为 0）。
27. `metrics()`：压境 `{dangerMs}`；粮草 `{foodLeft: max(0, food), misses}`；敌将 `{heartsLost: heartsMax − hearts}`，取**结束时**的值，即**净值**（用户决定 11，2026-10-30）：刘备补回的心算回来，丢 2 颗、补回 1 颗记 1（公式 hearts_net）。特技和被挡下的出手不扣心，所以不影响评星。

### States and Transitions

| 模式 | 状态 | 进入 | 离开 |
|---|---|---|---|
| press | 兵临（还有波次） | 开局 | 推完最后一波 → 空行下压；到点时最下一行有块 → 失败 |
| press | 空行下压 | 推完最后一波 | 盘面清空 → 胜利；到点时最下一行有块 → 失败 |
| food | 进行中 | 开局 | 结算点：盘面清空 → 胜利；`food ≤ 0` → 失败 |
| boss | 蓄力中（剩余步数 > 2） | 开局；出手后；换阶段后；连斩退步或一吼让剩余步数 > 2 | 剩余步数 ≤ 2 → 将满 |
| boss | 将满（剩余步数 ≤ 2；二阶段下一招是特技时亮预告） | 见上 | 步数走满 → 出手；退步后剩余步数 > 2 → 蓄力中 |
| boss | 出手（普通 / 特技 / 被挡 / 被破） | 步数走满且 `hp > 0` | `hostAttack` 演出结束 → 蓄力中；结算点 `hearts == 0` → 失败 |
| boss | 一阶段打空（待换阶段） | 有二阶段、一阶段 `hp ≤ 0` 或盘面清空 | 下一次 `tick` → 暴怒 |
| boss | 暴怒（换阶段演出） | 见上：补满援军、换血换步数 | `phase` 演出 1400 ms 结束 → 二阶段蓄力中 |
| boss | 打完 | 二阶段（或只有一段时）`hp ≤ 0` 或盘面清空 | 结算点 → 胜利 |

### Interactions with Other Systems

| 系统 | 方向 | 数据 | 接口归属 |
|---|---|---|---|
| 盘面与连通 | 上游 | 经对局流程收到 `match`、`miss`、`clear`；调用 `pushRowFromTop`（行里可含拒马）、`addPairs`、`shuffleTopRows`、`placeBlocks`、`convertBlocks`（铁索连环）（直接拿到结果，都只动空格或上层）；读 `bottomOccupied`、`isEmpty`、`cellsOf`、空格数；用 `rng('wave')`、`rng('add')`；拒马的规则（含压境里随行下移、推出盘面）归盘面 | 盘面 |
| 对局流程与时钟 | 上游 | 被调用 `tick`、`outcome`、`metrics`、`hud`；申请 `hostAttack`、`phase` 令牌 | 对局流程定义签名，本系统实现 |
| 清除效果与连斩 | 上游 | 被调用 `comboReward()`；推迟和退步的数值归清除效果 | 本系统实现 |
| 武将技能 | 双向 | 提供 `scareNextPush()`、`canScare()`、`addFood(n)`、`roarBack(back, stun)`、`raiseShield()`、`breakSpecial()`、`healHeart(n)`、`canHeal()`、`refillFood(n)`、`canRefill()`（刘备）、`sealed(general)`、`hud().shield`；读武将牌的蓄力和所需对数（虎啸挑目标） | 本系统 |
| 选将与解锁 | 上游（间接） | 虎啸只在出阵武将里挑目标，出阵顺序决定并列时选谁 | 选将 |
| 回目编排与难度 | 上游（数据） | `mode` 和参数、`cols`、`pool`、`waveList`（元素可为 `'jm'`）、`enemy`、`enemyLines`、`boss.hp`、`boss.steps`、`boss.phase2`（含 `phase2.specials`）、`enemies[id].specialNames`；敌将 `lv_bu`、`wen_chou`、`cao_cao`、`xiahou_yuan` | 合法范围由本系统定义，格式和加载校验归回目编排 |
| 进度、三星与存档 | 下游 | `metrics()` 经结果对象交过去 | 本系统 |
| 界面与交互 | 下游 | `hud()`、事件 `push`（含 `dropped`）、`lastWave`、`foodSpent`、`foodRefill`、`heal`、`hostAttack`（含 `special: 'chain'` 的 `cells`，界面要让被换的块看得出“刚变的”）、`bossPhase`、`seal`、`unseal` | 本系统 |

## Formulas

The press_schedule formula is defined as:

`nextPush_0 = interval`；每次下压（或被吓退的下压）后 `nextPush = gameTime + interval`；期间 `nextPush += comboDelay（≤ PRESS_DELAY_CAP_MS）`

**Variables:**
| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| interval | int | 4000–12000 ms | data file | 下压间隔；MVP 第二回 7000 |
| waves | int | 4–16 | data file | 有新兵的下压次数；MVP 第二回 8 |
| startRows | int | 3–5 | data file | 开局行数；MVP 第二回 4 |
| comboDelay | int | 0–PRESS_DELAY_CAP_MS | calculated | 连斩推迟（见“清除效果与连斩”） |
| scare | bool | — | calculated | 张飞吓退标记：为真时下一次下压取消 |

**Output Range:** 不清任何块时，开局最下面一行在第 `9 − startRows` 次下压时破城（startRows = 4 → 第 5 次，约 35 秒）。拒马不算兵：最下一行只有拒马时照常下压，拒马被推出盘面（规则 9a），不提前破城。
**Example:** interval 7000、waves 8、不推迟 → 下压发生在 7、14、21……56 秒（有兵），63、70……秒（空行），直到清空或破城。

The press_deadline formula is defined as（压境一回的时间上限和手速要求）:

`T_max ≈ (waves + 8) × interval`；`wavePairs = floor(cols / 2)`；`r_need ≈ 1000 × wavePairs / interval`（对/秒，interval 以毫秒计；稳态下每秒要清的对数）；`P_press = startRows × cols / 2 + waves × wavePairs`（一回要清的总对数；5 列每波只有 2 对，不能按 `(startRows + waves) × cols / 2` 算，草稿 F10，2026-10-30）；拒马不算对，不进 `P_press`

**Variables:**
| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| waves、interval | — | 见上 | data file | — |
| cols | int | 5–6 | data file | 盘面列数，缺省 6；每一波的长度 |
| wavePairs | int | 2–3 | calculated | 每一波的对数：5 列 2 对（空 1 格或 1 块拒马），6 列 3 对 |
| startRows | int | 3–5 | data file | 开局行数；`startRows × cols` 必须是偶数（deck_valid），5 列时只能取 4 |
| P_press | int | 18–63 | calculated | 一回要清的总对数。最小 18：5 列、startRows 4、waves 4；最大 63：6 列、startRows 5、waves 16。5 列 startRows 4 时为 `10 + 2 × waves` |
| 8 | int | 8 | constant | 压境盘的行数：第 k 次下压放进的那一行，在第 k + 8 次下压时如果还没清空就破城 |

**Output Range:** T_max 是一回的上限（不含推迟）；玩家平均手速低于 r_need 时，盘会越来越满，靠开局空出的 `8 − startRows` 行、效果和技能撑住。
**Example:** 6 列、waves 8、interval 7000 → T_max ≈ 112 秒；r_need ≈ 0.43 对/秒。开发者约 0.5 对/秒能跟上；0.25 对/秒的玩家每秒落后约 0.18 对，开局 4 个空行（12 对）大约 60–70 秒用完。改成 5 列（正式版默认）后 r_need ≈ 0.29 对/秒、开局 4 个空行只能缓冲 4 波、8 对：压力明显变松，回目的 interval 和 waves 由关卡设计按 5 列重排。第 6 回草稿（5 列、startRows 4、waves 8、interval 8000）：`P_press = 10 + 8 × 2 = 26` 对（3 块拒马不算），`T_max ≈ 16 × 8 = 128` 秒，`r_need = 0.25` 对/秒。

The food_start formula is defined as:

`food_0 = pairs − wipePairs + slack`，其中 `pairs = Σ deck[k] / 2`，`wipePairs = Σ_{e∈效果兵, deck[e]>0} deck[target(e)] / 2`

**Variables:**
| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| deck[k] | int | 0–48 | data file | 兵种块数 |
| target(e) | kind | — | constant | 火 → 营、马 → 弓、水 → 城 |
| slack | int | 0–6 | data file | 余量；MVP 默认 2 |

**Output Range:** 1–30（最大盘 24 对、slack 6）；MVP 回目通常 12–20。`slack = 0` 时，只有每个效果都在目标还全部在盘上时放出，且一次都不连错，才能赢（判负发生在效果结算之后，所以这条路是通的）。
**Example:** 8 × 6 盘，deck = 火 2、营 6、马 2、弓 6、水 2、城 8、刀 4、鼓 4、盾 4、书 4、旗 6 → pairs = 24，wipePairs = 3 + 3 + 4 = 10，food_0 = 16。

The boss_steps formula is defined as（切片第五版，用户 2026-10-28 批准）:

按事件先后逐次计算：`onMatch`：走 `STEP_MATCH` 步；`onMiss`：走 `STEP_MISS` 步；走一步 = `stun > 0 ? stun −= 1 : steps = min(stepsMax, steps + 1)`；`comboReward`：`steps −= min(COMBO_PUSHBACK, COMBO_PUSHBACK_CAP − pushedSinceAttack, steps)`；`roarBack`：`steps = max(0, steps − ZHANG_PUSHBACK)`，`stun = ZHANG_STUN`；`tick` 时 `steps = stepsMax` 且 `hp > 0` 触发出手

**Variables:**
| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| steps | int | 0–stepsMax | calculated | 当前步数（蓄力点亮了几颗） |
| boss.steps | int | 3–20 | data file | 一阶段蓄满的步数；第一回 8 |
| phase2.steps | int | 3–20 | data file | 二阶段蓄满的步数；第一回 6 |
| STEP_MATCH | int | 1 | constant | 连上一对走几步 |
| STEP_MISS | int | 1–3 | data file | 连错一次走几步，默认 2 |
| COMBO_PUSHBACK / COMBO_PUSHBACK_CAP | int | 1 / 1–3 | clear-effects | 连斩每次退几步、两次出手之间最多退几步，默认 1 / 2 |
| ZHANG_PUSHBACK / ZHANG_STUN | int | 1–5 / 0–5 | general-skills | 张飞退几步、震慑几步，默认 3 / 3 |
| SLOW_CHARGE_FACTOR | float | 1.0–2.0 | chapter-design | 慢速档步数倍率 1.5，开局时四舍五入 |
| hearts | int | 1–5 | data file | 初始心数，默认 3 |
| boss.addPairs | int | 0–4 | data file | 每次普通出手的增兵对数，读回目字段；`BOSS_ADD_PAIRS` 是它的推荐值 2 和安全范围 |

**Output Range:** 0–stepsMax。一个阶段里的出手次数约为：

`attacks_p ≈ floor((M_p + STEP_MISS × X_p − P_p − Z_p) / stepsMax_p)`

其中 `M_p` 是这一阶段连上的对数（约等于 `hp_p` 减去效果和技能打掉的血），`X_p` 是连错次数，`P_p` 是连斩退掉的步数（每个出手周期最多 `COMBO_PUSHBACK_CAP`），`Z_p` 是张飞抵掉的步数（每次最多 `ZHANG_PUSHBACK + ZHANG_STUN` = 6）。挨打数 = 一阶段出手数 + 二阶段普通出手数（约 `floor(attacks_2 / 2)`）− 被护盾挡下的普通出手数；评星用的丢心数再减去刘备补回的心（公式 hearts_net）。只有一段血的敌将（文丑）全部出手都是普通出手。
**Example:** 第一回（一阶段 hp 12、8 步；二阶段 hp 18、6 步）：
- 一阶段一次不错、没有连斩和效果：M = 12 → 第 8 对时出手 1 次，丢 1 心。消一对火烧掉 3 对营（这一对打 4 血）并打出连斩：M ≈ 9，9 − 2 = 7 < 8 → 不出手。
- 二阶段：技能和效果打掉约 7 血，M ≈ 11，连错 1 次（+2），连斩退 2 → 11 → 出手 1 次，是第一个特技“画戟横扫”，不扣心。
- 同一局 `slow=1`（12 / 9 步）：两段都不出手。
- 切片模拟器（理想玩家，用技能）：连错比例 0 → 胜率 100%；0.2 → 95%；0.3 → 75%（DESIGN-v6）。层叠增加的“找对难”模拟不出来，要靠试玩。

The boss_damage formula is defined as:

`hp' = max(0, hp − pairsRemoved)`；一阶段 `hpMax = boss.hp`（缺省为开局总对数），二阶段 `hpMax = phase2.hp`；一段血打空时多出的伤害不带进下一段

**Variables:**
| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| pairsRemoved | int | 1–30 | calculated | 本次清掉的对数：`match` 为 1；`clear` 为它的 `pairs`（含压底的牌） |
| boss.hp | int | 1–60 | data file | 一阶段血量；第一回 12 |
| phase2.hp | int | 1–60 | data file | 二阶段血量；第一回 18 |

**Output Range:** 只有一段血时 `hp = 0` 即胜利；有两段时一阶段 `hp = 0` 进入暴怒，二阶段 `hp = 0` 胜利。
**Example:** 第一回一阶段 hp = 4；玩家消掉一对火（−1），火烧掉 6 块营（−3），hp = 0 → 暴怒，二阶段 hp = 18。如果火烧掉的是 8 块营（−4），多出的 1 点不带进二阶段。

The hearts_net formula is defined as（评星的丢心数，用户决定 11，2026-10-30）:

`heartsLost = heartsMax − hearts_end = hits − healed`，其中 `hearts` 全程满足 `0 ≤ hearts ≤ heartsMax`

**Variables:**
| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| heartsMax | int | 1–5 | data file | 开局心数（`boss.hearts`，缺省 3）；补心的上限 |
| hearts_end | int | 0–heartsMax | calculated | 结束时的心数 |
| hits | int | 0–∞ | calculated | 扣心的普通出手次数（被挡下的不算） |
| healed | int | 0–hits | calculated | 刘备实际补回的心数（每次 `healHeart` 的返回值之和；心满时补 0） |
| heartsLost | int | 0–heartsMax | calculated | 评星指标；赢时 0 到 heartsMax − 1 |

**Output Range:** 0 到 heartsMax。不会为负：`healHeart` 只补实际缺的心（`gain ≤ heartsMax − hearts`），所以 `healed ≤ hits`，两种写法恒等。等于 heartsMax 时已经输了，不评星。
**Example:** 3 颗心，挨打 2 次（hearts 1），刘备补 1 颗（hearts 2），又挨打 1 次（hearts 1），赢 → `heartsLost = 3 − 1 = 2`（= 3 次挨打 − 1 颗补回）→ 1 星。同一局不放刘备 → `heartsLost = 3`，即输。

The chain_convert formula is defined as（曹操铁索连环，草稿 3.3）:

重复 `CHAIN_PAIRS` 次：`E = {k ∉ {ying, huo, ma, shui} : topCount(k) ≥ 2}`；`E` 为空则停；否则 `k = E[floor(u₁ × |E|)]`，在 `cellsOf(k)` 里不放回取 2 格，换成 `ying`。`converted = 2 × 成功轮数`

**Variables:**
| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| CHAIN_PAIRS | int | 1–3 | constant | 每次铁索连环换几对，缺省 2 |
| topCount(k) | int | 0–rows × cols | calculated | 兵种 k 在上层的块数（`cellsOf(k)` 的长度） |
| E | list | 0–8 种 | calculated | 候选兵种，按兵种表顺序 |
| u₁ | float | [0, 1) | `rng('wave')` | 挑兵种用的随机数；挑格子再从同一条流各取一次 |
| converted | int | 0–2 × CHAIN_PAIRS | calculated | 实际换成营的块数 |

**Output Range:** 0 到 `2 × CHAIN_PAIRS`（缺省 0–4）。营的总数（含底牌）增加 `converted`，被挑中的兵种各减 2 的倍数，各兵种仍为偶数（I1）。
**Example:** 上层书 4、旗 2、营 4、火 2，其余兵种上层都少于 2 块 → 第一轮 E = {书, 旗}（兵种表顺序：书在旗前）；挑到书，书 4 → 2、营 4 → 6；第二轮 E 仍是 {书, 旗}，挑到旗，旗 2 → 0、营 6 → 8。converted = 4。盘上还有那 1 对火时，火一烧清掉 8 块上层营（加底下的营）。

The phase2_refill formula is defined as:

`refillPairs = floor(free / 2)`，`free` = 换阶段那一刻上层没有兵也没有拒马的格子数

**Variables:**
| Variable | Type | Range | Source | Description |
|----------|------|-------|--------|-------------|
| free | int | 0–rows × cols | calculated | 空格数 |

**Output Range:** 0 到 `floor(rows × cols / 2)`（5 × 6 盘最多 15 对）。补的兵只放空格，不压底。
**Example:** 5 × 6 盘，一阶段打完时盘上还剩 11 块兵（另有若干压底的牌），free = 19 → 补 9 对，剩 1 个空格。

## Edge Cases

- **如果下压到点的那一刻最下一行有块**：记“破城”，不下压。玩家的点击在同一帧先处理（对局流程规则 6），所以最后一刻的消除如果让最下一行空了，就不会破城。
- **如果效果或技能演出正在进行**：时钟暂停，不调用 `tick`，下压和出手都不发生。敌将的步数在点击时已经走了，满了的出手等演出结束后的第一次 `tick`。
- **如果压境里盘面清空但还有波次**：下一次 `tick` 立刻下压下一波，`nextPush = gameTime + interval`，连斩推迟清零。
- **如果压境的波次用完、盘上还有块**：继续每 `interval` 下压空行，直到清空（胜）或破城（负）。
- **如果压境回目是 5 列**：每一波 2 对加 1 个空格；空格的列位随打乱决定，`waveList` 里写成 `null`，或写成 `'jm'` 放一块拒马（规则 9a）。
- **如果压境下压时最下一行只有拒马**：不算破城，照常下压；这些拒马被推出盘面，记进 `push.dropped`，不播碎裂。
- **如果压境里盘上只剩拒马**：`isEmpty()` 为真。还有波次就立刻下压下一波（拒马随行下移）；波次已用完就判胜，拒马留在盘上不影响。
- **如果压境里拒马停在最下一行**：不累计 `dangerMs`，`hud().bottomOccupied` 为假，张飞 `canScare()` 不因它为真。
- **如果压境里赵云待命、强制消除的一对挨着拒马**：拒马不碎（只有 `forced = false` 的一对碎拒马，见“盘面与连通”规则 9）。
- **如果 6 列压境回目的 `waveList` 写了 `'jm'`**：6 列每波 3 对、没有空位，`null + jm` 必须为 0 → 拒绝加载。
- **如果 `boss.phase2.specials` 是空列表、含未知 id，或不是列表**：拒绝加载，报回目 id 和字段。没写时用缺省 `SPECIALS`。
- **如果 `enemies[id].specialNames` 缺某个 id**：这一招用缺省名（`SPECIAL_NAMES`）。
- **如果敌将没写 `phase2`（一段血，如文丑）**：没有特技、没有预告、没有暴怒；诸葛亮 `breakSpecial()` 返回 `null`，只清兵；赵云护盾挡普通出手。
- **如果铁索连环时没有候选兵种**（上层只剩营、火、马、水，或其余兵种上层都不足 2 块）：一块都不换，照样播横幅“××！”、`steps` 清零、`specialNo + 1`。
- **如果铁索连环的第一轮之后候选兵种用完**：只换第一轮的 2 块，`cells` 只有 2 格。
- **如果铁索连环挑中的兵种有一张压在底下**（上层单数块）：只换上层的 2 块，底牌不动；这种兵总数减 2，仍为偶数。
- **如果铁索连环换掉的是玩家选中的块**：选中照样清掉（每次铁索连环都清选中）。
- **如果铁索连环之后上层没有可连对**：本系统不管，演出结束后的结算点 `ensurePlayable()` 洗牌。
- **如果护盾挡下铁索连环、或铁索连环已被诸葛亮破**：一块都不换，照规则 23b、23c；挡下时“破”标记保留。
- **如果刘备补心时心是满的**：`healHeart` 返回 0，不发 `heal`；武将技能据 `canHeal()` 判断这一半无效果。
- **如果刘备补心之后又被打**：照常扣心；评星按结束时的净值（公式 hearts_net）。
- **如果刘备补粮时 `food ≥ food0`**（例如张飞一吼让粮超过开局值）：`refillFood` 返回 0，不发 `foodRefill`。
- **如果刘备补粮时只差 1 份**：补 1 份，`foodRefill {amount: 1}`，不超过 `food0`。
- **如果在压境调用 `healHeart` 或 `refillFood`**：返回 0，什么都不变（压境里刘备只送蓄力，归“武将技能”）。
- **如果玩家一直不动（敌将模式）**：步数不涨，敌将永远不出手。这是设计意图（“想清楚再动手不吃亏”），不算漏洞：不动也赢不了，只是不输。
- **如果敌将出手时盘上空格少于 4 个**：能放几对放几对，放不下就不放，照样扣心。增兵从不压到底下。
- **如果最后一刀打空了血，同时把步数走满**：结算点先判胜（二阶段）或进入待换阶段（一阶段），`tick` 里出手前检查 `hp > 0`，不出手。
- **如果一阶段没打空血但盘面清空了**（效果、技能连底牌一起清光）：同样进入暴怒，补满援军。
- **如果一阶段打空时步数已满或有震慑**：换阶段时步数和震慑都清零；护盾和镇住保留到二阶段。
- **如果换阶段那一刻没有空格**：补 0 对，照常换血、播暴怒演出；之后的结算点照常检查死局。
- **如果画戟横扫时上层有兵的行不到两行**：只打乱有的那一行；只剩一块兵时打乱没有变化，照样算出过这一招。横扫后可能成死局，由演出结束后的结算点 `ensurePlayable()` 处理。
- **如果画戟横扫的行里有拒马、空格或压底的牌**：都不动，只换上层兵的位置。
- **如果赤兔冲阵时空格不够 2 个**：有几个放几个，0 个就只播横幅。
- **如果虎啸时出阵武将都没有蓄力**：镇住出阵顺序第一位。出阵武将为空（数据不允许，见“选将与解锁”）时什么都不镇。
- **如果虎啸镇住的武将本来就已就绪**：仍然镇住，蓄力不清，镇住解除后可以立刻放。
- **如果护盾挡下的是特技、而“破”标记还在**：特技跳过、轮换前进一格，“破”标记留给下一个特技。
- **如果诸葛亮在一阶段放技能**：清兵，并挂上“破”标记；敌将框挂“破”字小标，换阶段时保留，二阶段第一个特技被破（用户决定，2026-10-30）。这一回没有二阶段时返回 `null`，只清兵。
- **如果诸葛亮放技能时已经有“破”标记**：`breakSpecial()` 返回 `null`，不叠加，只清兵。
- **如果张飞一吼时已在震慑中**：震慑改为 3（覆盖），步数再退 3。
- **如果三连斩的那一对同时让步数走满**：先退 1 步再走 1 步，步数不会走满（只有本周期退步额度已用完时才会走满）。
- **如果敌将出手的同一帧玩家清空了盘面**：玩家点击先处理；到结算点 `hp` 或盘面清空先判胜（或换阶段），不再出手。
- **如果最后一颗心被打掉**：先播 `hostAttack` 演出（心变虚线），演出结束后的结算点判“城破”。
- **如果粮草恰好在最后一对消除时归零**：盘面已空，判胜。
- **如果粮草在一次连不上之后归零**：结算点判“粮草断绝”。
- **如果粮草被扣到 0 时还有一个效果在结算**：等效果清完再判；清完盘空就判胜，否则判负。
- **如果张飞的一吼让粮超过初始值**：允许，不设上限。
- **如果敌将步数已被退到 0**：连斩退步返回 0、不画斩痕；张飞一吼照样设震慑；步数不会变成负数。
- **如果回目参数超出合法范围**（例如 `interval` 不在 4000–12000、`boss.steps` 或 `phase2.steps` 不在 3–20、`waves` < 1、写了 `phase2` 却缺 `hp` 或 `steps`）：回目加载器拒绝加载这一回，开发版报错并给出回目 id 和字段。旧字段 `boss.chargeMs`、`phase2.chargeMs` 不再使用：出现时只警告。
- **如果压境回目的池为空或有非正整数权重，或 `waveList` 的某一项不是 `cols` 个元素、兵不是 `floor(cols / 2)` 对、`null` 与 `'jm'` 合计不等于 `cols − 2 × floor(cols / 2)`、有不认识的元素、某种兵在一项里是单数块，或 `waveList` 长度不等于 `waves`**：拒绝加载。

## Dependencies

- **依赖（上游）**：盘面与连通（硬：下压（行里可含拒马）、增兵、横扫、拒马、换兵 `convertBlocks`、空格、最下一行、随机流）、对局流程与时钟（硬：`tick`、`outcome` 查询、`hostAttack` 和 `phase` 令牌；两边互为上下游，用“对局流程只查询 `outcome()`、本系统从不主动结束一回”解开循环）、清除效果与连斩（硬：`comboReward`、效果的 `clear`）、选将与解锁（design/gdd/general-loadout.md；软：虎啸只在出阵武将里挑目标）。
- **被依赖（下游）**：武将技能（硬：张飞、赵云、诸葛亮、刘备的接口，`sealed()`、`canScare()`、`healHeart()`、`canHeal()`、`refillFood()`、`canRefill()`、`hud().shield`；本系统反过来读武将牌的蓄力挑虎啸目标）、进度三星与存档（硬：评星指标）、界面与交互（硬：`hud()` 和事件）、难度与无障碍选项（Alpha，软：慢速档调整参数）、回目编排与难度（数据双向：回目填参数，本系统定义合法范围）。

## Tuning Knobs

| 名称 | 默认（MVP） | 安全范围 | 调高 | 调低 | 相互影响 |
|---|---|---|---|---|---|
| press.interval | 7000 ms | 6000–12000 | 压境变松 | r_need 变大，中老年跟不上 | r_need = 1000 × wavePairs / interval（对/秒） |
| press.startRows | 4 | 3–5 | 开局缓冲少，更急 | 前几波太闲 | 8 − startRows 是开局的缓冲行数 |
| press.waves | 8 | 6–12 | 一回变长 | 一回太短 | T_max ≈ (waves + 8) × interval |
| cols（每回） | 6（正式版按 5 编排） | 5–6 | 6 列：棋子小，压境每波 3 对 | 5 列：棋子大（66–72 px），压境每波 2 对 | 列数归“回目编排与难度”，这里只决定波长 |
| food.slack | 2 | 1–4 | 不需要计划 | 一次失误就输 | 与效果兵数量强相关 |
| boss.steps | 8（第一回） | 5–12 | 一阶段几乎不出手，教不会“出手” | 一阶段就丢光心 | 一阶段只有普通出手，用来教人；出手数见 boss_steps |
| phase2.steps | 6（第一回） | 4–10 | 二阶段特技看不全 | 特技和出手接连不断 | 试玩嫌简单时先试 6 / 5（DESIGN-v6：偶尔连错时用技能胜率 83%、不用 28%） |
| boss.hp | 12（第一回） | 6–30 | 一阶段拖长 | 暴怒来得太快 | 不写时取开局总对数 |
| phase2.hp | 18（第一回） | 8–40 | 二阶段拖长，特技次数多 | 特技来不及出 | 补满援军后盘上约 15 对 + 压底的牌 |
| boss.hearts | 3 | 2–4 | 宽松 | 一次失手就输 | 评星按丢心数（见“进度、三星与存档”） |
| STEP_MISS | 2 | 1–3 | 乱点惩罚重 | 乱点和连上一样 | STEP_MATCH 固定为 1 |
| boss.addPairs（推荐值 `BOSS_ADD_PAIRS`） | 2 | 1–3 | 出手后盘更挤 | 出手只扣心 | 回目字段，不影响血量 |
| FORECAST_STEPS | 2 | 1–3 | 预告亮太久，失去悬念 | 来不及应对（赵云要 3 对盾） | 与 BOSS_WARN_STEPS_1 一致最好读 |
| CHARGE_BLOCKS | 2 | 1–3 | 拒马堵死盘面 | 赤兔冲阵没感觉 | 只放空格 |
| CHAIN_PAIRS | 2 | 1–3 | 营一家独大，火一烧几乎清盘，留火的回报太大 | 铁索连环没感觉，“留火”不值得 | 5 × 6 层叠盘上层约 30 块，换 4 块；与回目 deck 里火的对数、`pool` 里有没有火强相关（草稿建议第 9 回 `pool` 放火 1）。未跑模拟 |
| `waveList` 里的拒马数（每回） | 第 6 回 3 块（8 波） | 0 到 waves（5 列每波最多 1 块） | 找线更难，关羽必须斩拒马排 | 拒马形同虚设 | 只在 5 列回目可写；不改 `P_press` |
| ROAR_SEAL | 3 | 2–5 | 被镇的武将整段用不上 | 虎啸没感觉 | 按步递减，连错算 2 步 |
| BOSS_WARN_STEPS_1 / BOSS_WARN_STEPS_2 | 2 / 1 | 1–3，且前者 > 后者 | 预警早，一直在预警 | 预警来不及 | 取代原来的 70% / 90% 两条线 |
| HOST_ATTACK_MS | 600 | 400–600 | 出手演出拖沓 | 来不及看清 | 美术圣经 R5 要求 ≤ 600 |
| PHASE_SHOW_MS | 1400 | 1000–2000 | 暴怒演出拖沓 | 来不及看清“吕布暴怒” | 停钟、锁盘；必须小于 TOKEN_MAX_MS |

`SPECIALS` 的顺序（画戟横扫、赤兔冲阵、虎啸）是吕布的缺省轮换，是数据，不是调参：先教“盘会乱”，再教“拒马要破”，最后教“技能会被封”。其他敌将用回目 `boss.phase2.specials` 换顺序（草稿：曹操 `['chain']`，夏侯渊 `['charge', 'roar']`），用 `enemies[id].specialNames` 换显示名（夏侯渊 `charge` 叫“布鹿角”）；缺省名表 `SPECIAL_NAMES` 也是数据。刘备的 `LIU_HEAL`（1）、`LIU_FOOD`（2）归“武将技能”，本系统只负责封顶（心不超过 `heartsMax`，粮不超过 `food0`）。张飞的 `ZHANG_PUSHBACK`、`ZHANG_STUN` 和粮草里的 `ROAR_FOOD` 归“武将技能”；压境里的吓退没有数值。连斩退步 `COMBO_PUSHBACK`、`COMBO_PUSHBACK_CAP` 归“清除效果与连斩”。慢速档的倍率和安全范围以“回目编排与难度”规则 14 为准（`interval × 1.3`、步数 × 1.5 四舍五入）。

## Visual/Audio Requirements

依据美术圣经第 2 节③④⑤、第 3 节、第 4 节、第 7 节：

- **压境**：台面下沿画墨青城垛线（一档 ≥ 2 px 虚线，二档起 ≥ 4 px 实线），警戒区（最下一行）铺浅墨青；冷色从下面渗进来；下压时整盘作为一个容器下移 240 ms；波次条的齿头随档位变长。空行下压阶段，波次读数显示“最后一波已过”，倒计时照常。不闪烁，降档时当前档至少停 1000 ms。
- **粮草**：粮袋格（实心表示有、虚线表示没有）；粮数 ≤ 3 时换到墨青底牌上并放大，整体转冷。全程不动、不闪。连不上时在粮数旁盖“−1”。
- **敌将**（切片第四、五版；具体样式归“界面与交互”）：台眉上是敌将方框（外缘一圈齿）、血量数字加 ≤ 6 px 的细条（标“血”字，有两段血时标出第几段）、一排蓄力圆点，旁边写“还有 N 步出手”；剩 2 步时敌将下探 4 px、换发作脸、墨青锯齿晕加深，剩 1 步再加一级；二阶段预告时框下亮“下招：××”。连错时一个“+2”飞进蓄力点；连斩退步时显示“压住一步”，一道朱色斩痕划过蓄力点。普通出手时一道劈痕从敌将飞到被扣的那颗心，心碎成虚线，喊字位显示台词（墨青横幅）。特技、“赵云挡下！”“妙计已破”用横幅。状态小标：护盾（心旁一个“盾”字印）、震慑（敌将框旁“震 N”）、镇住（武将牌变灰写“镇 N”）、破（敌将框旁“破”字）。拒马是深木色的“拒”字块。
- **暴怒**：压暗，墨团上出现暴怒头像，横幅“吕布暴怒！”，盘面震一下，手机震 60 ms；之后敌将框、头像圈和血条换朱色。共 `PHASE_SHOW_MS` 1400 ms。（盘面震动是美术圣经“不震屏”的例外，待美术确认，见 Open Questions。）
- 判负的结算画面见“对局流程与时钟”（不震屏、不出红叉）。
- 音效（完整版）：压境的鼓点、敌将出手的喝声。

`art-director` 未单独咨询（lean 模式）；以上取自美术圣经。

## Game Feel

- 威胁要**看得见、读得懂**：每种压力只有一个主读数（下一次下压的倒计时 / 粮数 / “还有 N 步出手”），放在台眉固定位置。
- 输要输在玩家自己手上：判负前总有可见的预警（城垛线换档、粮数变冷、剩 2 步进入将满档、特技提前 2 步预告）。敌将按步出手，所以玩家停下来想多久都不会挨打。
- 救回来的感觉：最后一刻的消除、张飞一吼、三连斩退步、赵云挡下、诸葛亮破招，都要让玩家看见“局面被扳回来”的那一下。

## UI Requirements

台眉上的压力读数（三种布局）、盘面下沿的城垛线和警戒区、敌将框、粮袋格。见“界面与交互”。

## Cross-References

| 本文提到 | 来源 | 内容 |
|---|---|---|
| `pushRowFromTop`、`addPairs`、`shuffleTopRows`、`placeBlocks`、`convertBlocks`、拒马（含压境里随行下移）、层叠、最下一行、`wave`/`add` 随机流 | design/gdd/board-link.md | 规则 3、9、13、16 |
| 刘备“仁德”、`LIU_HEAL`、`LIU_FOOD` | design/gdd/general-skills.md | 待“武将技能”并入刘备后补节号 |
| `tick`、`outcome`、结算点、`hostAttack` 和 `phase` 令牌 | design/gdd/round-flow.md | 规则 4、6、7 |
| `comboReward`、推迟和退步的数值、效果的清除 | design/gdd/clear-effects.md | 规则 5、8 |
| 张飞、赵云、诸葛亮的技能和数值，被镇住时的提示 | design/gdd/general-skills.md | — |
| 出阵武将（虎啸的目标范围） | design/gdd/general-loadout.md | 规则 14 |
| 回目参数、`cols`、`pool`、`waveList`、敌将、两段血、慢速档 | design/gdd/chapter-design.md | 规则 14 |
| 切片规则和代码 | prototypes/hulao-vertical-slice/DESIGN-v5.md、DESIGN-v6.md、README.md（第四版）、`src/rules/battle-pressure.mjs` | 本次改写的来源 |
| 评星指标 | design/gdd/progress-save.md | — |
| 压力的视觉语言 | design/art/art-bible.md 第 2、3、4、7 节 | — |
| 原型实测 | prototypes/yali-concept/REPORT.md | 参数初值的来源 |

## Acceptance Criteria

- **GIVEN** 压境、startRows 4、interval 7000、玩家不操作，**WHEN** 以固定步长 dtGame = 10 ms 推进到 35000 ms，**THEN** 第 5 次到点时最下一行有块，结算点 `outcome()` 返回失败“破城”。
- **GIVEN** 压境、最下一行为空，**WHEN** 到点，**THEN** 全盘下移一行，第 1 行是波次表的下一行（6 列 3 对；5 列 2 对加 1 个空格），每种兵仍为偶数，`wave + 1`，`nextPush = gameTime + 7000`。
- **GIVEN** 同一 `seed` 的两局，一局洗牌 0 次、一局洗牌 2 次，**WHEN** 比较波次表，**THEN** 完全相同。
- **GIVEN** 压境、还有波次，**WHEN** 玩家把盘面清空，**THEN** 下一次 `tick` 立刻下压下一波，`outcome()` 不判胜。
- **GIVEN** 压境、8 波已推完、盘上还有块，**WHEN** 又过了一个 interval，**THEN** 下压一行空行，`push.empty = true`。
- **GIVEN** 压境、8 波已推完，**WHEN** 玩家清空盘面，**THEN** `outcome()` 判胜。
- **GIVEN** 压境、最下一行有块、距下一次下压 2000 ms，**WHEN** 张飞一吼，**THEN** 到点时不下压、不破城、`wave` 不变，`nextPush = gameTime + 7000`；**GIVEN** 最下一行为空，**THEN** `canScare()` 为假（一吼无用）。
- **GIVEN** 压境、吓退标记已设、还有波次，**WHEN** 玩家把盘面清空，**THEN** 下一次 `tick` 照常立刻下压，`hud().scareArmed` 仍为真；下一次到点的下压被吓退。
- **GIVEN** 压境、`cols = 5`、没写 `waveList`，**WHEN** 生成波次表，**THEN** 每一行 5 格：2 对兵加 1 个空格，同一 `seed` 结果相同。
- **GIVEN** 压境，**WHEN** 最下一行有块的状态持续了游戏时间 2500.6 ms，**THEN** 结束时 `dangerMs = 2500`。
- **GIVEN** 粮草、food_0 = 16，**WHEN** 玩家正常消一对，**THEN** food = 15；**WHEN** 连不上一次，**THEN** food = 14、misses = 1。
- **GIVEN** 粮草、food = 5，**WHEN** 赵云的一对（`forced = true`）消除，**THEN** food 仍是 5。
- **GIVEN** 粮草、food = 1、盘上还有 4 块，**WHEN** 连不上一次，**THEN** 结算点 `outcome()` 返回失败“粮草断绝”。
- **GIVEN** 粮草、food = 1、盘上只剩一对火和三对营，**WHEN** 消火，**THEN** food = 0，效果清完营后结算点判胜。
- **GIVEN** 粮草、盘上有 6 块营，**WHEN** 消一对火，**THEN** 只扣 1 份粮。
- **GIVEN** 粮草、food = 2，**WHEN** 张飞一吼，**THEN** food = 5。
- **GIVEN** 敌将、一阶段 steps 0 / 8，**WHEN** 无操作经过游戏时间 60000 ms，**THEN** steps 仍为 0，没有出手。
- **GIVEN** 敌将、steps 0，**WHEN** 连上一对，**THEN** steps = 1；**WHEN** 连错一次，**THEN** steps = 3。
- **GIVEN** 敌将、一阶段 steps 7 / 8、hp 5、没有护盾、盘上至少 4 个空格，**WHEN** 连上一对（不构成三连斩），**THEN** 同一帧的 `tick` 里出手一次：hearts − 1，盘上多 2 对且都在原来的空格上（压底的牌数不变），steps = 0，`pushedSinceAttack = 0`；之后持有 `hostAttack` 令牌 600 ms。
- **GIVEN** 敌将、steps 7 / 8，**WHEN** 连错一次，**THEN** steps = 8（不超过上限），下一次 `tick` 出手。
- **GIVEN** 敌将、steps 5、本周期没有退过步，**WHEN** 打出第 3 连斩的那一对，**THEN** `comboReward()` 返回 1，之后走 1 步，steps 仍为 5；**WHEN** 接着第 4、5 连斩，**THEN** 第 4 连斩返回 1，第 5 连斩返回 0（本周期已退 2 步）；出手后 `pushedSinceAttack` 归零。
- **GIVEN** 敌将、steps 0，**WHEN** `comboReward()`，**THEN** 返回 0，steps 仍为 0。
- **GIVEN** 敌将、steps 6 / 8，**WHEN** 张飞 `roarBack(3, 3)`，**THEN** steps = 3、stun = 3；**WHEN** 接着连上 3 对，**THEN** steps 仍为 3、stun = 0；**WHEN** 再连上一对，**THEN** steps = 4。
- **GIVEN** 敌将、stun = 1、steps 3，**WHEN** 连错一次，**THEN** stun = 0、steps = 4。
- **GIVEN** 敌将、有护盾、steps 走满，**WHEN** `tick`，**THEN** hearts 不变、盘面不变、`shield = false`、steps = 0，发 `hostAttack {kind: 'blocked'}`。
- **GIVEN** 敌将二阶段、有护盾、下一次出手是“画戟横扫”，**WHEN** 出手被挡下，**THEN** 盘面不变；再下一次出手是普通出手，再下一次特技是“赤兔冲阵”。
- **GIVEN** 敌将一阶段、hp = 1、steps 7 / 8、有二阶段 hp 18 / 6 步，**WHEN** 连上一对，**THEN** 点击后的结算点 `outcome()` 返回 `null`（不判胜）；同一帧 `tick` 不出手而是换阶段：空格补 `floor(free / 2)` 对，hp = hpMax = 18，steps 0 / 6，stun 0，持有 `phase` 令牌 1400 ms，发 `bossPhase {phase: 2}`。
- **GIVEN** 敌将一阶段、hp = 3、护盾在、虎啸镇住还剩 2 步（测试桩设定），**WHEN** 进入二阶段，**THEN** 护盾和镇住保留。
- **GIVEN** 敌将刚进入二阶段，**WHEN** 连续出手 5 次（都没有护盾、没有破），**THEN** 依次是画戟横扫、普通、赤兔冲阵、普通、虎啸；只有两次普通出手扣心。
- **GIVEN** 敌将二阶段、下一次出手是特技、stepsMax 6，**WHEN** steps = 3，**THEN** `hud().forecast = null`；**WHEN** steps = 4，**THEN** `hud().forecast = {id: 'sweep', name: '画戟横扫', broken: false}`。
- **GIVEN** 敌将二阶段、下一次出手是普通出手、没有“破”标记，**WHEN** 诸葛亮 `breakSpecial()`，**THEN** 返回 `{special: 下一个特技, forecast: false}`，`hud().broken = true`；之后普通出手照常扣心；再下一次出手（特技）只把 steps 清零，盘面、心、武将都不变，发 `hostAttack {kind: 'broken'}`，`broken = false`，特技轮换前进一格。
- **GIVEN** 敌将一阶段、这一回有二阶段，**WHEN** `breakSpecial()`，**THEN** 返回 `{special: 画戟横扫, forecast: false}`，`hud().broken = true`；换阶段后标记仍在，二阶段第一次特技只把 steps 清零，发 `hostAttack {kind: 'broken'}`。**GIVEN** 这一回没有二阶段，或已有“破”标记，**THEN** 返回 `null`。
- **GIVEN** 5 × 6 盘、上层有兵的最上两行是第 2、3 行，第 2 行有 1 块拒马、第 3 行有 2 格压着底牌，**WHEN** 画戟横扫，**THEN** 只有第 2、3 行上层兵的位置变了；拒马、空格、底牌位置和种类不变；各兵种块数不变；玩家的选中被清掉。
- **GIVEN** 盘上只有 1 个空格，**WHEN** 赤兔冲阵，**THEN** 放下 1 块拒马，`specialNo` 照样 +1。
- **GIVEN** 出阵关羽（1 / 2）、张飞（2 / 3）、诸葛亮（0 / 4），**WHEN** 虎啸，**THEN** 镇住张飞（2/3 最大），`sealed('zhang_fei') = 3`；**WHEN** 连上 1 对再连错 1 次，**THEN** 镇住解除，发 `unseal`。
- **GIVEN** 出阵关羽（1 / 2）、张飞（0 / 3），**WHEN** 虎啸，**THEN** 镇住关羽；**GIVEN** 两人比值相等，**THEN** 镇住出阵顺序靠前的那位。
- **GIVEN** 网址参数 `slow=1`、第一回，**WHEN** 开局，**THEN** 一阶段 stepsMax = 12；进入二阶段后 stepsMax = 9。
- **GIVEN** 敌将二阶段、hp = 1、steps 5 / 6，**WHEN** 连上一对，**THEN** 结算点判胜，没有出手。
- **GIVEN** 敌将、hearts = heartsMax = 3、只有一阶段，**WHEN** 连续普通出手 3 次，**THEN** 第 3 次演出 600 ms 后的结算点判“城破”，`metrics().heartsLost = 3`。
- **GIVEN** 敌将二阶段，**WHEN** 特技、被挡、被破的出手各发生一次，**THEN** `metrics().heartsLost` 不变。
- **GIVEN** 敌将二阶段 hp = 4，**WHEN** 玩家消一对火、火烧掉 6 块营，**THEN** hp = 0，结算点判胜。
- **GIVEN** 敌将、盘上只剩 2 个空格，**WHEN** 普通出手，**THEN** 放下 1 对，hearts − 1。
- **GIVEN** 任意模式、持有 `skill` 令牌，**WHEN** 喂入 800 ms 的帧，**THEN** 下压时间没有前进，敌将没有出手。
- **GIVEN** `outcome()` 时胜负条件同时成立，**WHEN** 查询，**THEN** 返回胜利。
- **GIVEN** 一回结束，**WHEN** 取 `metrics()`，**THEN** press 为 `{dangerMs}`、food 为 `{foodLeft, misses}`、boss 为 `{heartsLost}`，都是整数。

**压境里的拒马**（用户决定 4）

- **GIVEN** 5 列压境、`waveList` 第 1 项为 `[qi, dao, 'jm', dao, qi]`，**WHEN** 第一次下压，**THEN** 第 1 行第 3 列是拒马、其余 4 格是兵，`wave = 1`，每种兵仍为偶数。
- **GIVEN** 压境、最下一行只有 1 块拒马、其余为空，**WHEN** 到点，**THEN** 不破城，整盘下移一行，拒马移出盘面，`push.dropped = [拒马的列]`，`wave + 1`。
- **GIVEN** 压境、最下一行只有拒马，**WHEN** 持续 3000 ms 游戏时间，**THEN** `dangerMs` 不增加，`hud().bottomOccupied = false`，`canScare()` 为假。
- **GIVEN** 压境、波次已用完、盘上只剩 2 块拒马，**WHEN** 结算点查询，**THEN** `outcome()` 判胜。
- **GIVEN** 压境、拒马在 (5,3)，**WHEN** 玩家正常消掉 (5,2) 和另一块同种兵，**THEN** 拒马碎掉；**GIVEN** 同样位置、赵云待命，**WHEN** 强制消掉这一对，**THEN** 拒马不碎。
- **GIVEN** 6 列压境回目的 `waveList` 某项含 `'jm'`，或 5 列某项同时有 `null` 和 `'jm'`，**WHEN** 加载，**THEN** 拒绝，报回目 id 和字段。
- **GIVEN** 5 列压境、没写 `waveList`，**WHEN** 生成波次表，**THEN** 里面没有拒马。

**特技轮换、显示名、新敌将**（用户决定 1、2、7）

- **GIVEN** 回目 `boss.phase2.specials = ['chain']`，**WHEN** 二阶段第 1、2、3 次出手，**THEN** 依次是铁索连环、普通出手、铁索连环。
- **GIVEN** 回目没写 `specials`，**WHEN** 加载吕布的回目，**THEN** 轮换仍是画戟横扫 → 赤兔冲阵 → 虎啸。
- **GIVEN** `specials` 为空列表或含未知 id，**WHEN** 加载，**THEN** 拒绝，报回目 id 和字段。
- **GIVEN** 夏侯渊 `specials = ['charge', 'roar']`、`specialNames = {charge: '布鹿角'}`，**WHEN** 二阶段下一招是 `charge`、剩 2 步，**THEN** `hud().forecast.name = '布鹿角'`；出手时空格里放下 `CHARGE_BLOCKS` 块拒马，横幅“布鹿角！”；再下一个特技是虎啸，横幅“虎啸！”。
- **GIVEN** 文丑回目没写 `phase2`，**WHEN** 连续出手 3 次，**THEN** 都是普通出手、各扣 1 心，`hud().forecast` 始终为 `null`；**WHEN** `breakSpecial()`，**THEN** 返回 `null`。
- **GIVEN** 测试构造盘面：上层书 4、旗 2、营 4、火 2，其余兵种上层都少于 2 块，**WHEN** 铁索连环（`CHAIN_PAIRS = 2`），**THEN** 恰好 4 块从书或旗变成营，火和全部底牌不变，位置不变，每种兵（含底牌）仍为偶数，选中清掉，hearts 不变、没有增兵，发 `hostAttack {kind: 'special', special: 'chain', cells}`（4 格）。
- **GIVEN** 同一 `seed`、同一盘面，**WHEN** 两次运行铁索连环，**THEN** 换的格子完全相同。
- **GIVEN** 上层只剩营和火，**WHEN** 铁索连环，**THEN** 不换任何块，照样播横幅，`steps = 0`，`specialNo + 1`。
- **GIVEN** 亮着“下招：铁索连环”、有护盾，**WHEN** 曹操出手，**THEN** 横幅“赵云挡下！”，不换块，`shield = false`。
- **GIVEN** 亮着“下招：铁索连环”，**WHEN** 诸葛亮 `breakSpecial()`，**THEN** 返回的 `name = '铁索连环'`；曹操出手时发 `hostAttack {kind: 'broken'}`，不换块。

**刘备的接口**（用户决定 3、11）

- **GIVEN** 敌将、hearts 2 / 3，**WHEN** `healHeart(1)`，**THEN** 返回 1，hearts = 3，发 `heal {heart}` 一次，steps、stun、shield、seal 都不变。
- **GIVEN** 敌将、hearts 3 / 3，**WHEN** 查询，**THEN** `canHeal()` 为假；**WHEN** `healHeart(1)`，**THEN** 返回 0，不发事件。
- **GIVEN** 敌将、heartsMax 3，**WHEN** 挨打 2 次、`healHeart(1)`、再挨打 1 次后赢，**THEN** `metrics().heartsLost = 2`。
- **GIVEN** 粮草、food0 = 16、food = 15，**WHEN** `refillFood(2)`，**THEN** 返回 1，food = 16，发 `foodRefill {amount: 1}`。
- **GIVEN** 粮草、food0 = 16、张飞让 food = 18，**WHEN** 查询，**THEN** `canRefill()` 为假；`refillFood(2)` 返回 0，food 仍是 18。
- **GIVEN** 压境，**WHEN** 查询 `canHeal()`、`canRefill()`，**THEN** 都为假。

## Open Questions

- **体验检验（试玩）**：敌将模式的目标是“一阶段学会‘我每走一步他蓄一格’，二阶段看见预告会主动放赵云或诸葛亮”。试玩时观察：(1) 玩家能否说出“连错算两步”；(2) 二阶段至少一次在预告亮时主动放赵云或诸葛亮；(3) 输的人能说出输在哪一步。（负责：试玩；目标：竖切片复审前。）
- 中老年能接受的 interval 是多少？压境 r_need 在 6 列是 0.43 对/秒、5 列是 0.29 对/秒，第二回要按 5 列重排。（负责：关卡设计 + 试玩；目标：调参前。慢速档参数已备好。）
- 吕布“还可以再难一点”：第一回保持 8 / 6 步（用户决定 2026-10-30），后面的回目可用 6 / 5。（负责：关卡设计。）
- **压境、粮草模式下的赵云**：敌将模式里赵云是护盾；压境、粮草模式暂保留旧规则“下一对同种兵必消”（粮草里这一对不扣粮）。等关卡设计时再定。（负责：关卡设计 + 用户。）
- ~~压境 5 列时每波 2 对加 1 个空格，还是改成每波 4 格加 1 块拒马？~~ 已定（用户决定 4，2026-10-30）：每波 2 对，多出的一格由回目写成空格或拒马（规则 9a）。
- 铁索连环 `CHAIN_PAIRS` 和“留火 / 不留火”两种打法的伤害差没有跑模拟；刘备补心对敌将回目胜率的影响也没有。建议定稿前在切片模拟器里加这两项。（负责：系统设计 + 关卡设计；目标：第 9 回数据定稿前。）
- 压境里赵云强制消除的一对不碎拒马（沿用“盘面与连通”规则 9）。拒马进了压境后两者第一次能同时出现；试玩时看玩家会不会以为赵云能破拒马。（负责：试玩。）
- 敌将模式里玩家完全不动时永远不挨打。目前认为可以接受（不动也赢不了）。若试玩发现有人把“停下来想”当成卡关，再考虑加长时间不动的提示。（负责：试玩。）
- 暴怒演出的“盘面震一下”和美术圣经“不震屏”冲突，待美术总监确认。（负责：art-director。）
- 粮草模式的 slack 要不要随效果兵数量自动换算？（负责：回目编排；目标：竖切片。）
- 空行下压阶段要不要比有兵时更快（例如 interval × 0.8），让收尾更紧？MVP 不变。（负责：试玩。）
