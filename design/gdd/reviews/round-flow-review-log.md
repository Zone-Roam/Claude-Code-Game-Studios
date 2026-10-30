# Review Log: round-flow.md

## Review — 2026-10-27 — Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: M
Specialists: none (lean mode)
Blocking items: 9 | Recommended: 7
Summary: 骨架对，问题是规则空洞和跨文档矛盾：line 令牌没人用、“锁定”一词两义、卡片防连点的起点、后台令牌会卡死、令牌超时的计时基准、胜负检查时机、种子、结果对象没有字段。改文档即可，不需要重做设计。审查者是全新子代理。
Prior verdict resolved: First review
Findings:
- [BLOCKING] Core Rules 4/5: line 令牌没有申请方和时长，“是否锁定由演出决定”让锁定无法从令牌集合推出
- [BLOCKING] Formulas input_guard: “锁”同时指盘面和卡片按钮，会把开讲、结算卡的按钮也拒掉
- [BLOCKING] Core Rules 7 / AC8: 500 ms 防护应从按钮可见起算；胜利卡的 AC 不可能成立
- [BLOCKING] Core Rules 8: 开讲、结算时切后台的令牌无人归还；后台令牌可叠加；结束状态切后台等没规则
- [BLOCKING] Edge Cases: TOKEN_MAX_MS 用什么时间计没定，自动归还后效果是否生效没定
- [BLOCKING] Core Rules 6: 令牌期间 dtGame=0，按现写法效果清空盘面不会判胜；判负是事件、判胜是查询，胜利优先无法实现；最后一颗心的先后
- [BLOCKING] Core Rules 9: 种子与 board-link、chapter-design 三套说法
- [BLOCKING] Dependencies: 漏了对 chapter-design 的依赖；最后一回没有“下一回”
- [BLOCKING] Core Rules 7: 结果对象没有字段名、类型和 metrics 结构；第 86 行 800 ms 与 skill_show_ms 950 冲突
- [RECOMMENDED] Core Rules 2: 开讲遮罩渐出期间已进入对局，违反 R1
- [RECOMMENDED] Formulas: dtReal 负数没钳制；注册表 output_range 要对齐
- [RECOMMENDED] Open Questions: 可见性事件不可靠时的降级（大 dtReal 视为后台）
- [RECOMMENDED] UI Requirements: 暂停印应是 pause 令牌；暂停卡内容没写
- [RECOMMENDED] UI Requirements: 覆盖卡数量与 ui-interaction 不符
- [RECOMMENDED] Acceptance Criteria: 缺开讲防护、原因透传、清令牌、各状态后台、超时豁免、重来换种子等
- [RECOMMENDED] Interactions: 补令牌、tick、判负、isWon 的签名
Reviewed-Content-Hash: design/gdd/round-flow.md d9f34f9132da0821bb06b9d65f8083dd710690d2
Reviewed-Content-Hash: design/registry/entities.yaml 2c2277bdfb2dc58fbd9ac11e0087caf346bd5448
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/board-link.md 3830e14e000678a013326e7bc81c75df17553c49
Reviewed-Content-Hash: design/gdd/clear-effects.md 018cc74f4dd54b5e318d57408ec7b47f70db3283
Reviewed-Content-Hash: design/gdd/battle-pressure.md 4114d70f427bd380c71c304769be27957289d647
Reviewed-Content-Hash: design/gdd/general-skills.md 90bbf230e9593180639be1ca3240ba2078609aa4
Reviewed-Content-Hash: design/gdd/chapter-design.md 8258eda5cbd7ab87ec595e50b986df72c511a7ab
Reviewed-Content-Hash: design/gdd/progress-save.md 30c98c04000b0a7ae3bafee19e8dcbe47383a6e8
Reviewed-Content-Hash: design/gdd/ui-interaction.md d8c9cfafbf5642eebe153d6de58229f2131946dc
Reviewed-Content-Hash: design/gdd/systems-index.md e1c4b38c955cda945e5c6c02f13fe143012d8310
Reviewed-Content-Hash: design/gdd/game-concept.md e5061a7788be23a497ed71e91a1265fe07ff7b65
Reviewed-Content-Hash: design/art/art-bible.md 8ed5835f726d685d71fe17723b76d999bae2f723

### Revision — 2026-10-27（同一会话，审查之后）
9 项阻塞全部改掉：删掉 line 令牌，补完整令牌表（原因、谁申请、停钟、锁盘、时长、超时豁免）；盘锁和卡片按钮分开；防连点从按钮出现起算；后台只在对局中处理、background/pause 各最多一个；有时长令牌按前台真实时间计、超时强制到点并通知持有者；新增“一次操作的结算顺序”和“结算点”，胜负改为在结算点查询 outcome()，有计时令牌时不检查；种子 = hash32(chapterId, attempt, salt)；补对回目编排的依赖和最后一回的去向；结果对象写成固定字段。建议项：开讲遮罩撤完才开钟、dtReal 负数钳制、隐式后台、暂停卡和横屏卡、签名。
修订后待复审（全新子代理）。

## Review — 2026-10-27（复审）— Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 4 | Recommended: 8
Summary: 首轮 9 项大多改好。两个新问题：暂停或横屏叠在计时令牌上时演出会在暂停卡下播完并结算；规则 6.4 的先后与战场压力、令牌表不一致，事件分发没写具体。另有 TOKEN_MAX_MS 的语义和 seed 生效范围两处残留。
Prior verdict resolved: Mostly（9 项中 7 项已解决）
Findings:
- [BLOCKING] Core Rules 4/7/11: pause 不停计时令牌，暂停后演出照样结算并写存档，与“回书目不写存档”冲突
- [BLOCKING] Core Rules 6.4: 出手、推行的先后与战场压力和令牌表矛盾；分发表、onMatch 等签名、tick 后的结算点没写
- [BLOCKING] Edge Cases / Formulas: TOKEN_MAX_MS 的“强制到点”要写成“移出令牌集合并通知持有者”
- [BLOCKING] Core Rules 12: seed=N 在哪个包生效与 chapter-design 不一致
- [RECOMMENDED] 删“或还会下压”；状态表补开讲→回书目；粮草模式没有退出口；pause 由谁申请；R1 改单向；注册表 dt_game；补验收
Reviewed-Content-Hash: design/gdd/round-flow.md 1c00d6dc51d45a2a038f6135643b48085810d25d
Reviewed-Content-Hash: design/registry/entities.yaml 897bb597650e5d12e9f2f96d4db1af2c20e800c0
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/round-flow-review-log.md 9927003dafc8d961b1a3fde066e642ce25773fd0
Reviewed-Content-Hash: design/gdd/board-link.md 4c6492fbe631408f096f291edb2bda1bc935e1fa
Reviewed-Content-Hash: design/gdd/battle-pressure.md 16bc3fdee83f31890213b1adc186f4cd1487c092
Reviewed-Content-Hash: design/gdd/clear-effects.md ad486b371ddb45e0bc75d2088776dbf9e7932570
Reviewed-Content-Hash: design/gdd/general-skills.md 7cbf9f95cfea2587981090bcde3cab5a8c9d8820
Reviewed-Content-Hash: design/gdd/progress-save.md 49d775bbecf90db07912d584be49a9112b2c630d
Reviewed-Content-Hash: design/gdd/chapter-design.md d1d938cc980e6d146e2d17e4c673781696a4dac9
Reviewed-Content-Hash: design/gdd/ui-interaction.md 97d7a44b0bd1055de742aaa8e9fcab7bd22f2db0
Reviewed-Content-Hash: design/art/art-bible.md 8ed5835f726d685d71fe17723b76d999bae2f723
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/gdd/systems-index.md 40986b005a93ead061166f5aec4f0b185b0befa8

### Revision — 2026-10-27（复审之后）
4 项阻塞已改：计时令牌只在“页面可见且没有 background、pause”时计时，有任何令牌都不出结算点，“回书目”清空令牌且不通知持有者；规则 6 改成分发表（下压、出手当场改，之后才演出；效果、技能先演出后生效），写出 onMatch/onMiss/onClear 等签名和 tick 后的结算点；TOKEN_MAX_MS 改为“强制归还并通知持有者”；seed=N 改为开发版和 MVP 测试包都读。建议项：删“或还会下压”、开讲可回书目、三种模式都有暂停印、写出 settle()、BG_GAP_MS 范围。
修订后待第三轮复审（全新子代理）。

## Review — 2026-10-27（第三轮）— Verdict: APPROVED
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 0 | Recommended: 8
Summary: 第二轮 4 项阻塞全部解决，没有新的阻塞。剩下的是一帧内顺序、dtGame=0 时是否 tick、令牌计时的异常帧、强制归还的重复通知等细节建议。
Prior verdict resolved: Yes
Findings:
- [RECOMMENDED] 写明一帧内令牌计时、点击、tick、结算点的顺序
- [RECOMMENDED] dtGame = 0 时不调 tick；令牌计时排除超大 dtReal 帧
- [RECOMMENDED] 强制归还时已通知过的不再通知
- [RECOMMENDED] 令牌表 pause 的申请方；分发表里 push、hostAttack 实际由战场压力直接发给界面
- [RECOMMENDED] 结算点先查 outcome() 再 ensurePlayable()；收尾演出完成的上报接口；Status 行
Reviewed-Content-Hash: design/gdd/round-flow.md d527773f2977d6ee2283a68ead458d6ee2b7c92e
Reviewed-Content-Hash: design/registry/entities.yaml a03bb12a4dc725bbd35a7e8375f0d2352c5ddc0a
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/round-flow-review-log.md 464e93cf9222101bd9c9d2b0a0141e342b003e68
Reviewed-Content-Hash: design/gdd/board-link.md bc9e358e7cdc30be9a4f3adbb6670c39f8990652
Reviewed-Content-Hash: design/gdd/battle-pressure.md 7fece5395d2d87ef3cb3a9fc62e271e470bd7504
Reviewed-Content-Hash: design/gdd/progress-save.md 77d944f116250cfefb48198a2edec4c1940d8689
Reviewed-Content-Hash: design/gdd/chapter-design.md c0e9d55d527107d691b99ad447880d5be89a6ee4
Reviewed-Content-Hash: design/gdd/ui-interaction.md b6917b89c3a42583637fe39a3d345c1c13b27f4e
Reviewed-Content-Hash: design/gdd/general-skills.md 1ed7d529af0bf601d29022bcb8aa958ca2379216
Reviewed-Content-Hash: design/gdd/clear-effects.md ad486b371ddb45e0bc75d2088776dbf9e7932570
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/gdd/systems-index.md 17594ea6c4f07847650183c5b7063b6a2dc87f50
Reviewed-Content-Hash: design/art/art-bible.md d65acad5f16e94183d8f461556fb6d9768b7d68c

### Amendment（批准后修订） — 2026-10-27（第三轮之后）
为解决 ui-interaction 第三轮的阻塞，规则 6 加第 ④ 步（把 match、miss 交给界面），分发表补上界面这一列并改正 push、hostAttack 由战场压力直接发给界面；同时采纳第三轮建议：令牌表 pause 由本系统申请、强制归还不重复通知、令牌计时排除超大 dtReal 帧、dtGame = 0 时不调 tick、一帧内的顺序、结算点先判胜负再洗牌、endingDone() 上报、暂停卡开着时切后台。这些改动涉及规则，所以送第四轮复审。

## Review — 2026-10-27（第四轮，批准后修订的复核）— Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 2 | Recommended: 4
Summary: 批准后修订的大部分改对了，与界面、战场压力、清除效果、武将技能、进度对得上。两处没跟上：新加的“一帧内顺序”把结算点放在点击之后，演出最后一帧的点击会在令牌归还后执行（敌将打掉最后一颗心时可能把“城破”变成胜利）；验收和边界情况还是强制归还“照常通知”的旧意思。
Prior verdict resolved: n/a（上一轮是 APPROVED，这一轮复核修订）
Findings:
- [BLOCKING] Rule 6.7: 每帧顺序应为“点击 → 令牌计时 → tick → 结算点”
- [BLOCKING] Edge Cases / AC: 强制归还只通知一次；第 23 帧时钟会走
- [RECOMMENDED] “每帧 tick”改成“dtGame > 0 的帧”（本文、战场压力、systems-index）
- [RECOMMENDED] token_clock 公式补 dtReal 的处理；隐式后台判断放在每帧最前
- [RECOMMENDED] 补验收：dtGame = 0 不调 tick；死局盘面判胜时不洗牌；暂停卡开着时切后台
Reviewed-Content-Hash: design/gdd/round-flow.md af0b57fda16f4dc500fde82ef6770b8ae4d6d06e
Reviewed-Content-Hash: design/registry/entities.yaml b05d55e0024ef82f7a65f6f3abcc0513d7a404b5
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/round-flow-review-log.md d03918b7c47d1fb024babd2584f3c9f6626537aa
Reviewed-Content-Hash: design/gdd/battle-pressure.md ae1eac1e1c1032c7b0f8eb894f1c5e9f418784a5
Reviewed-Content-Hash: design/gdd/ui-interaction.md 9598850da0bb92e0d3fbcf9404530ead960940ac
Reviewed-Content-Hash: design/gdd/general-skills.md 7d605759e12c9863d37e129f2086d371d9b1879e
Reviewed-Content-Hash: design/gdd/clear-effects.md 39efea1e9015423e7f884aa634ed3cc62c1c0d44
Reviewed-Content-Hash: design/gdd/board-link.md 969d4fd94b714d27049b601827f1d539c8853a24
Reviewed-Content-Hash: design/gdd/progress-save.md 926f997571f04bbc2c0394a1836c8bd66f25c295
Reviewed-Content-Hash: design/gdd/chapter-design.md cdf81b77e54acd7d0098c209920994e3fd2ce864
Reviewed-Content-Hash: design/gdd/systems-index.md e802fdc7188de08e5c65e22228f9590e8a1b6a38
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/art/art-bible.md d65acad5f16e94183d8f461556fb6d9768b7d68c

## Review — 2026-10-27（第五轮）— Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 1 | Recommended: 5
Summary: 第四轮 2 项阻塞都已解决，逐帧核对了 380 ms 令牌、最后一帧点击、最后一颗心三个场景。新的措辞“盘锁按本帧开始时的令牌集合判断”带进一个漏洞：一帧里排了多次点击时，前一次刚申请的令牌挡不住后面的点击。
Prior verdict resolved: Yes
Findings:
- [BLOCKING] Rule 6.7 ②: 改成“本帧开始时或此刻的令牌集合有一个不为空就丢弃”
- [RECOMMENDED] 第 ② 步新申请的令牌从下一帧起计时
- [RECOMMENDED] 6.5 与 6.6 对齐：盘面没变时不必 ensurePlayable
- [RECOMMENDED] 战场压力：hp ≤ 0 时 tick 不再出手
- [RECOMMENDED] board-link 规则 9 的结算点措辞对齐；systems-index 过时说明
Reviewed-Content-Hash: design/gdd/round-flow.md 6d90e6389e795ce6b81ec35fa10ef460a782274d
Reviewed-Content-Hash: design/registry/entities.yaml b05d55e0024ef82f7a65f6f3abcc0513d7a404b5
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/round-flow-review-log.md c74e8ddff7bac557b7ce43af82b6cf83a75afa24
Reviewed-Content-Hash: design/gdd/battle-pressure.md 9662053576360373c35634a5074eef60b203685c
Reviewed-Content-Hash: design/gdd/ui-interaction.md 9598850da0bb92e0d3fbcf9404530ead960940ac
Reviewed-Content-Hash: design/gdd/clear-effects.md 39efea1e9015423e7f884aa634ed3cc62c1c0d44
Reviewed-Content-Hash: design/gdd/general-skills.md 7d605759e12c9863d37e129f2086d371d9b1879e
Reviewed-Content-Hash: design/gdd/board-link.md 969d4fd94b714d27049b601827f1d539c8853a24
Reviewed-Content-Hash: design/gdd/progress-save.md 926f997571f04bbc2c0394a1836c8bd66f25c295
Reviewed-Content-Hash: design/gdd/systems-index.md d7d0fcadb3d37db6054305c46d08e34044df425d
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b

## Review — 2026-10-27（第六轮）— Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 1 | Recommended: 4
Summary: 第五轮的阻塞已解决（逐帧推演了同帧多次点击、令牌最后一帧、380 ms 令牌）。新发现同一类问题：结算点每帧只在第 ⑤ 步做一次，而 6.5 和盘面规则 9 是每次点击后一次；卡顿帧里排了多次点击时，前一次点击的死局或粮尽不会挡住后面的点击。
Prior verdict resolved: Yes
Findings:
- [BLOCKING] Rule 6.5/6.7: 每次点击结果分发完、令牌集合为空时就地做结算点
- [RECOMMENDED] 6.6 “盘面没变”的前提
- [RECOMMENDED] 写明武将牌、暂停印、接着讲的点击也进第 ② 步的队列
- [RECOMMENDED] 补“第 0 帧点出火、第 23 帧到点”的验收；token_clock 公式写上“从下一帧开始计时”
Reviewed-Content-Hash: design/gdd/round-flow.md a6021b4369a5eaefbd73088328a8dcd569a7dd93
Reviewed-Content-Hash: design/registry/entities.yaml b05d55e0024ef82f7a65f6f3abcc0513d7a404b5
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/round-flow-review-log.md b7737196fc38c8a03ded2173e89233e7cf6e1d4c
Reviewed-Content-Hash: design/gdd/general-skills.md 7d605759e12c9863d37e129f2086d371d9b1879e
Reviewed-Content-Hash: design/gdd/ui-interaction.md 9598850da0bb92e0d3fbcf9404530ead960940ac
Reviewed-Content-Hash: design/gdd/battle-pressure.md de03738b5610f26e70f526f75dd7109313ce0d12
Reviewed-Content-Hash: design/gdd/board-link.md ddfd01864cea1b2a0bf9e7a0fffb4a2c60770eb1
Reviewed-Content-Hash: design/gdd/clear-effects.md 39efea1e9015423e7f884aa634ed3cc62c1c0d44
Reviewed-Content-Hash: design/gdd/systems-index.md bcc5b846847e726fd318f416cb4cb6e7b65882db
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b

### Revision — 2026-10-27（跨文档总审之后）
第六轮的阻塞已改：每处理完一次点击、令牌集合为空时就地做结算点（分出胜负或洗牌后，本帧后面的点击被丢弃）；第 ② 步只管落在盘上和武将牌上的点击，暂停印和覆盖卡按钮不受盘锁影响；6.5 写明两个结算时刻、把保底清除列为触发；Interactions 表的分发说法与分发表一致；补三条验收。
待复核（全新子代理）。

## Review — 2026-10-27（第七轮）— Verdict: APPROVED
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 0 | Recommended: 4
Summary: 第六轮的阻塞已解决：逐帧推演了粮草、敌将的卡顿多击帧、令牌最后一帧、演出中点暂停印，都给出唯一答案；跨文档总审的 W1、W3、W4、W5 已改好。
Prior verdict resolved: Yes
Findings:
- [RECOMMENDED] 6.5 的触发列表加上每次 tick
- [RECOMMENDED] 暂停印、接着讲与盘上点击同一到达顺序
- [RECOMMENDED] 隐式后台那一帧的点击全部丢弃
- [RECOMMENDED] AC 281 的前提写成 hearts 从 1 被打到 0
Reviewed-Content-Hash: design/gdd/round-flow.md ae0b1fc55a036510e040d582fbe2b9ff841afdcc
Reviewed-Content-Hash: design/registry/entities.yaml c7422895e5166776e5a15e017c5ab13a65216f3d
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/round-flow-review-log.md 32954381587dddc601f3353bafa5b3a7f20d7397
Reviewed-Content-Hash: design/gdd/gdd-cross-review-2026-10-27.md e29728c5e178fdfe96e512f573a1dea6128be54f
Reviewed-Content-Hash: design/gdd/battle-pressure.md e0b3a1fd70e3e6334f0a91a16d16d76061b21916
Reviewed-Content-Hash: design/gdd/board-link.md ddfd01864cea1b2a0bf9e7a0fffb4a2c60770eb1
Reviewed-Content-Hash: design/gdd/clear-effects.md 17767f552b65433fcdfb18f9fdbc00f0ac50a13e
Reviewed-Content-Hash: design/gdd/general-skills.md 686fe4c6b992627cfb1f89bad3eb489ed522b447
Reviewed-Content-Hash: design/gdd/ui-interaction.md ec03fe4e5186169367973669f456328dadf95bfd
Reviewed-Content-Hash: design/gdd/progress-save.md c390ad7db13ac935f910f053087d8f73f57b1061
Reviewed-Content-Hash: design/gdd/chapter-design.md a57362fc306dae125f93bc3360e9ff69cc57bf1f
Reviewed-Content-Hash: design/gdd/game-concept.md b9259643dd0003e64dc9b0fd6d35ed1e66261e03
Reviewed-Content-Hash: design/gdd/systems-index.md 48a678a841e1908f33a28baea23fc296f47c6378

## Review — 2026-10-30 — Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean)
Blocking items: 4 | Recommended: 13
Summary: 骨架稳定，但并入切片第四至六版和选将后，令牌到点那一帧没有结算点（“清空盘面即胜”会失效），`RoundResult.loadout` 长度与其他文档矛盾，一条验收标准前提不清，新规则（黄忠选列、洗牌令牌、开讲时展开）缺验收。四项都是机械修，已全部改掉。
Prior verdict resolved: Yes（第七轮 4 条建议中，6.5 触发列表与 hearts 前提已在本轮解决；隐式后台丢点击仍留）
Findings:
- [BLOCKING] Rule 6.5/6.6/7 + ADR-0002: 令牌到点后、同一帧 tick 之前没有结算点 — 已修（加帧步骤 ③b，6.5 触发列表与 6.6 对齐，Edge Case 改写，ADR-0002 第 3 节加 3b 与修订记录，新增 AC）
- [BLOCKING] Rule 8: `RoundResult.loadout` 写成 0–3 个 — 已修（1–3 个，副将可空；另补 `attempt` 字段供进度去重）
- [BLOCKING] AC: “hearts = 1”前提不清 — 已修（改写为 hearts 从 1 被这一次出手打到 0）
- [BLOCKING] AC: 黄忠选列、`reshuffle` 令牌、开讲时展开着可选武将缺验收 — 已修（补 6 条）
- [RECOMMENDED] Overview/Interactions 过时的连斩与 gameTime 说法 — 已修
- [RECOMMENDED] Status/Last Verified、Open Questions 的 `phase` 条 — 已修（Status 改为 In Review，Open Questions 已删）
- [RECOMMENDED] Tuning Knobs ENDING_WIN_MS 范围 1100–2500 → 1500–2500 — 已修
- [RECOMMENDED] 规则 13 与选将 D4 的“再来一回”沿用内存槽位（含空槽） — 已修
- [RECOMMENDED] 6.7 的“帧步骤”与 6.3 的 ①–④ 混读 — 已修
- [RECOMMENDED] AC 开讲点槽的前提（可选武将多于槽数） — 已修
- [RECOMMENDED] 规则 11 返回键、States 表 starting/选列、规则 5a 盘外范围、隐式后台丢点击及其 AC、RoundResult 的 AC 改写、general-loadout 依赖表（该文件已改）、onboarding 待写、令牌表来源列 — 未改（留待复审或下一轮；不在本轮批准范围）
Reviewed-Content-Hash: design/gdd/round-flow.md 85ff930dc58719e051c7323b61ac3e5d735c405b
Reviewed-Content-Hash: design/registry/entities.yaml 9b88f1c949f5e636c3d0ba131a4bc5616d38c526
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/game-concept.md 708e6a1dbcb7840c0636f08728c9120ab87604cb
（以上哈希取修订前的 git 版本 f3a96f9，即本次审查读到的版本；由主会话补填）
