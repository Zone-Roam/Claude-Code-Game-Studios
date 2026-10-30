# Epic: 武将技能 (general-skills)

- **Layer**: Feature
- **GDD**: `design/gdd/general-skills.md`
- **Module**: `src/rules/general-skills.mjs` (`createSkills(ctx)`, `GENERALS`, `SKILL_LINES`, `skillLine`)
- **Governing ADRs**: ADR-0001 (pure rules layer), ADR-0002 (assembly at 开讲, `skill` token, effect at token end), ADR-0003 (`cardHint`, `skillReady`, `skillArmed`, `skillArmedSpent`, `skillResult`, `gift`; `skills.cards()` query)
- **TR**: TR-general-skills-001 .. 006
- **Stories**: skipped at the user's request on 2026-10-30; implemented directly against the GDD Acceptance Criteria.
- **Status**: PART A and PART B done (all six generals). Open items are other systems' halves, listed below.

## Implemented ACs (PART A)

Tests: `tests/unit/general-skills/charge-and-hints.test.mjs` (C), `tests/unit/general-skills/zhang-zhao-zhuge.test.mjs` (Z), `tests/integration/general-skills/round-skill-token.test.mjs` (I).

蓄力
- [x] 关羽 0/2 → 2/2 就绪、喊字；再消仍 2/2 → C "AC charge"
- [x] 缺省 need → C "AC default need"
- [x] 回目覆盖 need → C "AC need override"
- [x] 技能清除不蓄力 → C "AC skill clears do not charge"
- [x] 只给出阵武将蓄力、桌沿两张 → C "AC only fielded generals"

不能释放与提示顺序
- [x] 诸葛亮 1/4 “消书三对” → C "AC uncharged hint"
- [x] 镇住还剩两步 → C "AC sealed hint"
- [x] 镇住优先于未蓄满 → C "AC hint order"
- [x] 镇住解除牌恢复 → C "AC seal lifted" (skills side; countdown is battle-pressure)
- [x] 已有护盾 → C "AC shield hint"
- [x] pause 令牌丢弃点击 → I "AC pause token"
- [x] effect 令牌丢弃点击 → I "AC effect token"

张飞
- [x] 敌将 roarBack(3,3) 在令牌到点 → Z "AC Zhang Fei boss" (steps arithmetic: battle-pressure)
- [x] 震慑设为 3 不累加 → battle-pressure (skills passes `stun = 3`, Z "AC Zhang Fei boss")
- [x] steps = 0 照常释放 → Z "AC Zhang Fei boss steps 0"
- [x] 压境吓退 → Z "AC Zhang Fei press, bottom row has units" (push timing: battle-pressure)
- [x] 压境底排无兵“此时一吼无用” → Z "AC Zhang Fei press, bottom row empty"
- [x] 粮草 +3 → Z "AC Zhang Fei food"

赵云
- [x] 敌将举盾、0/3 → Z "AC Zhao Yun boss"
- [ ] 盾挡普通出手 / 特技 / 跨阶段 → battle-pressure ACs
- [x] 待命：连得通的同种兵强消 → Z "AC Zhao Yun stand-by: press, connectable"
- [x] 待命：连不通也消、给对应武将蓄力 → Z "AC Zhao Yun stand-by: unconnectable" (combo: clear-effects)
- [x] 待命点赵云“已在待命” → Z "AC Zhao Yun stand-by tapped"
- [x] 盾对用掉待命 1/3；need 1 立即就绪 → Z "AC Zhao Yun spends stand-by"
- [x] 不同种不消耗待命 → Z "AC Zhao Yun stand-by: two different kinds"
- [x] 新一回 0/3 不在待命 → Z "AC Zhao Yun stand-by ends with the round"
- [x] 粮草强消不扣粮 → Z "AC Zhao Yun food stand-by" (skills side; food rule: battle-pressure)

诸葛亮
- [x] 书 10 块、“清书 5 对”、伤害 → Z "AC Zhuge: shu 6 top + 4 under"
- [x] 并列取兵种表顺序 → Z "AC Zhuge tie"
- [x] 火最多只清火 → Z "AC Zhuge huo most"
- [x] 预告中 · 破赤兔冲阵 → Z "AC Zhuge forecast lit"
- [x] 无预告 / 一阶段挂“破” → Z "AC Zhuge no forecast"
- [x] 已挂“破”不叠加 → Z "AC Zhuge already broken"

通用
- [x] skill 令牌 950 ms、期间 gameTime 不变、到点生效 → I "AC skill token in a round", Z "AC skill token"

水牌
- [x] 敌将三人说明 → C "AC skill lines (boss)"
- [x] 粮草刘备、黄忠；压境刘备 → C "AC skill lines (food, press)"

## Implemented ACs (PART B)

Tests: `tests/unit/general-skills/guan-huang.test.mjs` (GH), `tests/unit/general-skills/liu-bei.test.mjs` (L), `tests/integration/general-skills/row-col-select.test.mjs` (S).

关羽
- [x] 进入选排：选中清掉、2/2、无令牌、不走步 → GH "AC Guan Yu enter row select", S "AC Guan Yu enter row select in a round"
- [x] 再点关羽 / 点盘外取消 → S "AC Guan Yu cancel"
- [x] 选排时点张飞只取消 → S "AC Guan Yu select, tap ready Zhang Fei"
- [x] 点无块的行不响应 → S "AC Guan Yu select, tap a row with no blocks", GH "AC Guan Yu row with no blocks"
- [x] 点第 3 行：950 ms 令牌、gameTime 不变、到点斩、0/2、used 1 → S "AC Guan Yu cut row 3", GH "AC Guan Yu cut row"
- [x] guan_cut 例子 8 块 4 对、偶数 → GH "AC Guan Yu guan_cut example"
- [x] 两次补斩位置相同 → GH "AC Guan Yu extra-cut order is fixed"
- [x] 只有拒马的行 pairs 0 → GH "AC Guan Yu row of only roadblocks"
- [x] 压境下压取消选排 → S "AC Guan Yu press push during row select"
- [x] 切后台 / 暂停保留选排 → S "AC Guan Yu background or pause"
- [~] hp 4 斩 8 块 → hp 0、胜利卡 ≥ 300 ms → GH "AC Guan Yu hp 4" (skills side: pairs 4 dispatched); hp and win timing: battle-pressure / round-flow / view

黄忠
- [x] 三对弓就绪；马清弓不变 → GH "AC Huang Zhong charge"
- [x] 1/3 效果清弓仍 1/3 → GH "AC Huang Zhong 1/3"
- [x] 进入选列 → GH "AC Huang Zhong enter column select", S "AC Huang Zhong enter column select in a round" (“点一列” wording: view)
- [x] 再点 / 点盘外取消 → S "AC Huang Zhong cancel"
- [x] 点无块的列不响应 → S "AC Huang Zhong select, tap an empty column", GH "AC Huang Zhong column with no blocks"
- [x] 关羽、黄忠互斥 → S "AC Guan Yu and Huang Zhong exclude each other"
- [x] 压境下压保留选列、高亮重算 → S "AC Huang Zhong press push during column select"
- [x] 切后台保留选列 → S "AC Huang Zhong background during column select"
- [x] 点第 2 列：950 ms、射穿、0/3、used 1、无横幅 → GH "AC Huang Zhong cut column 2", S "AC Huang Zhong cut column 1"
- [x] huang_cut 例子 10 块 5 对 → GH "AC Huang Zhong huang_cut example"
- [x] 两次补射位置相同 → GH "AC Huang Zhong same board twice"
- [x] 只有拒马的列 → GH "AC Huang Zhong column of only roadblocks"
- [x] 盘上无块“盘上已经无兵” → GH "AC Huang Zhong empty board"

刘备
- [x] 敌将补心 + 关羽就绪 + 横幅 → L "AC Liu Bei boss: hearts 2/3"
- [x] 心满众将满 → L "AC Liu Bei boss, hearts full and everyone full"
- [x] 心满、诸葛亮 2/4 → 3/4 → L "AC Liu Bei boss, hearts full, Zhuge 2/4"
- [x] 压境：关羽 2/2、赵云仍待命 0 → L "AC Liu Bei press"
- [x] 压境只有刘备“无将可助” → L "AC Liu Bei press, fielded alone"
- [x] 粮草 15 → 16 “补一份粮” → L "AC Liu Bei food, food0 16, food 15" (cap itself: battle-pressure `refillFood`)
- [x] 粮草 10 → 12 + 众将用命 → L "AC Liu Bei food, food0 16, food 10"
- [x] 粮 18 > 16 “粮满，众将也满” → L "AC Liu Bei food, Zhang raised food 18"
- [~] 虎啸镇关羽 → L "AC Liu Bei before 虎啸" (both tests: charge/need after the gift, bound via `pressure.bindGenerals`); tie-break: battle-pressure
- [x] 被镇住的张飞受力，镇住解除后就绪 → L "AC Liu Bei and a sealed Zhang"
- [x] 选排 / 选列时点刘备只取消 → S "AC Liu Bei tapped during Guan Yu row select"
- [ ] `heartsLost = 1` 净值 → battle-pressure `metrics()` / progress-save (not this module)

## Waiting on

- battle-pressure (written in parallel): real `sealed`, `hasShield`, `canScare`, `roarBack(back, stun)`, `scareNextPush`, `addFood`, `raiseShield`, `breakSpecial` → `{special, name, forecast} | null`; the pressure-side halves of the 张飞 / 赵云 / 诸葛亮 ACs. Tests here use `tests/helpers/general-skills-fakes.mjs`.
- view: wording of `cardHint` reasons and `skillResult` banners (rules layer emits codes and numbers only).
