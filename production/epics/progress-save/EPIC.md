# Epic: 进度、三星与存档

> **Layer**: Feature
> **GDD**: design/gdd/progress-save.md
> **Architecture Module**: `src/rules/progress-save.mjs`（规则）、`src/platform/storage.mjs`（存储端口，唯一碰本机存储的文件）
> **Governing ADRs**: ADR-0004（本机存档）、ADR-0002（settle 在进入“结束”时同步调用一次）、ADR-0001（规则层纯代码）
> **Status**: Implemented（2026-10-30）
> **Stories**: 跳过。用户 2026-10-30 要求直接做出可玩版本，Feature 层不写故事文件，按 GDD 的 Acceptance Criteria 实现。

## Implemented ACs

测试：`tests/unit/progress-save/stars.test.mjs`（S）、`save.test.mjs`（V）、`storage-port.test.mjs`（P）。

- [x] 敌将 heartsLost 0 → 3 星 → S `AC boss win heartsLost 0 …`
- [x] 敌将 heartsLost 1 → 2 星、“丢了 1 颗心” → S `AC boss win heartsLost 1 …`
- [x] 敌将 heartsLost 2 → 1 星 → S `AC boss win heartsLost 2 …`
- [x] 4 颗心、丢 3 → 1 星、无断言 → S `AC boss chapter with 4 hearts …`
- [x] 刘备补心按净值 → S `AC boss net hearts …`
- [x] 压境 2000/2001/8000/8001 → S `AC press dangerMs 2000 …`
- [x] 压境原因 5.3 / 2.1 秒 → S `AC press reasonLine rounds seconds up …`
- [x] `"abc{"` 后赢 ch01 → V `AC corrupt "abc{" then win ch01 …`
- [x] ch01 stars 7、赢 ch02 → V `AC ch01 {stars: 7} at boot, win ch02 …`
- [x] 别的页面改成 v 2 → V `AC another page rewrites the save to v = 2 …`
- [x] 读成功、探测失败 → V `AC read ok but probe fails …`
- [x] 粮草 0/2 → 3 星；0/1 → 2 星；2/5、3 → S `AC food …`（三条）
- [x] 输 → 0 星、plays + 1 → S `AC any mode loss …`
- [x] 历史 2 星、1 星赢 → S `AC ch01 best 2 stars …`
- [x] MVP 三回全开 → V `AC MVP package, new save …`
- [x] 竖切片按故事解锁 → V `AC story unlock, new save …`
- [x] 第三回有胜场 → 一到三回全开 → V `AC story unlock, ch03 has wins …`
- [x] 读抛异常、仅内存、重新加载 → V `AC read throws (no storage) …`
- [x] 运行中写入失败、之后 0 次写 → V `AC first write throws mid-run …`
- [x] 启动探测不改存档、不留 pslk.probe → V `AC normal storage boot …`
- [x] `"abc{"` 启动 → 备份、空白、提示 → V `AC boot with corrupt "abc{" …`
- [x] chapters 是数组 → 损坏 → V `AC chapters is an array …`
- [x] ch01 不合法、ch02 合法 → V `AC ch01 {stars: 7} and ch02 valid at boot …`
- [x] v 2 存档尽力读出、不写 → V `AC v = 2 save with ch01 2 stars …`
- [x] ch99 原样保留 → V `AC ch99 …`
- [x] 页面 A、B 胜场都在 → V `AC page A wins ch01, then page B …`
- [x] 盖章途中关页面 → V `AC ended round then page closed mid stamp …`
- [x] saved = false / true → V `AC write fails or state readonly/memory …`（卡上“这一回没存上”一行归界面）
- [x] 分出胜负前刷新 → V `AC page reloaded before the round decided …`
- [x] 阈值覆盖 {t3 1, t2 2} → S `AC boss override …`
- [x] 旧存档无 loadout → V `AC v1 ch01 without loadout at boot …`
- [x] 输 ch01 写入阵容 → V `AC same save, lose ch01 …`
- [x] loadout 不是数组 → V `AC ch02 loadout "zhao_yun" …`
- [x] loadout 重复 / 空 / 4 项 → V `AC ch02 loadout duplicate …`
- [x] RoundResult.loadout 为 [] → V `AC RoundResult.loadout [] …`
- [x] 重复 settle → V `AC duplicate settle …`
- [x] 形状合法、内容不认识 → V `AC ch02 loadout ["zhao_yun", "lv_bu"] …`
- [x] 放弃不改 loadout → V `AC round abandoned …`
- [x] A、B 先后写 loadout → V `AC page A wrote ch01 loadout …`
- [~] 武将解锁不存 → V `AC win ch01 on a new save …`（本系统部分：不存字段、提供 wins；推算归选将与解锁）
- [~] 后面回目有胜场时诸葛亮不解锁 → V `AC ch03 has wins, ch02 none …`（同上）

## Waiting on

- 选将与解锁（general-loadout）：用 `catalog()` 的 `wins` 推出已解锁武将，用 `loadout` 填槽；上面两条 [~] 在它那边补全。
- 界面与交互：结算卡“这一回没存上”一行、书目提示条（调 `nextNotice()`）、原因一句的文字表（`PROGRESS_TEXTS` 现作缺省）。
- 装配根（main.mjs）：`createProgress({ storage: createLocalStoragePort(window), chapters, now })`，启动时 `boot()`。
- 回目加载器：`stars` 覆盖的形状检查（规则 3）；本模块对坏覆盖只回退缺省值。
