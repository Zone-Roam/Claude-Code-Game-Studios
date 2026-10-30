# Review Log: chapter-design.md

## Review — 2026-10-27 — Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: M
Specialists: none (lean mode)
Blocking items: 7 | Recommended: 8
Summary: 必需章节齐全，登记表数值无冲突。阻塞项：数据格式多处歧义（waves 重名、键用汉字还是 id、stars 形状、敌将 id、增兵池、水牌规则句和失败提示没有字段）；压境用时公式与例子对不上；E 无法计算导致加载警告无法实现；第一回的三个数互相矛盾；安全范围与其他文档冲突；验收标准站不住；跳章后预告断链。审查者是全新子代理。
Prior verdict resolved: First review
Findings:
- [BLOCKING] Detailed Rules: 数据格式歧义（waves 两义、键名、stars、enemy、need、增兵池、规则句、预告前缀）
- [BLOCKING] Formulas: 压境用时公式与例子不符，在声明的 r 范围内不成立
- [BLOCKING] Formulas: E 没有算法，“用时超出 60–180 秒”的加载警告无法实现
- [BLOCKING] Formulas: 第一回估算 22 秒、断言 40–60 秒、30 秒存活窗口三者矛盾
- [BLOCKING] Tuning Knobs: rows 5–9 与 6–8 冲突；slow ×2 超出合法范围；第二回违反“蓄力兵 4–8 块”；压境未校验 rows == 8
- [BLOCKING] Acceptance Criteria: seed AC 与“再来一回换种子”冲突；“没有报错”是否含警告；中位用时 AC 不可独立验证；多条边界无验收
- [BLOCKING] Dependencies: stars 阈值校验归属与 progress-save 冲突；跳过非法回目后预告指向被跳过的回目
- [RECOMMENDED] MVP 数据: 第二回三位武将要靠随机补兵才能蓄满
- [RECOMMENDED] Formulas: 压境 8 波在 8 行盘上不致命，只有开局 4 行有死线
- [RECOMMENDED] MVP 数据: 第三回余量实际是“最多错 2 次”，3 星门槛很严
- [RECOMMENDED] Detailed Rules: slow、seed 在正式版是否读取
- [RECOMMENDED] Overview: 难度杠杆排序没有依据
- [RECOMMENDED] Dependencies: round-flow 应回指本文
- [RECOMMENDED] Formulas: 三种模式隐含的玩家速度不一致
- [RECOMMENDED] Registry: 登记回目事实
Reviewed-Content-Hash: design/gdd/chapter-design.md 8258eda5cbd7ab87ec595e50b986df72c511a7ab
Reviewed-Content-Hash: design/registry/entities.yaml 2c2277bdfb2dc58fbd9ac11e0087caf346bd5448
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/board-link.md 3830e14e000678a013326e7bc81c75df17553c49
Reviewed-Content-Hash: design/gdd/round-flow.md d9f34f9132da0821bb06b9d65f8083dd710690d2
Reviewed-Content-Hash: design/gdd/clear-effects.md 018cc74f4dd54b5e318d57408ec7b47f70db3283
Reviewed-Content-Hash: design/gdd/battle-pressure.md 4114d70f427bd380c71c304769be27957289d647
Reviewed-Content-Hash: design/gdd/general-skills.md 90bbf230e9593180639be1ca3240ba2078609aa4
Reviewed-Content-Hash: design/gdd/progress-save.md 30c98c04000b0a7ae3bafee19e8dcbe47383a6e8
Reviewed-Content-Hash: design/gdd/ui-interaction.md d8c9cfafbf5642eebe153d6de58229f2131946dc
Reviewed-Content-Hash: design/gdd/systems-index.md e1c4b38c955cda945e5c6c02f13fe143012d8310
Reviewed-Content-Hash: design/gdd/game-concept.md e5061a7788be23a497ed71e91a1265fe07ff7b65
Reviewed-Content-Hash: design/art/art-bible.md 8ed5835f726d685d71fe17723b76d999bae2f723
Reviewed-Content-Hash: prototypes/yali-concept/REPORT.md 479abb1d71f9e835846700959d68e20674de29b5
Reviewed-Content-Hash: prototypes/wujiang-concept/REPORT.md d66cab2942560a6931ee9b810329ff68aee556c4
Reviewed-Content-Hash: design/game-brief.md 2b42d79835e342ee953c4573e48c16b3362145bd
Reviewed-Content-Hash: production/gate-checks/2026-10-26-concept-to-systems-design.md 5010807b72c1cd60aea96bab22706a23c0db8267

### Revision — 2026-10-27（同一会话，审查之后）
7 项阻塞全部改掉：数据格式写成字段表（id 作键、pool、press.waveList、boss.enemy + enemies 表、texts 的规则句和失败提示、need 的两种写法、preview 缺省、stars 形状归进度）；用时公式改为设计时估算（不再做加载警告），压境公式按“空行继续下压”重写，例子重算；第一回按用户决定保持 10 秒、3 心的硬仗并写明；rows 6–8、压境必须 8、slow 在校验后乘、第二回 deck 改为每将 4 块并加 pool；验收标准重写（加载拒绝和警告、跳章后的预告、模拟脚本）；阈值写错时开发版报错、正式版用缺省，与进度一致。
修订后待复审（全新子代理）。

## Review — 2026-10-27（复审）— Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: M
Specialists: none (lean mode)
Blocking items: 3 | Recommended: 9
Summary: 首轮 7 项中 6 项已解决，数值全部重算无误。剩 3 项小改：压境用时公式与“清盘立刻下压”矛盾；waveList 每项每种兵要偶数；seed 的读取范围与对局流程不一致。第一回的难度是用户的决定，但例子里的分析写错了。
Prior verdict resolved: Mostly（7 项中 6 项已解决，1 项部分解决）
Findings:
- [BLOCKING] Formulas: 压境 T 的下限 waves×interval 与战场压力规则 10 矛盾，第二回例子要重算
- [BLOCKING] Rules 2/6: waveList 内容不对的定义要含每种兵偶数；pool 权重为正整数
- [BLOCKING] Rule 14: seed 的读取范围与对局流程规则 12 不一致
- [RECOMMENDED] 第一回分析：难度是“每对约 3 秒”的一道坎，开发者手速可能 3 星
- [RECOMMENDED] 模拟脚本的消除间隔；{interval 秒} 的格式；敌方名来源；need 对象缺项；pool 默认值说法；dangerMs 绝对阈值的开放问题
Reviewed-Content-Hash: design/gdd/chapter-design.md d1d938cc980e6d146e2d17e4c673781696a4dac9
Reviewed-Content-Hash: design/registry/entities.yaml 897bb597650e5d12e9f2f96d4db1af2c20e800c0
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/chapter-design-review-log.md 2e916f8a910f5159fa47a2dd140354501da16b9e
Reviewed-Content-Hash: design/gdd/battle-pressure.md 16bc3fdee83f31890213b1adc186f4cd1487c092
Reviewed-Content-Hash: design/gdd/board-link.md 4c6492fbe631408f096f291edb2bda1bc935e1fa
Reviewed-Content-Hash: design/gdd/general-skills.md 7cbf9f95cfea2587981090bcde3cab5a8c9d8820
Reviewed-Content-Hash: design/gdd/round-flow.md 1c00d6dc51d45a2a038f6135643b48085810d25d
Reviewed-Content-Hash: design/gdd/progress-save.md 49d775bbecf90db07912d584be49a9112b2c630d
Reviewed-Content-Hash: design/gdd/clear-effects.md ad486b371ddb45e0bc75d2088776dbf9e7932570
Reviewed-Content-Hash: design/gdd/ui-interaction.md 97d7a44b0bd1055de742aaa8e9fcab7bd22f2db0
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/gdd/systems-index.md 40986b005a93ead061166f5aec4f0b185b0befa8
Reviewed-Content-Hash: design/art/art-bible.md 8ed5835f726d685d71fe17723b76d999bae2f723

### Revision — 2026-10-27（复审之后）
3 项阻塞已改：压境用时改为 T ≈ (P − E) / r（受 T_max 和逐行期限约束），第二回例子重算；waveList 每项每种兵偶数、pool 权重正整数；seed、slow 改为开发版和 MVP 测试包都读、正式包不读。建议项：第一回分析改为“每对 3 秒的一道坎”并进开放问题、模拟脚本用固定间隔、秒数格式和 slow 后的显示、敌方名来源、need 对象缺项、effectLine 文本、失败提示改写。
修订后待第三轮复审（全新子代理）。

## Review — 2026-10-27（第三轮）— Verdict: APPROVED
Review mode: lean · Workflow: standard
Scope signal: M
Specialists: none (lean mode)
Blocking items: 0 | Recommended: 9
Summary: 第二轮 3 项阻塞全部解决，数值重算无误，MVP 三回加载时 0 警告成立。第一回难度是用户决定，已进开放问题。
Prior verdict resolved: Yes
Findings:
- [RECOMMENDED] 例子“7→6→5 秒”的 5 秒低于安全范围
- [RECOMMENDED] 加载器对 MVP 测试包按哪种版本处理；stars 写错时开发版是否照常加载
- [RECOMMENDED] 压境回目查目标和蓄力兵时算上 pool/waveList；foodT3/missT2 的警告；need 对象的多余键
- [RECOMMENDED] 全局常量放在哪；缺省预告可能超过 12 字；补几条验收；登记表 zhuge_liang 的引用
Reviewed-Content-Hash: design/gdd/chapter-design.md c0e9d55d527107d691b99ad447880d5be89a6ee4
Reviewed-Content-Hash: design/registry/entities.yaml a03bb12a4dc725bbd35a7e8375f0d2352c5ddc0a
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/chapter-design-review-log.md 42002bafa9689840c4d614599906e67e04bd0005
Reviewed-Content-Hash: design/gdd/battle-pressure.md 7fece5395d2d87ef3cb3a9fc62e271e470bd7504
Reviewed-Content-Hash: design/gdd/round-flow.md d527773f2977d6ee2283a68ead458d6ee2b7c92e
Reviewed-Content-Hash: design/gdd/progress-save.md 77d944f116250cfefb48198a2edec4c1940d8689
Reviewed-Content-Hash: design/gdd/board-link.md bc9e358e7cdc30be9a4f3adbb6670c39f8990652
Reviewed-Content-Hash: design/gdd/general-skills.md 1ed7d529af0bf601d29022bcb8aa958ca2379216
Reviewed-Content-Hash: design/gdd/clear-effects.md ad486b371ddb45e0bc75d2088776dbf9e7932570
Reviewed-Content-Hash: design/gdd/ui-interaction.md b6917b89c3a42583637fe39a3d345c1c13b27f4e
Reviewed-Content-Hash: design/gdd/systems-index.md 17594ea6c4f07847650183c5b7063b6a2dc87f50
Reviewed-Content-Hash: design/gdd/game-concept.md 32a4bb041739f3f57968ecd796bc7debc82c732b
Reviewed-Content-Hash: design/art/art-bible.md d65acad5f16e94183d8f461556fb6d9768b7d68c

### Amendment（批准后小修） — 2026-10-27（第三轮之后）
采纳第三轮建议：收紧的例子改为 7 → 6.5 → 6 秒（都在安全范围内）；登记表 zhuge_liang 补本文的引用。

### Revision — 2026-10-27（跨文档总审之后）
按用户决定（D1）：MVP 三回全开，数组顺序在竖切片起才是解锁顺序；boss_pace 的分析按打断上限重写（快手约 2 星，原稿“快手稳拿 3 星”不再成立）；警告清单补 foodT3/missT2 越界；模拟脚本加技能、抖动和连错率；慢速档倍率以本文为准。
待复核（全新子代理）。

## Review — 2026-10-27（总审后复核）— Verdict: APPROVED
Review mode: lean · Workflow: standard
Scope signal: M
Specialists: none (lean mode)
Blocking items: 0 | Recommended: 5
Summary: 5 项修订都改到了，boss_pace 按打断上限重算无误（连斩玩家一个出手周期 15 秒，约 2 星；慢于 3 秒一对的人要靠张飞）。
Prior verdict resolved: Yes
Findings:
- [RECOMMENDED] 模拟脚本的放技能规则和连错概率写死
- [RECOMMENDED] boss_pace 补周期公式
- [RECOMMENDED] 删重复的一句；补 foodT3 越界只警告的验收；两处交叉引用的位置
Reviewed-Content-Hash: design/gdd/chapter-design.md a57362fc306dae125f93bc3360e9ff69cc57bf1f
Reviewed-Content-Hash: design/registry/entities.yaml c7422895e5166776e5a15e017c5ab13a65216f3d
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
Reviewed-Content-Hash: design/gdd/reviews/chapter-design-review-log.md b05efd2bbbcd21f02c5ace70435d4f1db254bedb
Reviewed-Content-Hash: design/gdd/gdd-cross-review-2026-10-27.md e29728c5e178fdfe96e512f573a1dea6128be54f
Reviewed-Content-Hash: design/gdd/battle-pressure.md e0b3a1fd70e3e6334f0a91a16d16d76061b21916
Reviewed-Content-Hash: design/gdd/progress-save.md c390ad7db13ac935f910f053087d8f73f57b1061
Reviewed-Content-Hash: design/gdd/clear-effects.md 17767f552b65433fcdfb18f9fdbc00f0ac50a13e
Reviewed-Content-Hash: design/gdd/general-skills.md 686fe4c6b992627cfb1f89bad3eb489ed522b447
Reviewed-Content-Hash: design/gdd/round-flow.md ae0b1fc55a036510e040d582fbe2b9ff841afdcc
Reviewed-Content-Hash: design/gdd/ui-interaction.md ec03fe4e5186169367973669f456328dadf95bfd
Reviewed-Content-Hash: design/gdd/board-link.md ddfd01864cea1b2a0bf9e7a0fffb4a2c60770eb1
Reviewed-Content-Hash: design/gdd/systems-index.md 48a678a841e1908f33a28baea23fc296f47c6378
Reviewed-Content-Hash: design/gdd/game-concept.md b9259643dd0003e64dc9b0fd6d35ed1e66261e03

### Amendment — 2026-10-27（门禁之后，用户决定与总监意见）
按用户决定（水牌加技能说明）在 texts 里加 skillLine[武将 id][mode]，每行 ≤ 12 字。未再复审。

## Review — 2026-10-30 — Verdict: NEEDS REVISION
Review mode: lean · Workflow: standard
Scope signal: L（producer 需核实）
Specialists: none (lean)
Blocking items: 7 | Recommended: 11
Summary: 规则、10 回数据和跨文档接口站得住，全部 deck、波次、粮草数字复算无误。问题集中在压境间隔改为 12000 并跑完模拟后正文留下的旧值和旧说法，加上 steps 范围与战场压力不一致、一条验收无法判定。7 条阻塞都是机械修，已全部改完，待复审。
Prior verdict resolved: Yes
Findings:
- [BLOCKING] 规则 12 难度表: 第一、六、八回压境间隔旧值（10 秒 / 7 秒 / “比第一回紧”）— 已修
- [BLOCKING] Formulas 示例: 第一、八回 T_max 和 r_need 按 12000 重算（168 秒、216 秒、≈ 0.17），删“落后 0.04 对”，第十回示例按 7/6 步、16+18 血重算 — 已修
- [BLOCKING] Acceptance Criteria: `slow=1` 改为 15600 / “15.6”，第一回水牌“每 12 秒”，“9.1”改用标明的测试夹具 — 已修
- [BLOCKING] 规则 2/6、Formulas、Tuning: `steps` 合法范围改为 3–20（战场压力定义）— 已修
- [BLOCKING] 规则 13、Tuning、Formulas、登记表 ch01–ch10: “未模拟”改为已用 chapter-balance-sim 模拟 — 已修
- [BLOCKING] Tuning: `phase2.steps` 默认 5 / 6 / 6 — 已修
- [BLOCKING] Acceptance Criteria: 模拟验收改为固定种子、`node sim.mjs 40`、50 格、两次输出逐字节相同 — 已修
- [RECOMMENDED] Open Questions: 第一回 10000 / 备选 9000 过期 — 已修
- [RECOMMENDED] 规则 2、Open Questions: 张飞压境 skillLine 实为 10 字，关闭 — 已修
- [RECOMMENDED] 头部 Status / Last Verified 更新 — 已修
- [RECOMMENDED] Formulas P 范围 16–40 与登记表 [18, 63] 统一为 22–34（两处同改）— 已修
- [RECOMMENDED] Tuning 压底张数补第四回 6、第七回 9 — 已修
- [RECOMMENDED] 跨文档 foodT3 说明过期 — 已修（在 progress-save，见其日志；第四回 3 星难度待试玩时复核）
- [RECOMMENDED] 依赖 / Open Questions: 教学引导标“待写”— 已修
- [RECOMMENDED] 依赖 / Open Questions: 压境拒马、刘备、黄忠“待并入”已并入，关闭 — 已修
- [RECOMMENDED] 第三回、第六回水牌无说明行（`newThingLine`）— 未改（留待第三回试玩前定，仍在 Open Questions）
- [RECOMMENDED] 验收缺口: 规则 6 每条拒绝规则配一条验收 — 未改（留待实现加载器时补）
- [RECOMMENDED] Tuning “调高”一栏注明 interval 已到上限 — 未改（用户已知决定，留待复审）
- [RECOMMENDED] 教学要点表、总表加 rows / Σ deck 列（Nice-to-Have）— 未改
- 另（用户决定 D3、D7）: 灰卡示例改为第九回无鼓（不计入 available，面板展开时才显示灰卡）— 已修；第三回写为“一回一样新东西”的明确例外并加入试玩观察项 — 已修
Reviewed-Content-Hash: design/gdd/chapter-design.md a99324ddfe0f154eefb1b87d4413157c8e06193a
Reviewed-Content-Hash: design/registry/entities.yaml 9b88f1c949f5e636c3d0ba131a4bc5616d38c526
Reviewed-Content-Hash: .claude/skills/design-review/SKILL.md a63d8fba9b7142eeb43791f061e2e1533c429b43
（以上哈希取修订前的 git 版本 f3a96f9，即本次审查读到的版本；由主会话补填）
