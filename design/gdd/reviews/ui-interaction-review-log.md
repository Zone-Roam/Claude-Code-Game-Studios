# Review Log: ui-interaction.md

## Review — 2026-10-27 — Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 7 | Recommended: 6
Summary: 结构完整，大体符合美术圣经第 7 节 R1–R7。要改的是：布局数学在常见小屏机型上格距低于 52；喊字位的锁定属性自相矛盾、与四份上游文档的文案和位置不一致；触控、暂停、横屏、档位规则需要猜；核心契约 R1–R3 没有验收。审查者是全新子代理。
Prior verdict resolved: First review
Findings:
- [BLOCKING] Formulas fit_scale: 667 高的机型格距约 46，与美术圣经“不低于 52”冲突；AC 没给 H
- [BLOCKING] Core Rules 5/18: 喊字位锁定属性自相矛盾；洗牌、粮草连不上、打断、无目标提示、三连斩的落点与上游不一致
- [BLOCKING] Core Rules 13–16: 牌的判定点、“点盘”的范围、pointercancel、推行宽限细节、满格无效果和待命牌都没规则
- [BLOCKING] Core Rules 5/17: 暂停卡和横屏卡没有画面定义；对局中不能回书目；暂停印位置不一致
- [BLOCKING] Core Rules 1/3: 失败提示和水牌规则句没有数据来源；最后一回胜利卡的按钮
- [BLOCKING] Formulas tier: 危险档对应哪一档、降档计时基准没定；AC11 自相矛盾；压境最后一波后 t=∞
- [BLOCKING] Acceptance Criteria: R1–R3 没有验收；多条无法独立判定
- [RECOMMENDED] Core Rules 4–7: 台眉分区和高度表、牌宽公式、连斩字位置、窄屏覆盖卡
- [RECOMMENDED] Core Rules 18–19: 台词与横幅位置；预告圈、双线框、角印没列
- [RECOMMENDED] Core Rules 20/24: 楷体占位在安卓上多半退回黑体；剩几对字号
- [RECOMMENDED] Edge Cases: 选中何时清、非对局横屏、窗口变化、返回键、存储提示优先级
- [RECOMMENDED] Tuning Knobs: 缺 3000、90、topMin、死区；性能项没有验收
- [RECOMMENDED] Interactions: 可见性事件方向；格距与 board-link 不一致；1.5 秒提示两处定义
Reviewed-Content-Hash: design/gdd/ui-interaction.md d8c9cfafbf5642eebe153d6de58229f2131946dc
Reviewed-Content-Hash: design/registry/entities.yaml 2c2277bdfb2dc58fbd9ac11e0087caf346bd5448
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/board-link.md 3830e14e000678a013326e7bc81c75df17553c49
Reviewed-Content-Hash: design/gdd/round-flow.md d9f34f9132da0821bb06b9d65f8083dd710690d2
Reviewed-Content-Hash: design/gdd/clear-effects.md 018cc74f4dd54b5e318d57408ec7b47f70db3283
Reviewed-Content-Hash: design/gdd/battle-pressure.md 4114d70f427bd380c71c304769be27957289d647
Reviewed-Content-Hash: design/gdd/general-skills.md 90bbf230e9593180639be1ca3240ba2078609aa4
Reviewed-Content-Hash: design/gdd/chapter-design.md 8258eda5cbd7ab87ec595e50b986df72c511a7ab
Reviewed-Content-Hash: design/gdd/progress-save.md 30c98c04000b0a7ae3bafee19e8dcbe47383a6e8
Reviewed-Content-Hash: design/gdd/systems-index.md e1c4b38c955cda945e5c6c02f13fe143012d8310
Reviewed-Content-Hash: design/gdd/game-concept.md e5061a7788be23a497ed71e91a1265fe07ff7b65
Reviewed-Content-Hash: design/art/art-bible.md 8ed5835f726d685d71fe17723b76d999bae2f723
Reviewed-Content-Hash: production/gate-checks/2026-10-26-concept-to-systems-design.md 5010807b72c1cd60aea96bab22706a23c0db8267

### Revision — 2026-10-27（同一会话，审查之后）
7 项阻塞全部改掉：fit_scale 加让出顺序（台眉 160→115、桌沿 96→80）后整体缩放，并把“小屏格距低于 52”明确记为与美术圣经的已知冲突、待真机核实；喊字位写成一张总表（字体、长度、时长、当时是否有令牌），喊字位本身从不锁盘；触控规则写清（isPrimary、点盘的范围、牌在抬起时判定、pointercancel、推行宽限细节、三种不能释放的说明）；补暂停卡、横屏卡、返回键；文字来源指向回目数据；档位编号和降档计时写清，验收改为测试注入；补 R1–R3 的验收。建议项：台眉分区表、牌宽公式、连斩字位置、楷体占位在安卓上会退回黑体。
修订后待复审（全新子代理）。

## Review — 2026-10-27（复审）— Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 3 | Recommended: 11
Summary: 首轮 7 项中 6 项已解决、1 项部分解决。剩 3 项局部问题：R1 的验收写成双向、按设计过不了；fit_scale 的让出算法和 6 行例子；两处与美术圣经的冲突没记（楷体占位、剩几对字号）。667 高屏幕的格距按已记录风险处理。
Prior verdict resolved: Mostly（7 项中 6 项已解决）
Findings:
- [BLOCKING] Overview / Rule 22 / AC: R1 应为单向“有遮挡 ⇒ 盘锁住”
- [BLOCKING] Formulas fit_scale: 让出写成伪代码，修正 6 行例子
- [BLOCKING] Rules 6/30: 楷体占位与美术圣经冲突；剩几对应为 18 px
- [RECOMMENDED] 缩放连带字号和触控尺寸；frameSide 固定 6；粮袋格写法统一
- [RECOMMENDED] 粮草模式返回键、横屏叠后台、锁盘时能否点暂停印；效果规则行的文字来源；R7 的测量对象；紧凑台眉放不下 8 字台词
Reviewed-Content-Hash: design/gdd/ui-interaction.md 97d7a44b0bd1055de742aaa8e9fcab7bd22f2db0
Reviewed-Content-Hash: design/registry/entities.yaml 897bb597650e5d12e9f2f96d4db1af2c20e800c0
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/ui-interaction-review-log.md f34a2e37e07d3017ef0b5e9745ddfbf369ca77e7
Reviewed-Content-Hash: design/art/art-bible.md 8ed5835f726d685d71fe17723b76d999bae2f723
Reviewed-Content-Hash: design/gdd/round-flow.md 1c00d6dc51d45a2a038f6135643b48085810d25d
Reviewed-Content-Hash: design/gdd/board-link.md 4c6492fbe631408f096f291edb2bda1bc935e1fa
Reviewed-Content-Hash: design/gdd/battle-pressure.md 16bc3fdee83f31890213b1adc186f4cd1487c092
Reviewed-Content-Hash: design/gdd/clear-effects.md ad486b371ddb45e0bc75d2088776dbf9e7932570
Reviewed-Content-Hash: design/gdd/general-skills.md 7cbf9f95cfea2587981090bcde3cab5a8c9d8820
Reviewed-Content-Hash: design/gdd/chapter-design.md d1d938cc980e6d146e2d17e4c673781696a4dac9
Reviewed-Content-Hash: design/gdd/progress-save.md 49d775bbecf90db07912d584be49a9112b2c630d
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/gdd/systems-index.md 40986b005a93ead061166f5aec4f0b185b0befa8
Reviewed-Content-Hash: production/gate-checks/2026-10-26-concept-to-systems-design.md 5010807b72c1cd60aea96bab22706a23c0db8267

### Revision — 2026-10-27（复审之后）
3 项阻塞已改：R1 改为单向（有遮挡 ⇒ 盘锁住），规则 22 改为“盘锁住时”；fit_scale 写成三组依次尝试的步骤，修正 6 行例子；MVP 喊的字改用黑体 700 占位（不用楷体，与美术圣经一致），剩几对改 18 px。建议项：缩放连带字号和触控记入已知冲突、frameSide 固定 6、粮袋格写法统一、三种模式都有暂停印且锁盘时可点、横屏叠后台、effectLine 来源、R7 测量对象、横幅可占满台眉上行、胜利卡显示放过的技能、补验收。
修订后待第三轮复审（全新子代理）。

## Review — 2026-10-27（第三轮）— Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 1 | Recommended: 7
Summary: 第二轮 3 项阻塞全部解决，例子全部重算无误，两项已记录的偏离写法一致。新发现 1 项：界面拿不到一次点击的结果（折线、forced、miss 的两块、clear 的格子），对局流程只把它们交给三个规则系统。
Prior verdict resolved: Yes（第二轮 3 项已解决）
Findings:
- [BLOCKING] Interactions / 对局流程规则 6: 缺“把 match、miss、clear 交给界面”这一步
- [RECOMMENDED] R4 验收的措辞；R1、R2 验收的范围
- [RECOMMENDED] 粮袋格实心数取 min(food, 格数)；怎么判断横屏
- [RECOMMENDED] 横幅盖住暂停印；暂停卡开着时切后台
- [RECOMMENDED] 倒计时取整；failHint 的写法；胜利卡数据来自 RoundResult
Reviewed-Content-Hash: design/gdd/ui-interaction.md b6917b89c3a42583637fe39a3d345c1c13b27f4e
Reviewed-Content-Hash: design/registry/entities.yaml a03bb12a4dc725bbd35a7e8375f0d2352c5ddc0a
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/ui-interaction-review-log.md 153c460c5806079962ea15496f696d003680da71
Reviewed-Content-Hash: design/gdd/round-flow.md d527773f2977d6ee2283a68ead458d6ee2b7c92e
Reviewed-Content-Hash: design/gdd/board-link.md bc9e358e7cdc30be9a4f3adbb6670c39f8990652
Reviewed-Content-Hash: design/gdd/battle-pressure.md 7fece5395d2d87ef3cb3a9fc62e271e470bd7504
Reviewed-Content-Hash: design/gdd/general-skills.md 1ed7d529af0bf601d29022bcb8aa958ca2379216
Reviewed-Content-Hash: design/gdd/chapter-design.md c0e9d55d527107d691b99ad447880d5be89a6ee4
Reviewed-Content-Hash: design/gdd/progress-save.md 77d944f116250cfefb48198a2edec4c1940d8689
Reviewed-Content-Hash: design/gdd/clear-effects.md ad486b371ddb45e0bc75d2088776dbf9e7932570
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/gdd/systems-index.md 17594ea6c4f07847650183c5b7063b6a2dc87f50
Reviewed-Content-Hash: design/art/art-bible.md d65acad5f16e94183d8f461556fb6d9768b7d68c

### Revision — 2026-10-27（第三轮之后）
1 项阻塞已改：对局流程规则 6 加第 ④ 步，把 match、miss 交给界面（在连斩更新之后），分发表里 clear、reshuffle 也送到界面；本文 Interactions 表写明结果的来源。建议项：R1、R4 验收的范围和措辞、粮袋格 min(food, 格数)、触屏才判横屏、暂停印在横幅之上、暂停卡开着时切后台、倒计时向上取整、failHint 的路径、胜利卡数据读 RoundResult、连不上时蓄力条的那一截由界面比较 hud().charge 画出。待第四轮复审。

## Review — 2026-10-27（第四轮）— Verdict: APPROVED
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 0 | Recommended: 4
Summary: 第三轮的阻塞已解决：对局流程规则 6 第 ④ 步把 match、miss 送到界面，分发表把各类 clear 和 reshuffle 送到界面，两份文档写法一致，验收可测。两项已记录的偏离写法一致。
Prior verdict resolved: Yes
Findings:
- [RECOMMENDED] Rule 6: 括号里“盖住暂停印”与规则 19 矛盾
- [RECOMMENDED] Rule 1: 失败卡“回目可覆盖”但回目字段表没有 failHint
- [RECOMMENDED] hostAttack 事件带上新放下的格子
- [RECOMMENDED] 不跟令牌的喊字的信号来源；技能朱勾残影的验收
Reviewed-Content-Hash: design/gdd/ui-interaction.md 9939fd4650d9cda12be257437806dd8684118cc4
Reviewed-Content-Hash: design/registry/entities.yaml b05d55e0024ef82f7a65f6f3abcc0513d7a404b5
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/ui-interaction-review-log.md f4614c2d4117e88b1a549222c6e940b11be1f5be
Reviewed-Content-Hash: design/gdd/round-flow.md af0b57fda16f4dc500fde82ef6770b8ae4d6d06e
Reviewed-Content-Hash: design/gdd/board-link.md 969d4fd94b714d27049b601827f1d539c8853a24
Reviewed-Content-Hash: design/gdd/battle-pressure.md ae1eac1e1c1032c7b0f8eb894f1c5e9f418784a5
Reviewed-Content-Hash: design/gdd/clear-effects.md 39efea1e9015423e7f884aa634ed3cc62c1c0d44
Reviewed-Content-Hash: design/gdd/general-skills.md 7d605759e12c9863d37e129f2086d371d9b1879e
Reviewed-Content-Hash: design/gdd/chapter-design.md cdf81b77e54acd7d0098c209920994e3fd2ce864
Reviewed-Content-Hash: design/gdd/progress-save.md 926f997571f04bbc2c0394a1836c8bd66f25c295
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/art/art-bible.md d65acad5f16e94183d8f461556fb6d9768b7d68c

### Revision — 2026-10-27（跨文档总审之后）
喊字位：跟令牌的喊字出现时撤掉正在显示的不跟令牌喊字，赵云待命用掉时撤回提示；朱勾残影画在不随盘移动的层；加“追兵被吓退”反馈；胜利卡加写档失败一行；“抬手才判定”与“救命赶得上”的取舍进开放问题。
待复核（全新子代理）。

## Review — 2026-10-27（总审后复核）— Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 2 | Recommended: 5
Summary: 5 项修订都已写进。两处阻塞：打断斩痕写“蓄力为 0 时不画”，和清除效果“返回 0 不画”（含打满上限）冲突；“这一回没存上”拿不到数据，显示条件和放在哪张卡没定。
Prior verdict resolved: Yes（修订已落实）
Findings:
- [BLOCKING] Rule 21: 斩痕条件改为 comboReward 返回 0 时不画
- [BLOCKING] 写档失败一行的数据来源和显示条件
- [RECOMMENDED] 喊字表补追兵被吓退；残影与下压；吓退后的档位显示；两条新喊字规则的验收；字号
Reviewed-Content-Hash: design/gdd/ui-interaction.md ec03fe4e5186169367973669f456328dadf95bfd
Reviewed-Content-Hash: design/registry/entities.yaml c7422895e5166776e5a15e017c5ab13a65216f3d
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/ui-interaction-review-log.md 0fdcaf532d0c50dff763428195c6de8f936bb57a
Reviewed-Content-Hash: design/gdd/gdd-cross-review-2026-10-27.md e29728c5e178fdfe96e512f573a1dea6128be54f
Reviewed-Content-Hash: design/gdd/progress-save.md c390ad7db13ac935f910f053087d8f73f57b1061
Reviewed-Content-Hash: design/gdd/clear-effects.md 17767f552b65433fcdfb18f9fdbc00f0ac50a13e
Reviewed-Content-Hash: design/gdd/battle-pressure.md e0b3a1fd70e3e6334f0a91a16d16d76061b21916
Reviewed-Content-Hash: design/gdd/general-skills.md 686fe4c6b992627cfb1f89bad3eb489ed522b447
Reviewed-Content-Hash: design/gdd/round-flow.md ae0b1fc55a036510e040d582fbe2b9ff841afdcc
Reviewed-Content-Hash: design/gdd/game-concept.md b9259643dd0003e64dc9b0fd6d35ed1e66261e03
Reviewed-Content-Hash: design/art/art-bible.md d65acad5f16e94183d8f461556fb6d9768b7d68c

### Revision — 2026-10-27（总审后复核之后）
斩痕条件改为 comboReward() 返回 0 时不画；“这一回没存上”读 SettleOutcome.saved，胜利卡和失败卡都显示，18 px；喊字表补“追兵被吓退”，事件列表补 scared。
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
Reviewed-Content-Hash: design/gdd/ui-interaction.md bfa00041c182cb9fa1daac4c34119398a291744a
Reviewed-Content-Hash: design/registry/entities.yaml 3c7efe8a0d0f494d272f743b397e175e29469a35
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/ui-interaction-review-log.md 2ca529bf3ba613eeb32229febd52f0915da7badb
Reviewed-Content-Hash: design/gdd/progress-save.md cdb5848226207b07293825f79d2c2606c3abcf8c
Reviewed-Content-Hash: design/gdd/clear-effects.md 76c5c5b8862d4ee99429bcc8a3d1f04c073d4658
Reviewed-Content-Hash: design/gdd/battle-pressure.md fde8e4416fb1842b85fff1b350eaa4f5e8f5323a
Reviewed-Content-Hash: design/gdd/general-skills.md 686fe4c6b992627cfb1f89bad3eb489ed522b447
Reviewed-Content-Hash: design/gdd/systems-index.md 48a678a841e1908f33a28baea23fc296f47c6378

### Amendment — 2026-10-27（门禁之后，用户决定与总监意见）
按用户决定，开讲水牌的出阵武将旁加一行本回技能说明（texts.skillLine，16 px）。未再复审。

## Review — 2026-10-30 — Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: XL
Specialists: none (lean)
Blocking items: 4 | Recommended: 10
Summary: 上次 APPROVED 之后文档又并入切片第四至六版、选将、选排选列、刘备反馈和 5 列大棋子，按整份重审。5 列 8 行的压境盘（正式版最常见组合）在旧 fit_scale 下被整体缩放到 0.89–0.95，字号和触控区一起变小；另有暴怒晃动幅度、震动规格、档位 bottom 条件、点将区版式四处要对齐。4 项阻塞已按用户决定（D1、D6 等）全部修改，待复审。
Prior verdict resolved: Yes
Findings:
- [BLOCKING] 规则 5 / fit_scale / AC: 5 列 8 行压境盘被整体缩放 — 已修（先把格距从 72 降到 52，再整体缩放；375×734 为格距 60、scale 1；412 宽 60；360×734 为 60；667 高 H=600 为 52、scale ≈ 0.905；补算例和 AC）
- [BLOCKING] 规则 21c / Game Feel / AC: 暴怒晃动 ≤ 5 px 与美术圣经 ≤ 4 px 不符；震动无规格；闪白无上限 — 已修（≤ 4 px、新增规则 21d：`navigator.vibrate` 能力检测加 try/catch、iOS 只有视觉、减弱动态效果与暂停与后台不震、闪白不透明度 ≤ 0.35、补 AC；平台探测页需加 `vibrate` 键，由主会话添加）
- [BLOCKING] tier 公式: `bottom` 与战场压力 `bottomOccupied` 不一致，拒马会错报档位 — 已修（改读 `hud().bottomOccupied`，变量表和 AC 补上）
- [BLOCKING] 规则 7a / AC: 点将区展开区版式没有数字 — 已修（padX 20、小牌 64 × 72、间距 12；Ws = 360：k = 4、2 行；Ws = 480：k = 5、1 行；向上展开判据 < 20 px；AC 断言每张 ≥ 44 × 44、离“开讲”≥ 20 px）
- [RECOMMENDED] 规则 24 返回键行为不全 — 未改（留待复审后补小表和验收）
- [RECOMMENDED] 点将区防连点与点开讲的措辞 — 已修（与 round-flow 对齐：从按钮出现起算，展开区外点开讲收起并开讲）
- [RECOMMENDED] 选排选列期间喊字排队、关羽牌面字一起撤回 — 未改（留待复审后）
- [RECOMMENDED] 武将牌死区从抬起后位置量（20 还是 24） — 未改（留待美术圣经修订时一并定）
- [RECOMMENDED] 过期文字（Cross-References 70 / 90、已定的两条开放问题、规则 1 的“3 种”、Last Verified）— 已修；另有赵云护盾横幅统一为“赵云挡下！”、水牌示例用第 9 回（无鼓）
- [RECOMMENDED] 5 列格距范围 63–72 的统一 — 已修（本文；开放问题已关闭）；chapter-design、board-link 的“66–72”由其他会话改
- [RECOMMENDED] 验收的可测性（喊字包围盒、固定种子回放、基准机、340 ms ± 1 帧、规则 14 / 18 / 25 缺验收）— 未改（留待复审后）
- [RECOMMENDED] 美术圣经依赖点清单（翻牌弹出 0.55 / 1.08 / 1、落点光芒与墨点四溅、两个例外幅度、规则 7 与 card_width 对美术圣经的数字、九宫格切线、毛笔体）— 未改（美术圣经修订是已知未决项；修订后本文做一次一致性复核）
- [RECOMMENDED] design/accessibility-requirements.md 的过期数据（“块 52 px”“武将牌 ≥ 72 px”“牌间 ≥ 8”、光敏行）— 未改（不在本次改动范围）
- [RECOMMENDED] TIER_MIN_DWELL_MS、SAME_CELL_GUARD_MS、PUSH_GRACE_MS 进登记表 — 未改（登记表由其他会话处理）
Reviewed-Content-Hash: design/gdd/ui-interaction.md 4714ad46a36cb05ce0cab7f0758d4639cd303459
Reviewed-Content-Hash: design/registry/entities.yaml 9b88f1c949f5e636c3d0ba131a4bc5616d38c526
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
（以上哈希取修订前的 git 版本 f3a96f9，即本次审查读到的版本；由主会话补填）
