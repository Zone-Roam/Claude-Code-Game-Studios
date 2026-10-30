# Review Log: progress-save.md

## Review — 2026-10-27 — Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: M
Specialists: none (lean mode)
Blocking items: 8 | Recommended: 9
Summary: 核心星级规则自洽，与登记表无数值冲突。阻塞项集中在：结果对象和结算返回值没人定、阈值覆盖格式没定义、存储探测会删真实存档、损坏判定没规格、只读状态初值、dangerMs 语义、hearts 写死、验收标准。审查者是全新子代理。
Prior verdict resolved: First review
Findings:
- [BLOCKING] Core Rules 8–9: 结果对象归属循环，结算返回值没有字段约定
- [BLOCKING] Core Rules 3: 阈值覆盖格式两边都没定义，校验归属冲突
- [BLOCKING] Core Rules 12: 探测没说用哪个键，可能删掉真实存档；探测失败时是否仍读取
- [BLOCKING] Core Rules 13: “结构不对”没有校验规格；单条修复还是整份判损坏；迁移异常
- [BLOCKING] Core Rules 11: 只读状态下内存进度的初值没定
- [BLOCKING] Formulas press: 最后一波后 dangerMs 仍累计；取整规则没定
- [BLOCKING] Formulas boss: 阈值按 3 颗心写死，hearts 可调 1–5
- [BLOCKING] Acceptance Criteria: 复合断言、无可观察量，缺多项关键验收
- [RECOMMENDED] Edge Cases: 双页面整条覆盖会丢进度，结算时先读后合并
- [RECOMMENDED] Core Rules 6: 插入新回目会把已赢后面回目的人重新锁住
- [RECOMMENDED] Formulas food: foodT3 等于 slack，3 星即“零浪费或用过张飞”
- [RECOMMENDED] Formulas press: 绝对阈值应按 interval 换算
- [RECOMMENDED] Formulas boss: 第一回 3 星对中老年近乎不可达
- [RECOMMENDED] Game Feel: 未满星原因一句没有规则
- [RECOMMENDED] Core Rules 4/5: 用时、连斩只作记录，记在哪
- [RECOMMENDED] Core Rules 8: seenEffects 没有写入方，用显示名而非 id
- [RECOMMENDED] Core Rules 11–13: “提示一次”的范围、位置、文案
Reviewed-Content-Hash: design/gdd/progress-save.md 30c98c04000b0a7ae3bafee19e8dcbe47383a6e8
Reviewed-Content-Hash: design/registry/entities.yaml 2c2277bdfb2dc58fbd9ac11e0087caf346bd5448
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/board-link.md 3830e14e000678a013326e7bc81c75df17553c49
Reviewed-Content-Hash: design/gdd/round-flow.md d9f34f9132da0821bb06b9d65f8083dd710690d2
Reviewed-Content-Hash: design/gdd/clear-effects.md 018cc74f4dd54b5e318d57408ec7b47f70db3283
Reviewed-Content-Hash: design/gdd/battle-pressure.md 4114d70f427bd380c71c304769be27957289d647
Reviewed-Content-Hash: design/gdd/general-skills.md 90bbf230e9593180639be1ca3240ba2078609aa4
Reviewed-Content-Hash: design/gdd/chapter-design.md 8258eda5cbd7ab87ec595e50b986df72c511a7ab
Reviewed-Content-Hash: design/gdd/ui-interaction.md d8c9cfafbf5642eebe153d6de58229f2131946dc
Reviewed-Content-Hash: design/gdd/systems-index.md e1c4b38c955cda945e5c6c02f13fe143012d8310
Reviewed-Content-Hash: design/gdd/game-concept.md e5061a7788be23a497ed71e91a1265fe07ff7b65
Reviewed-Content-Hash: design/art/art-bible.md 8ed5835f726d685d71fe17723b76d999bae2f723

### Revision — 2026-10-27（同一会话，审查之后）
8 项阻塞全部改掉：结果对象由对局流程定义，本系统定义 settle() 的返回 SettleOutcome；阈值覆盖形状和检查归属写清；探测改用独立键 pslk.probe，先读后探；校验规格（整条损坏 vs 单条丢弃、迁移异常、.bad 写失败）；只读状态尽力读出新版本里可用的记录；dangerMs 整回累计（空行下压阶段照样有风险）并向下取整；敌将阈值只看丢心数，与总心数无关；验收标准补齐。建议项：先读后合并再写、解锁看前一回或后面任一回、原因一句的规则、去掉 seenEffects、提示的优先级和位置。概念文档支柱 5 已同步改写。
修订后待复审（全新子代理）。

## Review — 2026-10-27（复审）— Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: M
Specialists: none (lean mode)
Blocking items: 1 | Recommended: 11
Summary: 首轮 8 项阻塞已解决或基本解决，与其他 GDD 和登记表无矛盾。剩 1 项：规则 13 的“写前重读”没有失败分支，存档损坏后第一次结算必然走到。
Prior verdict resolved: Mostly（8 项中 7 项已解决，1 项基本解决）
Findings:
- [BLOCKING] Core Rules 13: 写前重读失败、损坏、单条不合法、版本更高或更低时怎么办；补两条验收
- [RECOMMENDED] 提示每种各一次还是总共一次；只能读时的提示文案
- [RECOMMENDED] 先查 v 再做整条校验；压线秒数向上取整；isNewBest 以合并后为准
- [RECOMMENDED] 单条校验加 stars>0 ⇒ wins≥1；round-flow 写出 settle() 的名字；origin 是否会变
Reviewed-Content-Hash: design/gdd/progress-save.md 49d775bbecf90db07912d584be49a9112b2c630d
Reviewed-Content-Hash: design/registry/entities.yaml 897bb597650e5d12e9f2f96d4db1af2c20e800c0
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/progress-save-review-log.md 1c79b7d2ba81d7bacec5315d7cb3b443074bbb22
Reviewed-Content-Hash: design/gdd/round-flow.md 1c00d6dc51d45a2a038f6135643b48085810d25d
Reviewed-Content-Hash: design/gdd/battle-pressure.md 16bc3fdee83f31890213b1adc186f4cd1487c092
Reviewed-Content-Hash: design/gdd/chapter-design.md d1d938cc980e6d146e2d17e4c673781696a4dac9
Reviewed-Content-Hash: design/gdd/ui-interaction.md 97d7a44b0bd1055de742aaa8e9fcab7bd22f2db0
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/gdd/systems-index.md 40986b005a93ead061166f5aec4f0b185b0befa8
Reviewed-Content-Hash: design/gdd/clear-effects.md ad486b371ddb45e0bc75d2088776dbf9e7932570
Reviewed-Content-Hash: design/gdd/general-skills.md 7cbf9f95cfea2587981090bcde3cab5a8c9d8820

### Revision — 2026-10-27（复审之后）
1 项阻塞已改：规则 13 加重读结果的处理表（抛异常、无存档、版本更高、版本更低、整条损坏、单条不合法），补两条验收。建议项：先看版本再校验、单条校验加 stars>0 ⇒ wins≥1、压线秒数向上取整、isNewBest 按合并后算、每种提示各一次及四种文案、foodT3/missT2 的范围性质、origin 的开放问题。
修订后待第三轮复审（全新子代理）。

## Review — 2026-10-27（第三轮）— Verdict: APPROVED
Review mode: lean · Workflow: standard
Scope signal: M
Specialists: none (lean mode)
Blocking items: 0 | Recommended: 7
Summary: 第二轮的阻塞已解决：写前重读的六种结果都有处理，补了三条验收。与其他 GDD 和登记表无冲突。
Prior verdict resolved: Yes
Findings:
- [RECOMMENDED] 运行中第一次写入失败时用哪句提示
- [RECOMMENDED] 合并后的记录同时成为内存进度
- [RECOMMENDED] 结算卡要显示的用时、连斩、技能写明从 RoundResult 读
- [RECOMMENDED] 第 247 行验收的前提和结论定成一种
- [RECOMMENDED] foodT3/missT2 超范围警告由谁发；提示优先级的验收；systems-index 的进度码说法
Reviewed-Content-Hash: design/gdd/progress-save.md 77d944f116250cfefb48198a2edec4c1940d8689
Reviewed-Content-Hash: design/registry/entities.yaml a03bb12a4dc725bbd35a7e8375f0d2352c5ddc0a
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/progress-save-review-log.md dba843403b4ce4446d4019d772da074dc3b39d4a
Reviewed-Content-Hash: design/gdd/round-flow.md d527773f2977d6ee2283a68ead458d6ee2b7c92e
Reviewed-Content-Hash: design/gdd/battle-pressure.md 7fece5395d2d87ef3cb3a9fc62e271e470bd7504
Reviewed-Content-Hash: design/gdd/chapter-design.md c0e9d55d527107d691b99ad447880d5be89a6ee4
Reviewed-Content-Hash: design/gdd/ui-interaction.md b6917b89c3a42583637fe39a3d345c1c13b27f4e
Reviewed-Content-Hash: design/gdd/clear-effects.md ad486b371ddb45e0bc75d2088776dbf9e7932570
Reviewed-Content-Hash: design/gdd/general-skills.md 1ed7d529af0bf601d29022bcb8aa958ca2379216
Reviewed-Content-Hash: design/gdd/systems-index.md 17594ea6c4f07847650183c5b7063b6a2dc87f50
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/art/art-bible.md d65acad5f16e94183d8f461556fb6d9768b7d68c

### Amendment（批准后小修） — 2026-10-27（第三轮之后）
采纳第三轮建议：合并后的记录同时成为内存进度；运行中第一次写入失败时提示“只能读、不能写”那一句。

### Revision — 2026-10-27（跨文档总审之后）
按用户决定（D1）：规则 8 改为 MVP 三回一开始全部解锁、竖切片起恢复按故事顺序解锁，验收同步；写档失败时结算卡加“这一回没存上”，盖章途中关掉不丢的说法补上“写入成功时”；规则 4 如实写明丢心数、压线时长随手速变化。
待复核（全新子代理）。

## Review — 2026-10-27（总审后复核）— Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: M
Specialists: none (lean mode)
Blocking items: 2 | Recommended: 3
Summary: 四处修订都已写进。两处阻塞：SettleOutcome 没有“存没存上”的字段，“这一回没存上”的显示条件没定；两条验收与 MVP 三回全开矛盾或测不到。
Prior verdict resolved: Partly
Findings:
- [BLOCKING] Rule 5: SettleOutcome 缺 saved 字段和显示条件
- [BLOCKING] AC 259、265 与 MVP 规则 8 不符
- [RECOMMENDED] 开头两处“赢了解锁下一回”；竖切片解锁逻辑何时做；存储提示的确切文案
Reviewed-Content-Hash: design/gdd/progress-save.md c390ad7db13ac935f910f053087d8f73f57b1061
Reviewed-Content-Hash: design/registry/entities.yaml c7422895e5166776e5a15e017c5ab13a65216f3d
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/progress-save-review-log.md 4e6e366c1c640f807634a80a54cba5cc774bb6f0
Reviewed-Content-Hash: design/gdd/gdd-cross-review-2026-10-27.md e29728c5e178fdfe96e512f573a1dea6128be54f
Reviewed-Content-Hash: design/gdd/chapter-design.md a57362fc306dae125f93bc3360e9ff69cc57bf1f
Reviewed-Content-Hash: design/gdd/ui-interaction.md ec03fe4e5186169367973669f456328dadf95bfd
Reviewed-Content-Hash: design/gdd/round-flow.md ae0b1fc55a036510e040d582fbe2b9ff841afdcc
Reviewed-Content-Hash: design/gdd/battle-pressure.md e0b3a1fd70e3e6334f0a91a16d16d76061b21916
Reviewed-Content-Hash: design/gdd/game-concept.md b9259643dd0003e64dc9b0fd6d35ed1e66261e03
Reviewed-Content-Hash: design/gdd/systems-index.md 48a678a841e1908f33a28baea23fc296f47c6378

### Revision — 2026-10-27（总审后复核之后）
SettleOutcome 加 saved 字段（本次写入成功才为真；写入抛异常或已处于只读、仅内存为假），结算卡（胜、败都算）据此显示“这一回没存上”；两条与 MVP 三回全开不符的验收改为断言星级记录；开头的“赢了解锁下一回”改为 MVP 全开。
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
Reviewed-Content-Hash: design/gdd/progress-save.md cdb5848226207b07293825f79d2c2606c3abcf8c
Reviewed-Content-Hash: design/registry/entities.yaml 3c7efe8a0d0f494d272f743b397e175e29469a35
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/progress-save-review-log.md c254a44c3d814ea1aad24f582e448ec1c29aa733
Reviewed-Content-Hash: design/gdd/ui-interaction.md bfa00041c182cb9fa1daac4c34119398a291744a
Reviewed-Content-Hash: design/gdd/round-flow.md ae0b1fc55a036510e040d582fbe2b9ff841afdcc
Reviewed-Content-Hash: design/gdd/chapter-design.md a57362fc306dae125f93bc3360e9ff69cc57bf1f
Reviewed-Content-Hash: design/gdd/systems-index.md 48a678a841e1908f33a28baea23fc296f47c6378
Reviewed-Content-Hash: design/gdd/game-concept.md b9259643dd0003e64dc9b0fd6d35ed1e66261e03

## Review — 2026-10-30 — Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: M（producer 需核实）
Specialists: none (lean)
Blocking items: 3 | Recommended: 9
Summary: 机制本身稳，与登记表、ADR-0004、其他 GDD 无数值冲突。3 条阻塞都是 2026-10-30 新增内容的缺口（重复结算无从判定、空阵容写出非法 loadout、两条验收测不出），均已机械修好，待复审。
Prior verdict resolved: Yes
Findings:
- [BLOCKING] Edge Cases 重复结算: 用 `chapterId + attempt` 记最近一次已结算的键，同键返回上次结果、不写档；补验收（round-flow 已有 `attempt` 字段，无需改）— 已修
- [BLOCKING] 规则 12/13: `RoundResult.loadout` 为空数组时不写、保留原值，存下的 loadout 永远是 1–3 位（用户决定 D4）；补验收 — 已修
- [BLOCKING] Acceptance Criteria: ch01 `stars: 7` 一条改为“没有 `ch01` 键、`ch02` `wins = 1`”；存储失败一条给出确切提示文案和 `setItem` 调用次数断言 — 已修
- [RECOMMENDED] R1 foodT3 说明: 改为第七回 slack 2、第四回 slack 3 — 已修
- [RECOMMENDED] R9① 头部 Status / Last Verified — 已修
- [RECOMMENDED] R8 登记表 `stars`: variables 本就含 missT2，补 note 写明三种单位 — 已修（在 entities.yaml）
- [RECOMMENDED] R2 补验收（重读异常 / 整条损坏、isNewBest、提示去重与优先级、saved = true）— 未改（留待复审后补）
- [RECOMMENDED] R3 规则 18 四句文案与优先级对应 — 未改
- [RECOMMENDED] R4 并发少记 plays / wins 写进 Edge Cases — 未改
- [RECOMMENDED] R5 转交字段补 `bossPhase` 不评星 — 未改
- [RECOMMENDED] R6 / R7 ADR-0004 补 `progress.wins()`、`progress.loadoutOf(id)` 和竖切片解锁 — 未改（属 ADR，用 /propagate-design-change）
- [RECOMMENDED] R9②③④ heartsLost 范围写法、foodLeft 为 0 的文案、t3 ≤ t2 提示 — 未改
Reviewed-Content-Hash: design/gdd/progress-save.md 15e7cac9d6d4d400f4827e42097bd178f02851d8
Reviewed-Content-Hash: design/registry/entities.yaml 9b88f1c949f5e636c3d0ba131a4bc5616d38c526
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
（以上哈希取修订前的 git 版本 f3a96f9，即本次审查读到的版本；由主会话补填）
