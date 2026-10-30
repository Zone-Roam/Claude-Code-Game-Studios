# Review Log: general-skills.md

## Review — 2026-10-27 — Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 4 | Recommended: 9
Summary: 结构和公式基本合格，guan_cut 的恒偶推导和各 AC 数值核对一致。阻塞项：赵云不过本作自己的支柱 2 设计测试（蓄满就放永远不亏）；forceMatchNext 接口未定义；第二回数据里三位武将的蓄力兵只有 1 对，和本文前提冲突；赵云状态机自相矛盾。审查者是全新子代理。
Prior verdict resolved: First review
Findings:
- [BLOCKING] Detailed Rules 11: 赵云待命无时限、无代价，蓄满就放永远不亏，不过支柱 2 的设计测试
- [BLOCKING] Detailed Rules 11: forceMatchNext 在 board-link 里没定义；强制消除是否发“连不上”、折线从哪来
- [BLOCKING] Tuning Knobs: “每种 4 块恰好蓄满一次”与第二回 deck（刀、盾、书各 2 块）冲突
- [BLOCKING] States: 待命中蓄满后用掉是回“蓄力中”还是“就绪”，两处矛盾；点满格的待命牌没有反馈
- [RECOMMENDED] Game Feel: “满了不累积让留着有代价”在 MVP 数据里不成立
- [RECOMMENDED] Detailed Rules 12/13: 张飞在压境和粮草里只剩“快输再放”一个解；诸葛亮在粮草里蓄满就放最划算
- [RECOMMENDED] Detailed Rules 8: 朱勾时序有两种读法
- [RECOMMENDED] Detailed Rules 6: 锁定令牌清单少了 pause
- [RECOMMENDED] Interactions: battle-pressure 没列两个查询接口
- [RECOMMENDED] Dependencies: skillsUsed 无人负责
- [RECOMMENDED] Acceptance Criteria: 若干条不可测，缺待命、pause、推波等验收
- [RECOMMENDED] Detailed Rules 7: “待命中”与“待命”不统一；无效果提示停留时长
- [RECOMMENDED] Detailed Rules 8: SKILL_SHOW_MS 安全范围与美术圣经时间轴不兼容
Reviewed-Content-Hash: design/gdd/general-skills.md 90bbf230e9593180639be1ca3240ba2078609aa4
Reviewed-Content-Hash: design/registry/entities.yaml 2c2277bdfb2dc58fbd9ac11e0087caf346bd5448
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/board-link.md 3830e14e000678a013326e7bc81c75df17553c49
Reviewed-Content-Hash: design/gdd/round-flow.md d9f34f9132da0821bb06b9d65f8083dd710690d2
Reviewed-Content-Hash: design/gdd/clear-effects.md 018cc74f4dd54b5e318d57408ec7b47f70db3283
Reviewed-Content-Hash: design/gdd/battle-pressure.md 4114d70f427bd380c71c304769be27957289d647
Reviewed-Content-Hash: design/gdd/chapter-design.md 8258eda5cbd7ab87ec595e50b986df72c511a7ab
Reviewed-Content-Hash: design/gdd/progress-save.md 30c98c04000b0a7ae3bafee19e8dcbe47383a6e8
Reviewed-Content-Hash: design/gdd/ui-interaction.md d8c9cfafbf5642eebe153d6de58229f2131946dc
Reviewed-Content-Hash: design/gdd/systems-index.md e1c4b38c955cda945e5c6c02f13fe143012d8310
Reviewed-Content-Hash: design/gdd/game-concept.md e5061a7788be23a497ed71e91a1265fe07ff7b65
Reviewed-Content-Hash: design/art/art-bible.md 8ed5835f726d685d71fe17723b76d999bae2f723
Reviewed-Content-Hash: prototypes/wujiang-concept/REPORT.md d66cab2942560a6931ee9b810329ff68aee556c4

### Revision — 2026-10-27（同一会话，审查之后）
4 项阻塞全部改掉：赵云按用户决定改为“放出后下一对同种兵不管连不连得上都直接消掉、用掉待命”，随手放会浪费，过支柱 2 设计测试；forceNext 的语义写进盘面规则 12（forced、不发 miss、直线）；第二回 deck 已改为每位武将 4 块；待命用掉后按蓄力回到就绪或蓄力中，点待命牌翻出“已在待命”。建议项：锁定条件改为“任何令牌”、补 charge() 查询、skillsUsed、说明文字规则、SKILL_SHOW_MS 下限 950、验收标准修正。
修订后待复审（全新子代理）。

## Review — 2026-10-27（复审）— Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 1 | Recommended: 8
Summary: 首轮 4 项阻塞已解决或基本解决，赵云新规则按字面过了支柱 2 的设计测试。剩 1 项：待命期间蓄力只能是 0，“待命中又蓄满”这个状态到不了；待命时点赵云应一律翻“已在待命”。
Prior verdict resolved: Mostly（4 项中 3 项已解决，1 项部分解决）
Findings:
- [BLOCKING] Rules 7 / States / Edge Cases / AC: 待命中点赵云的说明优先级；删掉不可能出现的“待命中蓄满”
- [RECOMMENDED] Open Questions: 赵云可能退化成“满了就放、马上挑一对”，试玩记两个指标
- [RECOMMENDED] 美术圣经第 7 节赵云待命的文字和试玩标准要同步
- [RECOMMENDED] 释放时清选中需要 board-link 的接口；开局谁复位 forceNext；用掉时的连线说法统一
- [RECOMMENDED] Game Feel: 第一回增兵会带来更多蓄力兵；补验收；skillsUsed 没人显示
Reviewed-Content-Hash: design/gdd/general-skills.md 7cbf9f95cfea2587981090bcde3cab5a8c9d8820
Reviewed-Content-Hash: design/registry/entities.yaml 897bb597650e5d12e9f2f96d4db1af2c20e800c0
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/general-skills-review-log.md 9b9bc167989724d8f3c971fec3943f9e5f4df709
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/gdd/board-link.md 4c6492fbe631408f096f291edb2bda1bc935e1fa
Reviewed-Content-Hash: design/gdd/round-flow.md 1c00d6dc51d45a2a038f6135643b48085810d25d
Reviewed-Content-Hash: design/gdd/battle-pressure.md 16bc3fdee83f31890213b1adc186f4cd1487c092
Reviewed-Content-Hash: design/gdd/clear-effects.md ad486b371ddb45e0bc75d2088776dbf9e7932570
Reviewed-Content-Hash: design/gdd/chapter-design.md d1d938cc980e6d146e2d17e4c673781696a4dac9
Reviewed-Content-Hash: design/gdd/ui-interaction.md 97d7a44b0bd1055de742aaa8e9fcab7bd22f2db0
Reviewed-Content-Hash: design/gdd/progress-save.md 49d775bbecf90db07912d584be49a9112b2c630d
Reviewed-Content-Hash: design/gdd/systems-index.md 40986b005a93ead061166f5aec4f0b185b0befa8
Reviewed-Content-Hash: design/art/art-bible.md 8ed5835f726d685d71fe17723b76d999bae2f723

### Revision — 2026-10-27（复审之后）
1 项阻塞已改：待命中点赵云一律翻“已在待命”（说明按顺序取第一条）；写明待命期间蓄力保持 0、用掉待命的若是一对盾 +1；删掉不可能出现的“待命中蓄满”边界和验收，换成 need=1 的情况。建议项：释放时调用 clearSelection()、开局复位 forceNext、第一回增兵说明、赵云退化风险进开放问题；美术圣经第 7 节的赵云文字和试玩标准已同步。
修订后待第三轮复审（全新子代理）。

## Review — 2026-10-27（第三轮）— Verdict: APPROVED
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 0 | Recommended: 9
Summary: 第二轮的阻塞已解决：待命中点赵云一律翻“已在待命”，待命期间蓄力保持 0，状态表、边界和验收同步。与登记表和用户决定一致。
Prior verdict resolved: Yes
Findings:
- [RECOMMENDED] 盘空时点关羽或诸葛亮算无效果
- [RECOMMENDED] 赵云连线说法统一；Interactions 补 clearSelection；charge() 的出处是战场压力规则 26
- [RECOMMENDED] setForceNext 开启时刻两处说法；need 分设的开放问题可收；补释放清选中的验收；Status 行
Reviewed-Content-Hash: design/gdd/general-skills.md 1ed7d529af0bf601d29022bcb8aa958ca2379216
Reviewed-Content-Hash: design/registry/entities.yaml a03bb12a4dc725bbd35a7e8375f0d2352c5ddc0a
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/general-skills-review-log.md 9709afe6e5aad44cff79c0b1a65b579bf2b08b83
Reviewed-Content-Hash: design/gdd/board-link.md bc9e358e7cdc30be9a4f3adbb6670c39f8990652
Reviewed-Content-Hash: design/gdd/round-flow.md d527773f2977d6ee2283a68ead458d6ee2b7c92e
Reviewed-Content-Hash: design/gdd/battle-pressure.md 7fece5395d2d87ef3cb3a9fc62e271e470bd7504
Reviewed-Content-Hash: design/gdd/clear-effects.md ad486b371ddb45e0bc75d2088776dbf9e7932570
Reviewed-Content-Hash: design/gdd/chapter-design.md c0e9d55d527107d691b99ad447880d5be89a6ee4
Reviewed-Content-Hash: design/gdd/ui-interaction.md b6917b89c3a42583637fe39a3d345c1c13b27f4e
Reviewed-Content-Hash: design/gdd/progress-save.md 77d944f116250cfefb48198a2edec4c1940d8689
Reviewed-Content-Hash: design/gdd/systems-index.md 17594ea6c4f07847650183c5b7063b6a2dc87f50
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/art/art-bible.md d65acad5f16e94183d8f461556fb6d9768b7d68c

### Amendment（批准后小修） — 2026-10-27（第三轮之后）
采纳第三轮建议：Interactions 补 clearSelection、isEmpty；charge() 的出处补规则 26；写明关羽和诸葛亮在盘面为空的瞬间无效果。

### Revision — 2026-10-27（跨文档总审之后）
张飞在压境改为“吓退追兵”：只有最下一排有兵、且还没吓退过时才有效果，否则“此时一吼无用”；删掉 ROAR_PRESS_DELAY_MS（登记表标为 deprecated）；验收、Game Feel、开放问题同步。
待复核（全新子代理）。

## Review — 2026-10-27（总审后复核）— Verdict: APPROVED
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean mode)
Blocking items: 0 | Recommended: 5
Summary: 张飞压境新效果（吓退追兵）已同步到规则、交互、验收、开放问题，过了支柱 2 的设计测试：最下一排没兵时放不出，有兵时要在“现在用”和“自己清掉最下一排、留着当保险”之间判断。
Prior verdict resolved: Yes
Findings:
- [RECOMMENDED] 验收 234 写明 interval 与 nextPush
- [RECOMMENDED] 补“吓退已挂起时再点张飞”的边界和验收
- [RECOMMENDED] 盘空立刻下压是否吃吓退标记，在战场压力里定
- [RECOMMENDED] 状态表补压境的无效果情况；试玩指标
Reviewed-Content-Hash: design/gdd/general-skills.md 686fe4c6b992627cfb1f89bad3eb489ed522b447
Reviewed-Content-Hash: design/registry/entities.yaml c7422895e5166776e5a15e017c5ab13a65216f3d
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/general-skills-review-log.md e8c8a6f4e0f682714a3e549b1a1d1eddc979ebb8
Reviewed-Content-Hash: design/gdd/battle-pressure.md e0b3a1fd70e3e6334f0a91a16d16d76061b21916
Reviewed-Content-Hash: design/gdd/game-concept.md b9259643dd0003e64dc9b0fd6d35ed1e66261e03
Reviewed-Content-Hash: design/gdd/gdd-cross-review-2026-10-27.md e29728c5e178fdfe96e512f573a1dea6128be54f
Reviewed-Content-Hash: design/gdd/ui-interaction.md ec03fe4e5186169367973669f456328dadf95bfd
Reviewed-Content-Hash: design/gdd/chapter-design.md a57362fc306dae125f93bc3360e9ff69cc57bf1f
Reviewed-Content-Hash: design/gdd/round-flow.md ae0b1fc55a036510e040d582fbe2b9ff841afdcc
Reviewed-Content-Hash: design/gdd/clear-effects.md 17767f552b65433fcdfb18f9fdbc00f0ac50a13e
Reviewed-Content-Hash: design/gdd/board-link.md ddfd01864cea1b2a0bf9e7a0fffb4a2c60770eb1
Reviewed-Content-Hash: design/gdd/systems-index.md 48a678a841e1908f33a28baea23fc296f47c6378

## Review — 2026-10-30 — Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L
Specialists: none (lean)
Blocking items: 2 | Recommended: 11
Summary: 2026-10-30 的大改（关羽选排、刘备、黄忠、选将、赵云护盾、诸葛亮破特技）此前没有审查记录，本次是第一次审查。两个阻塞都是机械对齐：验收里写死的 7000 ms，以及黄忠依赖的列查询接口在盘面文档里不存在。
Prior verdict resolved: Yes
Findings:
- [BLOCKING] AC 张飞·压境: 硬写 7000 ms，与 12000 ms 冲突 — 已修（改为一个完整 `interval`，从回目数据读）
- [BLOCKING] Interactions 盘面行: `rowCells`/`colCells`/`buriedOf` 与盘面接口名不符 — 已修（统一为 `rowContents`/`colContents`/`buriedCells`/`depthAt`；盘面侧同步补 `colContents`）
- [RECOMMENDED] 1 Open Questions 压境无拒马的旧说法 — 已修
- [RECOMMENDED] 2 chapter-design 陈旧注释 — 未改（不在本文，属 chapter-design）
- [RECOMMENDED] 3 `need` 合法范围两边不一致 — 未改（留待复审）
- [RECOMMENDED] 4 诸葛亮横幅长度 — 未改（留待复审）
- [RECOMMENDED] 5 补验收 — 未改（留待复审）
- [RECOMMENDED] 6 AC 487 “照常”不可判定 — 未改（留待复审）
- [RECOMMENDED] 7 登记表 need 类型 — 未改（登记表不在本文）
- [RECOMMENDED] 8 事件名 `gift`/`skillResult` 未定 — 未改（留待 ADR-0003 同步）
- [RECOMMENDED] 9 Last Verified 与「四位武将」旧说法 — 已修（本文头部；systems-index、game-concept 在别的文件）
- [RECOMMENDED] 10 旗的对数 “3 对” 改 “至少 3 对” — 已修
- [RECOMMENDED] 11 只有拒马的行列陷阱 — 未改（需设计取向）
- 另（用户决定 D5）: 赵云挡下横幅统一为「赵云挡下！」 — 已修（Visual/Audio 赵云护盾条）
Reviewed-Content-Hash: design/gdd/general-skills.md 30e31e9afa9e7a96e81b16e9b2cbe2fbe4b8614a
Reviewed-Content-Hash: design/registry/entities.yaml 9b88f1c949f5e636c3d0ba131a4bc5616d38c526
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
（以上哈希取修订前的 git 版本 f3a96f9，即本次审查读到的版本；由主会话补填）
