# Review Log: board-link.md

## Review — 2026-10-27 — Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 8 | Recommended: 8
Summary: 规则骨架（连通、两条不变量、保底）成立。要改的是和其他 GDD 对不上的事件与接口（是否强制、非玩家清除、查询接口）、消除后死局检查与效果的先后、推行时的选中、三份文档三套种子定义，以及点空格、洗牌演出等没定义的行为。审查者是全新子代理，没有继承写作上下文。
Prior verdict resolved: First review
Findings:
- [BLOCKING] Core Rules 6/10: “玩家消除”事件缺“是否强制”和折线；forceMatchNext 没定义；“非玩家清除”没人发；缺盘空、最下行、剩几对、洗牌等查询
- [BLOCKING] Core Rules 6/8/10: 消除后发事件与死局检查的先后没写，洗牌可能抢在效果高亮之前
- [BLOCKING] Core Rules 10: pushRowFromTop 不自查最下行；推行时选中怎么办没写；addPairs 的 kinds 含义不明
- [BLOCKING] Core Rules 3: 种子定义与 chapter-design、round-flow 冲突；洗牌和波次共用随机源会破坏“同种子同波次”
- [BLOCKING] Core Rules 3: 压境开局发牌说法与 chapter-design、battle-pressure 矛盾；校验两处重复
- [BLOCKING] Core Rules 4: 点空格、外圈、正在淡出的块时的行为没定义
- [BLOCKING] Core Rules 9: 洗牌演出没时长、没令牌，表现与 ui-interaction 矛盾；保底挪块会改变占用格，压境下可能造成破城
- [BLOCKING] Acceptance Criteria: 多条无法独立测试，修改接口、选中、保底等没有验收
- [RECOMMENDED] UI Requirements: 格距 52–64 与 ui-interaction 的 52–53 冲突
- [RECOMMENDED] Edge Cases: “只剩 2 块不连通”实际不可能，换成真实情况
- [RECOMMENDED] Core Rules 5: 折线选取规则（拐弯少优先、再取最短、扫描顺序固定）
- [RECOMMENDED] Edge Cases: 非法 clearCells 被拒后调用方没有返回值
- [RECOMMENDED] Dependencies: 回目编排应写成双向数据约定
- [RECOMMENDED] Open Questions: 第一条已解决；“洗牌只计数”没有消费方
- [RECOMMENDED] Formulas: deck[k] 上限无出处；tries_used 未使用
- [RECOMMENDED] Player Fantasy: 补一小节（advisory）
Reviewed-Content-Hash: design/gdd/board-link.md 3830e14e000678a013326e7bc81c75df17553c49
Reviewed-Content-Hash: design/registry/entities.yaml 2c2277bdfb2dc58fbd9ac11e0087caf346bd5448
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/round-flow.md d9f34f9132da0821bb06b9d65f8083dd710690d2
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
8 项阻塞全部改掉：点击结果改为返回数据（match 带 forced 和折线、miss、clear 即“非玩家清除”、push、add、reshuffle）并补齐查询接口；I2 只在对局流程定义的“结算点”检查，洗牌不会抢在效果前；pushRowFromTop 自查最下行、选中随块下移；addPairs 改为逐对兵种列表；一个种子派生 deal/shuffle/wave/add 四条独立随机流；压境发牌与校验归属理清；点空格和外圈的行为写成表；洗牌改为 reshuffle 令牌 400 ms、只用“抽走、落下”，保底改为对调兵种、占用格不变。建议项：格距改 52–53、折线选取规则、clearCells 返回值、双向数据约定、补 Player Fantasy。赵云按用户决定改为“下一对必用掉”（规则 12）。
修订后待复审（全新子代理）。

## Review — 2026-10-27（复审）— Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 2 | Recommended: 7
Summary: 首轮 8 项阻塞基本消除，与登记表无冲突，保底对调已核实占用格和偶数不变。剩两处接口缺口：没有清选中的接口；洗牌令牌由谁申请、谁归还没说清。
Prior verdict resolved: Mostly（8 项中 6 项已解决，2 项基本解决）
Findings:
- [BLOCKING] Core Rules 11/14: 缺 clearSelection()，武将技能释放时要清选中
- [BLOCKING] Core Rules 10 / Dependencies: reshuffle 令牌的申请和归还方不清（规则函数只返回数据）
- [RECOMMENDED] pushRowFromTop 的前提（每种偶数）与统一的 {ok:false}
- [RECOMMENDED] Interactions 补 add 流；规则 3 的“同种子”限定为同一串操作
- [RECOMMENDED] 赵云连线画法统一；补几条验收；ensurePlayable 的返回值
Reviewed-Content-Hash: design/gdd/board-link.md 4c6492fbe631408f096f291edb2bda1bc935e1fa
Reviewed-Content-Hash: design/registry/entities.yaml 897bb597650e5d12e9f2f96d4db1af2c20e800c0
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/board-link-review-log.md fbe462762baef3b20eb83396c7ed023acb71d575
Reviewed-Content-Hash: design/gdd/round-flow.md 1c00d6dc51d45a2a038f6135643b48085810d25d
Reviewed-Content-Hash: design/gdd/battle-pressure.md 16bc3fdee83f31890213b1adc186f4cd1487c092
Reviewed-Content-Hash: design/gdd/general-skills.md 7cbf9f95cfea2587981090bcde3cab5a8c9d8820
Reviewed-Content-Hash: design/gdd/clear-effects.md ad486b371ddb45e0bc75d2088776dbf9e7932570
Reviewed-Content-Hash: design/gdd/chapter-design.md d1d938cc980e6d146e2d17e4c673781696a4dac9
Reviewed-Content-Hash: design/gdd/ui-interaction.md 97d7a44b0bd1055de742aaa8e9fcab7bd22f2db0
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/art/art-bible.md 8ed5835f726d685d71fe17723b76d999bae2f723

### Revision — 2026-10-27（复审之后）
2 项阻塞已改：补 clearSelection()；ensurePlayable() 当场改好数据并返回 reshuffle（或 null），reshuffle 令牌改由对局流程代为申请。建议项：pushRowFromTop 的行内偶数前提和统一的 {ok:false}、rng(name) 接口、“同种子同一串操作”、赵云连线一律朱虚线、开局复位 forceNext、补 6 条验收。
修订后待第三轮复审（全新子代理）。

## Review — 2026-10-27（第三轮）— Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 1 | Recommended: 6
Summary: 第二轮 2 项阻塞已解决。新发现 1 项：path_choice 的例子和验收写“一拐点长 5 和长 7 两条”，这种盘面搭不出来（两条一拐点路径一定等长），所以“拐弯相同取短的”没有可测的验收。
Prior verdict resolved: Yes（第二轮 2 项已解决）
Findings:
- [BLOCKING] Formulas path_choice / AC: 例子和验收的前提无法构造，改成两拐点的例子，一拐点改测平局规则
- [RECOMMENDED] 洗牌演出 48 块同时动超过同时动元素上限，改成整盘容器
- [RECOMMENDED] RESHUFFLE_SHOW_MS 调整时三段如何缩放；少动版本
- [RECOMMENDED] 保底找不到时的分支返回什么
- [RECOMMENDED] 两拐点时的比较顺序；1000 局自动对局的参数；Dependencies 补 clearSelection；Status 行
Reviewed-Content-Hash: design/gdd/board-link.md bc9e358e7cdc30be9a4f3adbb6670c39f8990652
Reviewed-Content-Hash: design/registry/entities.yaml a03bb12a4dc725bbd35a7e8375f0d2352c5ddc0a
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/board-link-review-log.md 5a63ffe81239573aa4f839c1c5d0fd4878da76c1
Reviewed-Content-Hash: design/gdd/round-flow.md d527773f2977d6ee2283a68ead458d6ee2b7c92e
Reviewed-Content-Hash: design/gdd/general-skills.md 1ed7d529af0bf601d29022bcb8aa958ca2379216
Reviewed-Content-Hash: design/gdd/battle-pressure.md 7fece5395d2d87ef3cb3a9fc62e271e470bd7504
Reviewed-Content-Hash: design/gdd/clear-effects.md ad486b371ddb45e0bc75d2088776dbf9e7932570
Reviewed-Content-Hash: design/gdd/ui-interaction.md b6917b89c3a42583637fe39a3d345c1c13b27f4e
Reviewed-Content-Hash: design/gdd/chapter-design.md c0e9d55d527107d691b99ad447880d5be89a6ee4
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/gdd/systems-index.md 17594ea6c4f07847650183c5b7063b6a2dc87f50
Reviewed-Content-Hash: design/art/art-bible.md d65acad5f16e94183d8f461556fb6d9768b7d68c

### Revision — 2026-10-27（第三轮之后）
1 项阻塞已改：path_choice 的例子和验收换成能搭出来的盘面（同一行被挡、经第 1 行长 5 对经外圈长 7；一拐点平局取行小的拐点），两拐点的比较顺序写清。建议项：洗牌演出改成整盘一个容器、三段按比例缩放、少动版本；保底失败的分支改为返回 clear {source:'reshuffle'} 由对局流程分发；1000 局自动对局的参数写死；Dependencies 补 clearSelection。待第四轮复审。

## Review — 2026-10-27（第四轮）— Verdict: APPROVED
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 0 | Recommended: 3
Summary: 第三轮的阻塞已解决：两个新例子逐格走过、并枚举全部候选路径核对过，验收可测，结果不受其余格子影响。与登记表、美术圣经和其他 GDD 无冲突。
Prior verdict resolved: Yes
Findings:
- [RECOMMENDED] Core Rules 1: 写明坐标一律是 (行, 列)
- [RECOMMENDED] Acceptance Criteria: 1000 局自动对局加每局步数上限
- [RECOMMENDED] Dependencies: clearSelection 移到下游武将技能一项
Reviewed-Content-Hash: design/gdd/board-link.md 1e66f89797bcb2f1b1e29d8d67f1f62bf3def010
Reviewed-Content-Hash: design/registry/entities.yaml b05d55e0024ef82f7a65f6f3abcc0513d7a404b5
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/board-link-review-log.md 68c0867d7315e54d6841b682f886f542f2867919
Reviewed-Content-Hash: design/gdd/round-flow.md af0b57fda16f4dc500fde82ef6770b8ae4d6d06e
Reviewed-Content-Hash: design/gdd/ui-interaction.md 9939fd4650d9cda12be257437806dd8684118cc4
Reviewed-Content-Hash: design/gdd/battle-pressure.md ae1eac1e1c1032c7b0f8eb894f1c5e9f418784a5
Reviewed-Content-Hash: design/gdd/clear-effects.md 39efea1e9015423e7f884aa634ed3cc62c1c0d44
Reviewed-Content-Hash: design/gdd/general-skills.md 7d605759e12c9863d37e129f2086d371d9b1879e
Reviewed-Content-Hash: design/gdd/chapter-design.md cdf81b77e54acd7d0098c209920994e3fd2ce864
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/art/art-bible.md d65acad5f16e94183d8f461556fb6d9768b7d68c
