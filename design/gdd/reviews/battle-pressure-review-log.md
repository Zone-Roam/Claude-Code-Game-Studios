# Review Log: battle-pressure.md

## Review — 2026-10-27 — Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 6 | Recommended: 6
Summary: 结构完整，登记表数值无冲突。阻塞项：粮草判负与效果的竞态、清盘提前推行的时钟语义、随机确定性、敌将血量语义自相矛盾、事件契约、合法范围的定义。审查者是全新子代理。
Prior verdict resolved: First review
Findings:
- [BLOCKING] Detailed Rules 17: 扣粮后立刻判负，早于火烧清营
- [BLOCKING] Detailed Rules 8: 清空盘面提前推行后 nextPush、连斩推迟、波次计数怎么算没定义
- [BLOCKING] Detailed Rules 7: 同种子同波次不成立（随机源共用）；新行的列位排布、敌将增兵的池、waves 重名
- [BLOCKING] Detailed Rules 25: 每对都扣血、增兵不加血，“盘面清空”分支走不到；AC 和公式例子漏算效果兵本身的一对；hp 无下限
- [BLOCKING] Interactions: threat 无载荷；推行、最后一波、粮 −1 没有事件；“非玩家清除”归属三种说法
- [BLOCKING] Edge Cases: 非法参数的拒绝范围与 chapter-design 矛盾；slow 倍率在校验前还是后
- [RECOMMENDED] Formulas: 变量表不全，15、25 等写成字面量
- [RECOMMENDED] Tuning Knobs: 安全范围下半段对目标人群不安全，补压境手速公式
- [RECOMMENDED] Detailed Rules: 最后一波后 dangerMs 仍累加且不可能输；最后一颗心的判负时机；推行时的选中与保底挪块
- [RECOMMENDED] Acceptance Criteria: 多条需改成纯函数或数值断言，缺多项验收
- [RECOMMENDED] Visual: 连不上的提示与 ui-interaction 不一致；90 档没登记
- [RECOMMENDED] Formulas: hearts 可调而评星阈值写死
Reviewed-Content-Hash: design/gdd/battle-pressure.md 4114d70f427bd380c71c304769be27957289d647
Reviewed-Content-Hash: design/registry/entities.yaml 2c2277bdfb2dc58fbd9ac11e0087caf346bd5448
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/board-link.md 3830e14e000678a013326e7bc81c75df17553c49
Reviewed-Content-Hash: design/gdd/round-flow.md d9f34f9132da0821bb06b9d65f8083dd710690d2
Reviewed-Content-Hash: design/gdd/clear-effects.md 018cc74f4dd54b5e318d57408ec7b47f70db3283
Reviewed-Content-Hash: design/gdd/general-skills.md 90bbf230e9593180639be1ca3240ba2078609aa4
Reviewed-Content-Hash: design/gdd/chapter-design.md 8258eda5cbd7ab87ec595e50b986df72c511a7ab
Reviewed-Content-Hash: design/gdd/progress-save.md 30c98c04000b0a7ae3bafee19e8dcbe47383a6e8
Reviewed-Content-Hash: design/gdd/ui-interaction.md d8c9cfafbf5642eebe153d6de58229f2131946dc
Reviewed-Content-Hash: design/gdd/systems-index.md e1c4b38c955cda945e5c6c02f13fe143012d8310
Reviewed-Content-Hash: design/gdd/game-concept.md e5061a7788be23a497ed71e91a1265fe07ff7b65
Reviewed-Content-Hash: design/art/art-bible.md 8ed5835f726d685d71fe17723b76d999bae2f723
Reviewed-Content-Hash: prototypes/yali-concept/REPORT.md 479abb1d71f9e835846700959d68e20674de29b5

### Revision — 2026-10-27（同一会话，审查之后）
6 项阻塞全部改掉：胜负改为只回答 outcome() 查询（先胜后负），粮草判负在结算点、效果之后；清盘提前下压后 nextPush = gameTime + interval、连斩推迟清零；波次表开局用 wave 流一次生成，增兵用 add 流，pool/waveList 字段明确；敌将血量语义改为“增兵不加血、hp 下限 0、hp ≤ 0 即胜”，例子和验收改对；事件改为 push/lastWave/foodSpent/hostAttack，读数用 hud()；合法范围 = 变量表 Range，安全范围只警告，slow 在校验后才乘。按用户决定：最后一波之后空行继续下压直到清空，补 press_deadline 公式（T_max、r_need）。
修订后待复审（全新子代理）。

## Review — 2026-10-27（复审）— Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 2 | Recommended: 6
Summary: 首轮 6 项阻塞全部解决，边界代值通过。新出现两项：敌将出手和下压的执行时序与对局流程 6.4 矛盾、onAdd 悬空；蓄力档位的验收测不了。
Prior verdict resolved: Yes（6 项全部解决）
Findings:
- [BLOCKING] Detailed Rules 3/9/23: 出手、下压的时序与对局流程 6.4 矛盾；onAdd 没有意义
- [BLOCKING] Acceptance Criteria: hud() 没有档位字段，“一级/二级”的验收测不了
- [RECOMMENDED] boss_charge 改为逐次钳位，连错到 100 时下一次 tick 出手
- [RECOMMENDED] waveList 每项每种兵偶数；池权重累加顺序
- [RECOMMENDED] 三条验收的前提（空格、固定步长、heartsMax）；r_need 的单位；dangerMs 的帧内时点
Reviewed-Content-Hash: design/gdd/battle-pressure.md 16bc3fdee83f31890213b1adc186f4cd1487c092
Reviewed-Content-Hash: design/registry/entities.yaml 897bb597650e5d12e9f2f96d4db1af2c20e800c0
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/battle-pressure-review-log.md 7a2525f005fb53ff03fe0c32dc74cdcc4742f2a8
Reviewed-Content-Hash: design/gdd/round-flow.md 1c00d6dc51d45a2a038f6135643b48085810d25d
Reviewed-Content-Hash: design/gdd/board-link.md 4c6492fbe631408f096f291edb2bda1bc935e1fa
Reviewed-Content-Hash: design/gdd/clear-effects.md ad486b371ddb45e0bc75d2088776dbf9e7932570
Reviewed-Content-Hash: design/gdd/general-skills.md 7cbf9f95cfea2587981090bcde3cab5a8c9d8820
Reviewed-Content-Hash: design/gdd/chapter-design.md d1d938cc980e6d146e2d17e4c673781696a4dac9
Reviewed-Content-Hash: design/gdd/ui-interaction.md 97d7a44b0bd1055de742aaa8e9fcab7bd22f2db0
Reviewed-Content-Hash: design/gdd/progress-save.md 49d775bbecf90db07912d584be49a9112b2c630d
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/gdd/systems-index.md 40986b005a93ead061166f5aec4f0b185b0befa8
Reviewed-Content-Hash: design/art/art-bible.md 8ed5835f726d685d71fe17723b76d999bae2f723

### Revision — 2026-10-27（复审之后）
2 项阻塞已改：删掉 onAdd；新增规则 3a 说明下压当场改盘面、不申请令牌，出手当场扣心增兵后才演出，与对局流程分发表一致；蓄力档位的验收改为 hud().charge 加界面 tier。建议项：蓄力逐次钳位、连错到 100 时在 tick 末出手；waveList 行内偶数和 pool 正整数、按兵种表顺序累加；三条验收的前提；r_need = 3000 / interval；dangerMs 的帧内时点；全局常量说明。
修订后待第三轮复审（全新子代理）。

## Review — 2026-10-27（第三轮）— Verdict: APPROVED
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 0 | Recommended: 8
Summary: 第二轮 2 项阻塞已解决：执行时序与对局流程分发表一致，档位验收可测。登记表 102 处命中无冲突，三项用户决定吻合。
Prior verdict resolved: Yes
Findings:
- [RECOMMENDED] Tuning Knobs 里 r_need 仍写 3 / interval
- [RECOMMENDED] HOST_ATTACK_MS 安全范围上限应为 600（美术圣经 R5）
- [RECOMMENDED] 出手验收要写步长；连不上时蓄力条动一下的信号来源
- [RECOMMENDED] 空盘下压要在 dtGame > 0 的 tick；敌将胜利条件补“或盘面清空”；粮草模式 comboReward 不做事
Reviewed-Content-Hash: design/gdd/battle-pressure.md 7fece5395d2d87ef3cb3a9fc62e271e470bd7504
Reviewed-Content-Hash: design/registry/entities.yaml a03bb12a4dc725bbd35a7e8375f0d2352c5ddc0a
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/battle-pressure-review-log.md c6cba0df4c0980420af3a5fa3160affc8558d94e
Reviewed-Content-Hash: design/gdd/round-flow.md d527773f2977d6ee2283a68ead458d6ee2b7c92e
Reviewed-Content-Hash: design/gdd/ui-interaction.md b6917b89c3a42583637fe39a3d345c1c13b27f4e
Reviewed-Content-Hash: design/gdd/board-link.md bc9e358e7cdc30be9a4f3adbb6670c39f8990652
Reviewed-Content-Hash: design/gdd/chapter-design.md c0e9d55d527107d691b99ad447880d5be89a6ee4
Reviewed-Content-Hash: design/gdd/clear-effects.md ad486b371ddb45e0bc75d2088776dbf9e7932570
Reviewed-Content-Hash: design/gdd/general-skills.md 1ed7d529af0bf601d29022bcb8aa958ca2379216
Reviewed-Content-Hash: design/gdd/progress-save.md 77d944f116250cfefb48198a2edec4c1940d8689
Reviewed-Content-Hash: design/gdd/systems-index.md 17594ea6c4f07847650183c5b7063b6a2dc87f50
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/art/art-bible.md d65acad5f16e94183d8f461556fb6d9768b7d68c

### Amendment（批准后小修） — 2026-10-27（第三轮之后）
采纳第三轮建议：Tuning Knobs 的 r_need 写成 3000 / interval、HOST_ATTACK_MS 安全范围上限改 600（美术圣经 R5）、空盘立刻下压限定在 dtGame > 0 的 tick、粮草模式 comboReward 不做事、敌将胜利条件补“或盘面清空”（只为盘面保底清除这种不扣血的极端情况兜底）。最后一条是规则改动，交给 /review-all-gdds 一并核对。

### Revision — 2026-10-27（跨文档总审之后）
执行打断上限（interruptSinceAttack，出手时清零）；张飞在压境改为“吓退追兵”（scareNextPush / canScare，用户决定 D4 的可实现版本）并加 scared 事件；增兵对数读回目的 boss.addPairs；注明与对局流程的循环用查询解开；保底清除的扣血说法改正；慢速档倍率以回目编排为准。
待复核（全新子代理）。

## Review — 2026-10-27（总审后复核）— Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 2 | Recommended: 5
Summary: 打断上限和吓退追兵都已实现并与其他文档一致。两处阻塞：盘空时立刻下压会不会吃掉吓退标记没定；登记表 press_schedule、boss_charge 两条已过时。
Prior verdict resolved: Yes（修订已落实）
Findings:
- [BLOCKING] Rule 10 vs 13: 盘空立刻下压与吓退标记
- [BLOCKING] 登记表 press_schedule 仍有 roarDelay，boss_charge 没有上限
- [RECOMMENDED] hud() 加 scareArmed；变量表补上限；补验收；事件列表补 scared；到点时先看吓退标记
Reviewed-Content-Hash: design/gdd/battle-pressure.md e0b3a1fd70e3e6334f0a91a16d16d76061b21916
Reviewed-Content-Hash: design/registry/entities.yaml c7422895e5166776e5a15e017c5ab13a65216f3d
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/battle-pressure-review-log.md 23951fc98e8ef643a169810b49ebe3ad47757931
Reviewed-Content-Hash: design/gdd/gdd-cross-review-2026-10-27.md e29728c5e178fdfe96e512f573a1dea6128be54f
Reviewed-Content-Hash: design/gdd/general-skills.md 686fe4c6b992627cfb1f89bad3eb489ed522b447
Reviewed-Content-Hash: design/gdd/clear-effects.md 17767f552b65433fcdfb18f9fdbc00f0ac50a13e
Reviewed-Content-Hash: design/gdd/round-flow.md ae0b1fc55a036510e040d582fbe2b9ff841afdcc
Reviewed-Content-Hash: design/gdd/ui-interaction.md ec03fe4e5186169367973669f456328dadf95bfd
Reviewed-Content-Hash: design/gdd/chapter-design.md a57362fc306dae125f93bc3360e9ff69cc57bf1f
Reviewed-Content-Hash: design/gdd/board-link.md ddfd01864cea1b2a0bf9e7a0fffb4a2c60770eb1
Reviewed-Content-Hash: design/gdd/systems-index.md 48a678a841e1908f33a28baea23fc296f47c6378
Reviewed-Content-Hash: design/gdd/progress-save.md c390ad7db13ac935f910f053087d8f73f57b1061

### Revision — 2026-10-27（总审后复核之后）
盘空时的立刻下压不受吓退标记影响（照常下压、标记保留给下一次到点的下压），规则 10、13 和验收同步；hud() 加 scareArmed；登记表 press_schedule 去掉 roarDelay、boss_charge 补上限。
待最后确认。

## Review — 2026-10-27（最后确认）— Verdict: APPROVED
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 0 | Recommended: 3
Summary: 上一轮的 2 项阻塞都已解决，与登记表和其他 GDD 无冲突。
Prior verdict resolved: Yes
Findings:
- [RECOMMENDED] 见最后确认的报告（细节补充，不阻塞）
Reviewed-Content-Hash: design/gdd/battle-pressure.md fde8e4416fb1842b85fff1b350eaa4f5e8f5323a
Reviewed-Content-Hash: design/registry/entities.yaml 3c7efe8a0d0f494d272f743b397e175e29469a35
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/battle-pressure-review-log.md c76cbcdfad77e964fda242a63ba2c1996bbad603
Reviewed-Content-Hash: design/gdd/clear-effects.md 76c5c5b8862d4ee99429bcc8a3d1f04c073d4658
Reviewed-Content-Hash: design/gdd/progress-save.md cdb5848226207b07293825f79d2c2606c3abcf8c
Reviewed-Content-Hash: design/gdd/ui-interaction.md bfa00041c182cb9fa1daac4c34119398a291744a
Reviewed-Content-Hash: design/gdd/general-skills.md 686fe4c6b992627cfb1f89bad3eb489ed522b447
Reviewed-Content-Hash: design/gdd/chapter-design.md a57362fc306dae125f93bc3360e9ff69cc57bf1f
Reviewed-Content-Hash: design/gdd/game-concept.md b9259643dd0003e64dc9b0fd6d35ed1e66261e03

### Amendment — 2026-10-27（门禁之后，用户决定与总监意见）
按技术总监意见处理 N3、W9：写明张飞 resetCharge() 不重置打断额度并补验收；增兵对数在变量表和调参表里改为回目字段 boss.addPairs（BOSS_ADD_PAIRS 是推荐值和安全范围）。未再复审。
