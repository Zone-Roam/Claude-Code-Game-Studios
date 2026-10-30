# ADR-0004: 本机存档（localStorage）

## Status

Accepted（用户 2026-10-27 接受）

> **Who may move this to `Accepted`: the user, or `technical-director` on the
> user's explicit confirmation. No other agent, and no skill on its own.**

## Date

2026-10-27（2026-10-30 修订，见文末修订记录）

## Last Verified

2026-10-27（平台探测结果未回，存储行为未核实）

## Decision Makers

主会话起草；存档规则来自用户批准的 progress-save.md（Approved 2026-10-27）。

## Summary

进度（每回最好星级、胜场、场次）要在关掉小工具后还在，但不能联网，而小红书 WebView 的本机存储会不会被清、来源会不会变都还不知道。决定：用 `localStorage` 存一条 JSON 记录（键 `pslk.save`），存储操作只经过一个可以替换的**存储端口**，进度逻辑本身是纯代码、注入端口，按 progress-save.md 规则 10–19 做校验、合并、迁移和降级。

## Engine Compatibility

| Field | Value |
|-------|-------|
| **Engine** | 无引擎 — 原生 H5（ES2017），小红书“小工具”WebView（版本未知） |
| **Domain** | Core |
| **Layer** | Foundation |
| **Knowledge Risk** | HIGH（`localStorage` API 本身 LOW；宿主是否持久保存、来源是否稳定、隐私模式下是否抛异常，完全未知） |
| **References Consulted** | `docs/engine-reference/web-h5/VERSION.md`；`design/gdd/progress-save.md` 规则 5、10–20；`tools/platform-probe/README.md` |
| **Post-Cutoff APIs Used** | None |
| **Verification Required** | 探测键：`localStorage`、`visitCount`（隔天是否累加）、`origin` 和 `protocol`（发新版后是否变化）、`localStorageQuotaKB`、`storagePersisted`。真机：存档后彻底关掉小工具、隔天再开，星级还在 |

## ADR Dependencies

| Field | Value |
|-------|-------|
| **Depends On** | ADR-0001（规则层不碰 `localStorage`，平台能力经注入） |
| **Enables** | None |
| **Blocks** | 进度、三星与存档的实现故事中“写档、读档、降级提示”部分（星级计算不受影响） |
| **Ordering Note** | 建议等平台探测结果回来、更新本条的 Last Verified 后再 Accepted；不等也可以先实现，因为降级路径（仅内存）本身就是规则的一部分 |

## Context

### Problem Statement

progress-save.md 已经把存档的结构、校验、合并、迁移和四种提示写死，但没定存在哪里、怎么接到平台上、怎么测试“存储抛异常”“配额满了”这些在开发机上很难复现的情况。

### Current State

原型不存档。

### Constraints

- 不联网、不上传（progress-save 规则 20；ADR-0001 构建检查）。
- 存储行为未核实：可能被宿主清掉，可能每次发版来源都变，可能在隐私模式下读写都抛异常。
- 规则层不碰平台对象（ADR-0001）。

### Requirements

- 只在 `settle()` 时写；写前重读并逐回取较大值合并（规则 12、13）。
- 启动时读档，再用 `pslk.probe` 做“写入—读回—删除”探测（规则 14）。
- 三种状态：正常 / 只读（新版本）/ 仅内存，四种提示，每种每次页面加载最多一次（规则 14–18）。
- 版本迁移逐版进行；损坏的原始字符串另存 `pslk.save.bad`（规则 15、16）。
- 存档出错绝不阻止游戏启动和游玩。

## Decision

### 1. 存哪里

`window.localStorage`，三把键：

| 键 | 内容 | 写入时机 |
|---|---|---|
| `pslk.save` | progress-save 规则 10 的 JSON 记录（`v: 1`） | `settle()` 时，合并后整条写回 |
| `pslk.save.bad` | 读到的损坏原始字符串（只保留一份） | 启动时发现整条损坏 |
| `pslk.probe` | 固定的短字符串 | 启动时写入、读回、立即删除 |

记录很小（MVP 3 回约 200 字节，完整版 20 回约 1.5 KB），远低于任何已知配额。

### 2. 存储端口

```
// src/platform/storage.mjs —— 唯一碰 localStorage 的文件
export function createLocalStoragePort(win)
  → { read(key) → string | null, write(key, value), remove(key) }
  // 拿不到 win.localStorage、或任何调用抛异常时，异常原样抛出；端口自己不吞异常
```

进度逻辑拿到的是这个端口，不是 `localStorage`。测试用内存实现的假端口，可以设定“读抛异常”“写抛异常”“写满 N 字节后抛 QuotaExceededError”“预置一条损坏的字符串”。

### 3. 进度逻辑（纯代码）

```
// src/rules/progress-save.mjs
export function createProgress({ storage, chapters, now, version = 1 })
progress.boot()                    // 规则 14：读档 → 探测 → 确定状态；返回 { state, notice }
progress.settle(roundResult)       // 规则 5、12、13：算星 → 重读 → 合并 → 写 → SettleOutcome
progress.catalog()                 // 每回的最好星级、是否解锁（MVP 全部解锁，规则 8）
progress.nextNotice()              // 规则 18：书目顶部该显示哪一条提示（按优先级），显示后标记已显示
progress.storageState()            // 'normal' | 'readonly' | 'memory'
```

- `now` 注入（只用于 `updatedAt`），规则层不调用 `Date.now()`。
- 每一次端口调用都包在 `try/catch` 里，异常按规则 13 的表和规则 17 转入对应状态；**任何存储异常都不会冒泡到主循环**。
- 校验、迁移、合并都是对普通对象的纯函数（`validate(raw)`、`migrate(record)`、`merge(memory, stored)`），单独导出供测试。
- 写入用 `JSON.stringify` 整条写回；顶层不认识的字段、存档里有而回目数据里没有的 `id` 原样保留（规则 10、19）。
- **`loadout`（2026-10-30 随选将新增）**：每回记录多一个可选字段 `loadout`（武将 id 数组，按槽位顺序）。旧存档没有它也合法，`v` 仍为 1，不迁移。
  - `validate` 只查形状：数组、长度 1 到 `SLOT_MAX`、每项是字符串、没有重复。不合格只丢这一项，`stars`、`wins`、`plays` 照用（progress-save 规则 11）。“认不认识这位武将、超没超过本回 `slots`”归选将系统在填槽时查。
  - `settle()` 把 `RoundResult.loadout` 写进本回记录，赢输都写（规则 12）。
  - `merge` 对 `loadout` **不取较大值**：本次结算的那一回用本回的阵容；其他回目重读到合法的就用重读的，没有就用内存的，两边都没有就不写（规则 13）。
  - 已解锁的武将不存，由选将系统从各回 `wins` 推出（general-loadout 规则 7）。

### Architecture Diagram

```
main.mjs ──► createLocalStoragePort(window) ──► storage 端口
                                                   │（注入）
            createProgress({ storage, chapters, now }) ── boot()   启动时
                                                   └── settle()  round 进入 end 时（ADR-0002）
测试：      createProgress({ storage: fakePort('throwOnWrite'), ... })
```

### Key Interfaces

见上面两段代码。`SettleOutcome` 和 `RoundResult` 的字段以 progress-save.md 规则 5、round-flow.md 规则 8 为准，不在这里重复。

### Implementation Guidelines

- 必须：只有 `src/platform/storage.mjs` 引用 `localStorage`；构建检查第 4 条拦住规则层里的引用。
- 必须：每次端口调用都包 `try/catch`，异常只改变存储状态，不冒泡。
- 必须：写入只发生在 `settle()` 和启动时的探测、损坏备份三处。
- 必须：同一回只结算一次。`settle()` 记下已结算的回（按 round 对象传入的结果对象判断），第二次调用开发版报错，正式版忽略并返回第一次的 `SettleOutcome`。
- 必须：`settle()` 同步返回且从不抛异常（ADR-0002 依赖这一点：漏出的异常会把玩家送到出错页）。
- 必须：`tests/unit/progress-save/` 覆盖规则 13 重读结果表的每一行和规则 14–17 的每种状态转换，用假端口。
- 绝不：在对局中途、切后台、回书目放弃时写档。
- 绝不：把存档内容发到任何地方（不联网）。
- 绝不：存储失败时阻止进入游戏或弹出要求操作的对话框（只在书目顶部亮纸条提示一次）。

## Alternatives Considered

### Alternative 1: IndexedDB
- **Description**: 用 IndexedDB 存一条记录。
- **Pros**: 配额大；有些浏览器把它算作更“持久”的存储。
- **Cons**: 异步接口，`settle()` 要等回调，结算卡上的 `saved` 字段要延后；在旧 WebView 里支持和行为更不确定；对 200 字节的数据是杀鸡用牛刀。
- **Rejection Reason**: 复杂度高、支持更不确定；如果探测显示 `localStorage` 会被清而 IndexedDB 不会，再写新决策记录换实现（端口不变）。

### Alternative 2: Cookie
- **Description**: 把存档写进 cookie。
- **Pros**: 很老的环境也支持。
- **Cons**: `file://` 下通常不能用；有 4 KB 上限；cookie 本来是给服务器的，离线页面用它语义不对。
- **Rejection Reason**: 很可能在离线小工具里根本不能用。

### Alternative 3: 不存档
- **Description**: 每次打开都从头讲起。
- **Pros**: 没有任何存储风险。
- **Cons**: 星级和“打过”的记录全丢，书目里的最好星级失去意义；竖切片起的按故事解锁无法实现。
- **Rejection Reason**: 违反 progress-save.md 的核心规则；但它就是本方案“仅内存”状态的行为，作为降级路径保留。

### Alternative 4: 进度码（玩家抄一串字，换机或清档后输入恢复）
- **Description**: 把存档编码成短码显示给玩家。
- **Pros**: 不依赖本机存储；能跨设备。
- **Cons**: 要多做输入界面；中老年玩家抄码成本高。
- **Rejection Reason**: 不是 MVP 范围（用户 2026-10-27 决定“进度码放竖切片”）。如果探测显示存储会被清，它是首选的补救，届时另写决策记录，和本方案并存。

## Consequences

### Positive
- 存档的所有边界情况都能在 Node 里用假端口测，不需要真的把手机存储弄坏。
- 存储出任何问题，游戏照常能玩，只是不记进度并提示一次。
- 将来要换存储方式（IndexedDB、宿主提供的接口），只换端口实现。

### Negative
- 如果宿主会清 `localStorage` 或每次发版来源都变，进度会丢，而且本方案无法发现“被清了”和“第一次玩”的区别。

### Neutral
- 存档格式和规则完全由 progress-save.md 决定，本条不增加任何字段（2026-10-30 的 `loadout` 也是 progress-save.md 加的，本条只照着实现）。

## Risks

- **宿主清存储或来源随发版变化**（HIGH，未核实）：探测页的 `visitCount`（隔天）和发版前后的 `origin` 会给出答案。缓解：确认会丢时，把进度码提前到 MVP 之后的第一个版本，并在结算卡上提示。
- **隐私模式或 WebView 禁用存储**：规则 17 的“仅内存”状态和提示，已覆盖。
- **两个页面同时开着互相覆盖**：规则 13 的重读合并（取较大值）已覆盖；`localStorage` 本身没有事务，极短时间内同时写仍可能丢一次，接受。

## GDD Requirements Addressed

| GDD System | Requirement | How This ADR Addresses It |
|------------|-------------|--------------------------|
| progress-save.md | 规则 10、11：`pslk.save` 结构 v1，先看版本再逐条校验 | `localStorage` 的 `pslk.save` + 纯函数 `validate`（TR-progress-save-001） |
| progress-save.md | 规则 12、13：只在 `settle()` 写；写前重读合并 | `progress.settle()` 内重读 → `merge` → 写（TR-progress-save-002） |
| progress-save.md | 规则 10–13：每回可选的 `loadout`（2026-10-30）：形状校验只丢这一项、赢输都写、合并不取较大值，`v` 不升级 | 第 3 节 `loadout` 条目；`validate`、`merge` 各加测试 |
| progress-save.md | 规则 14、17、18：启动探测、三种状态、提示 | `progress.boot()`、`storageState()`、`nextNotice()`（TR-progress-save-003） |
| progress-save.md | 规则 15、16：迁移、新版本只读、损坏备份 | `migrate`、`pslk.save.bad`（TR-progress-save-004） |
| progress-save.md | 规则 20：不收集、不上传、不联网 | 端口只有本机读写；ADR-0001 构建检查禁止网络 API（TR-progress-save-005） |
| round-flow.md | 规则 8：进入“结束”时立即 `settle(RoundResult)` 拿回 `SettleOutcome` | `settle()` 同步返回（`localStorage` 是同步接口）（TR-round-flow-006） |
| progress-save.md | 同一回只结算一次：第二次调用开发版报错、正式版忽略 | Implementation Guidelines 第二条（TR-progress-save-006） |

## Performance Implications
- **CPU**: 一次 `settle()` 读写约 200 字节的 JSON，微秒级。
- **Memory**: 可以忽略。
- **Load Time**: 启动时一次读、一次探测，可以忽略。
- **Network**: 无。

## Migration Plan

没有旧存档。以后 `v` 升级时，按规则 15 逐版迁移，迁移函数放在 `progress-save.mjs` 里并各自有测试。

## Validation Criteria

- 单元测试：规则 13 重读结果表的 6 行、规则 14–17 的状态转换、规则 18 提示优先级，全部用假端口覆盖。
- 真机：存档 → 彻底关掉 → 隔天再开，书目上的星级还在（记进 `production/qa/evidence/`）。
- 平台探测结果回来后：更新本条 Last Verified；如果存储不可靠，按 Risks 的缓解写新决策记录。

## Related

- ADR-0001（构建检查禁止网络 API；规则层不碰存储）
- ADR-0002（`settle()` 在进入 end 时调用）
- `design/gdd/progress-save.md`、`tools/platform-probe/`

## Revision History

- 2026-10-30：并入切片第四至六版和选将（见 `docs/architecture/change-impact-2026-10-30-slice-merge.md`），决策不变。
