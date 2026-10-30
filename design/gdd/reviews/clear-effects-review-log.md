# Review Log: clear-effects.md

## Review — 2026-10-27 — Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: M
Specialists: none (lean mode)
Blocking items: 5 | Recommended: 8
Summary: 核心数值与登记表一致，必需小节齐全。最要紧的是粮草模式里“扣粮判负”抢在“效果清屏”之前，会把能赢的局判输；其次是接口归属、连斩边界、无目标提示的文案与时长、验收标准。审查者是全新子代理。
Prior verdict resolved: First review
Findings:
- [BLOCKING] Detailed Rules: 粮草模式扣粮判负与效果结算的先后没定，food=1 时消火会被判输
- [BLOCKING] Interactions: 连斩推迟和打断由谁执行、谁封顶没写；maxCombo 没有接口；“是否强制”与 board-link 事件不符
- [BLOCKING] Detailed Rules: 连不上是否打断连斩、超过十二怎么显示、lastMatchAt/maxCombo 何时更新与重置都没写
- [BLOCKING] Detailed Rules: 无目标提示时长 900 与喊字位 1200 冲突，文案三个版本，字体未定
- [BLOCKING] Acceptance Criteria: 第 3、4 连斩的蓄力算式忽略增长；规则 5、7 等没有验收；“最高连斩”一条是同义反复
- [RECOMMENDED] Formulas: 敌将打断没有上限，持续三连斩可让敌将永不出手
- [RECOMMENDED] Detailed Rules: 380 ms 用什么计时器没写
- [RECOMMENDED] Detailed Rules: 效果令牌与死局洗牌的先后
- [RECOMMENDED] Detailed Rules: “打断！”和效果名同时进喊字位的顺序；ui-interaction 只有斩痕
- [RECOMMENDED] UI Requirements: 预告圈、双线框、角印没进 ui-interaction
- [RECOMMENDED] Open Questions: “一对还是两对”已有答案
- [RECOMMENDED] Tuning Knobs: PRESS_DELAY_CAP_MS 范围与 battle-pressure 不一致；依赖双向缺口
- [RECOMMENDED] 外部: general-skills 引用的规则号有误；概念文档支柱 5 措辞过时
Reviewed-Content-Hash: design/gdd/clear-effects.md 018cc74f4dd54b5e318d57408ec7b47f70db3283
Reviewed-Content-Hash: design/registry/entities.yaml 2c2277bdfb2dc58fbd9ac11e0087caf346bd5448
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/board-link.md 3830e14e000678a013326e7bc81c75df17553c49
Reviewed-Content-Hash: design/gdd/round-flow.md d9f34f9132da0821bb06b9d65f8083dd710690d2
Reviewed-Content-Hash: design/gdd/battle-pressure.md 4114d70f427bd380c71c304769be27957289d647
Reviewed-Content-Hash: design/gdd/general-skills.md 90bbf230e9593180639be1ca3240ba2078609aa4
Reviewed-Content-Hash: design/gdd/chapter-design.md 8258eda5cbd7ab87ec595e50b986df72c511a7ab
Reviewed-Content-Hash: design/gdd/progress-save.md 30c98c04000b0a7ae3bafee19e8dcbe47383a6e8
Reviewed-Content-Hash: design/gdd/ui-interaction.md d8c9cfafbf5642eebe153d6de58229f2131946dc
Reviewed-Content-Hash: design/gdd/systems-index.md e1c4b38c955cda945e5c6c02f13fe143012d8310
Reviewed-Content-Hash: design/gdd/game-concept.md e5061a7788be23a497ed71e91a1265fe07ff7b65
Reviewed-Content-Hash: design/art/art-bible.md 8ed5835f726d685d71fe17723b76d999bae2f723

### Revision — 2026-10-27（同一会话，审查之后）
5 项阻塞全部改掉：结算顺序和“结算点”交给对局流程统一规定，粮草判负发生在效果清除之后；连斩奖励由本系统判定、战场压力执行（comboReward），数值归本系统；连不上不影响连斩，13 以上显示“连斩不断”，三个数值的更新和重置写清；无目标提示统一为读的字“{目标}已经没了”、停留 SHOUT_MS；验收标准补齐并修正（同一段游戏时间、边界 3000/3001、非玩家清除）。打断上限留作开放问题（试玩专门观察）。
修订后待复审（全新子代理）。

## Review — 2026-10-27（复审）— Verdict: APPROVED
Review mode: lean · Workflow: standard
Scope signal: M
Specialists: none (lean mode)
Blocking items: 0 | Recommended: 6
Summary: 首轮 5 项阻塞全部解决，修订没有带进新的阻塞，数值与登记表和其他 7 份 GDD 无冲突。剩下的都是建议项。
Prior verdict resolved: Yes
Findings:
- [RECOMMENDED] Interactions: comboReward() 应返回实际扣掉的蓄力或推迟量，界面据此决定画不画斩痕
- [RECOMMENDED] 外部: round-flow 规则 4 把连斩列为喊字；ui-interaction 的 R2 验收要排除连斩字
- [RECOMMENDED] Tuning Knobs: EFFECT_HIGHLIGHT_MS 下限 200 与令牌公式 duration 下限 300 不一致
- [RECOMMENDED] Acceptance Criteria: 补蓄力为 0 的打断、赵云强消马触发铁骑
- [RECOMMENDED] Open Questions: 打断上限要在竖切片前试玩定下
- [RECOMMENDED] Visual: 连斩字重叠时旧字怎么退
Reviewed-Content-Hash: design/gdd/clear-effects.md ad486b371ddb45e0bc75d2088776dbf9e7932570
Reviewed-Content-Hash: design/registry/entities.yaml 897bb597650e5d12e9f2f96d4db1af2c20e800c0
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/clear-effects-review-log.md 7b8d0fd92cdec26d181717521f140a86fa50aa78
Reviewed-Content-Hash: design/gdd/round-flow.md 1c00d6dc51d45a2a038f6135643b48085810d25d
Reviewed-Content-Hash: design/gdd/battle-pressure.md 16bc3fdee83f31890213b1adc186f4cd1487c092
Reviewed-Content-Hash: design/gdd/board-link.md 4c6492fbe631408f096f291edb2bda1bc935e1fa
Reviewed-Content-Hash: design/gdd/ui-interaction.md 97d7a44b0bd1055de742aaa8e9fcab7bd22f2db0
Reviewed-Content-Hash: design/gdd/general-skills.md 7cbf9f95cfea2587981090bcde3cab5a8c9d8820
Reviewed-Content-Hash: design/gdd/chapter-design.md d1d938cc980e6d146e2d17e4c673781696a4dac9
Reviewed-Content-Hash: design/gdd/progress-save.md 49d775bbecf90db07912d584be49a9112b2c630d
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/art/art-bible.md 8ed5835f726d685d71fe17723b76d999bae2f723

### Amendment（批准后小修） — 2026-10-27（第三轮之后）
修正对局流程规则号的旧引用（“第 3 步执行”改为“按它的分发表执行”）。

### Revision — 2026-10-27（跨文档总审之后）
按用户决定（D2）给敌将打断加上限：两次出手之间累计最多 BOSS_INTERRUPT_CAP = 50，出手后清零；comboReward() 返回实际扣掉的量，为 0 时不画斩痕；公式、调参项、验收、开放问题同步。空闲状态从“待命”改名“空闲”，避免和赵云的待命重名。
待复核（全新子代理）。

## Review — 2026-10-27（总审后复核）— Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: M
Specialists: none (lean mode)
Blocking items: 2 | Recommended: 4
Summary: 打断上限的规则、公式、调参、验收都已写入，边界代值无退化。两处一行就能改：验收 209 最后一句“出手后又能扣 25”没考虑出手会把蓄力清零；登记表 boss_charge 的表达式没同步上限。
Prior verdict resolved: Yes（修订已落实）
Findings:
- [BLOCKING] AC 209 最后一句不成立
- [BLOCKING] 登记表 boss_charge 表达式没有上限
- [RECOMMENDED] 例子补“本周期未打断”；张飞清零不重置计数；ui 的斩痕条件；battle-pressure 变量表补上限
Reviewed-Content-Hash: design/gdd/clear-effects.md 17767f552b65433fcdfb18f9fdbc00f0ac50a13e
Reviewed-Content-Hash: design/registry/entities.yaml c7422895e5166776e5a15e017c5ab13a65216f3d
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/clear-effects-review-log.md 743c05fad630173d2af5834ae55f4de939566b8f
Reviewed-Content-Hash: design/gdd/battle-pressure.md e0b3a1fd70e3e6334f0a91a16d16d76061b21916
Reviewed-Content-Hash: design/gdd/gdd-cross-review-2026-10-27.md e29728c5e178fdfe96e512f573a1dea6128be54f
Reviewed-Content-Hash: design/gdd/ui-interaction.md ec03fe4e5186169367973669f456328dadf95bfd
Reviewed-Content-Hash: design/gdd/general-skills.md 686fe4c6b992627cfb1f89bad3eb489ed522b447
Reviewed-Content-Hash: design/gdd/chapter-design.md a57362fc306dae125f93bc3360e9ff69cc57bf1f
Reviewed-Content-Hash: design/gdd/game-concept.md b9259643dd0003e64dc9b0fd6d35ed1e66261e03
Reviewed-Content-Hash: design/gdd/round-flow.md ae0b1fc55a036510e040d582fbe2b9ff841afdcc
Reviewed-Content-Hash: design/gdd/progress-save.md c390ad7db13ac935f910f053087d8f73f57b1061
Reviewed-Content-Hash: design/gdd/systems-index.md 48a678a841e1908f33a28baea23fc296f47c6378
Reviewed-Content-Hash: design/gdd/board-link.md ddfd01864cea1b2a0bf9e7a0fffb4a2c60770eb1

### Revision — 2026-10-27（总审后复核之后）
验收 209 改为“出手后 interruptSinceAttack 归零，蓄力回到 25 以上再三连斩返回 25”；登记表 boss_charge 的表达式补上上限和 interruptSinceAttack。
待最后确认。

## Review — 2026-10-27（最后确认）— Verdict: APPROVED
Review mode: lean · Workflow: standard
Scope signal: M
Specialists: none (lean mode)
Blocking items: 0 | Recommended: 3
Summary: 上一轮的 2 项阻塞都已解决，与登记表和其他 GDD 无冲突。
Prior verdict resolved: Yes
Findings:
- [RECOMMENDED] 见最后确认的报告（细节补充，不阻塞）
Reviewed-Content-Hash: design/gdd/clear-effects.md 76c5c5b8862d4ee99429bcc8a3d1f04c073d4658
Reviewed-Content-Hash: design/registry/entities.yaml 3c7efe8a0d0f494d272f743b397e175e29469a35
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/clear-effects-review-log.md ea4f19ec6965b897b752cde69da155d7cef24e58
Reviewed-Content-Hash: design/gdd/battle-pressure.md fde8e4416fb1842b85fff1b350eaa4f5e8f5323a
Reviewed-Content-Hash: design/gdd/ui-interaction.md bfa00041c182cb9fa1daac4c34119398a291744a
Reviewed-Content-Hash: design/gdd/general-skills.md 686fe4c6b992627cfb1f89bad3eb489ed522b447

## Review — 2026-10-30 — Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: M
Specialists: none (lean)
Blocking items: 2 | Recommended: 7
Summary: 按步退（combo_pushback）机制在本文、对局流程、战场压力、界面四处一致，只有两处机械不一致：battle-pressure 抄写的调参范围，以及登记表 combo_count 区间与本文“无上限”的写法。均已修，待复审。
Prior verdict resolved: Yes（上次两条阻塞所依附的字段随新机制废止）
Findings:
- [BLOCKING] Formulas / Tuning Knobs vs battle-pressure.md:227: COMBO_PUSHBACK / CAP 范围两处写法 — 已修（本文不变，battle-pressure 改为 1–2 / 1–4）
- [BLOCKING] Formulas combo_count: 输出范围与 registry `[1, 999]` 不一致 — 已修（本文改为 0–999，实现封顶 999，显示 13 起「连斩不断」；registry 的 `output_range` 须改 `[0, 999]`，由另一会话处理）
- [RECOMMENDED] stepsMax 8/6 写成定值 — 已修（改为默认值，以回目 `boss` 数据为准；调参表同步）
- [RECOMMENDED] battle-pressure 的 `comboDelay` 统一为 `comboDelay_w` — 已修（在 battle-pressure 中）
- [RECOMMENDED] 头部 Last Verified / Status — 已修（In Review；systems-index 状态由他处同步）
- [RECOMMENDED] ui-interaction 写死“已退满 2 步” — 未改（他文档）
- [RECOMMENDED] 验收缺口（二连斩 / 十二连斩显示、换阶段清零、震慑期退步、压境无下压机会、AC 220/222 拆分） — 未改（留待复审）
- [RECOMMENDED] systems-index 第 82、101 行旧措辞 — 未改（他文档）
- [RECOMMENDED] Open Questions 1 标“数值待试玩” — 未改（留待复审）
Reviewed-Content-Hash: design/gdd/clear-effects.md 81ca4b1bde6ee9942d8cd678935ceb7f9df1dd75
Reviewed-Content-Hash: design/registry/entities.yaml 9b88f1c949f5e636c3d0ba131a4bc5616d38c526
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
（以上哈希取修订前的 git 版本 f3a96f9，即本次审查读到的版本；由主会话补填）
