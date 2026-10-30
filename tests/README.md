# Test Infrastructure

**Engine**: 无引擎 — 原生 H5（ADR-0001）
**Test Framework**: Node 24 自带的 `node:test` 和 `node:assert`（不安装任何包）
**CI**: `.github/workflows/tests.yml`
**Setup date**: 2026-10-27

## Directory Layout

```
tests/
  unit/<system>/         # 单元测试：公式、状态机、规则逻辑。不碰文件、网络、页面
  integration/<system>/  # 集成测试：多系统联动、逐帧驱动一整回、存档往返
  helpers/               # 测试用的辅助代码（假存储端口、固定种子工厂等）
  smoke/                 # 冒烟清单，/smoke-check 读取
```

```
production/qa/
  evidence/              # 截图和人工验收记录
```

> **人工证据放在 `production/qa/evidence/`，不放在 `tests/` 里**：`/smoke-check`、`/test-evidence-review`、`/qa-plan` 都从那里读。

`<system>` 用设计文档的文件名：`board-link`、`round-flow`、`clear-effects`、`battle-pressure`、`general-skills`、`chapter-design`、`progress-save`、`ui-interaction`；基础代码用 `core`、`architecture`。

## Running Tests

```bash
node --test "tests/**/*.test.mjs"
```

同一条命令写在 `project.yaml` 的 `commands.test` 里。只跑一个文件：`node --test tests/unit/<system>/<file>.test.mjs`。

测试直接 `import` `src/rules/`、`src/core/` 里的模块（ADR-0001：规则层不碰页面，所以不需要浏览器）。界面层只有纯计算的部分（如 `src/view/layout.mjs` 的 `computeLayout`）能在这里测，其余靠截图证据。

## Test Naming

本项目没有引擎，`.claude/rules/test-standards.md` 里的三种引擎写法都不适用，改用：

- **文件**：`<system>-<feature>.test.mjs`，例如 `tests/unit/board-link/board-link-path.test.mjs`
- **测试名**：`<情境> → <预期结果>`，例如 `test('两块之间要拐三次 → 不连通', …)`
- 每个测试分 Arrange / Act / Assert 三段，用注释标出

## 确定性

- 规则层不读时间、不取随机（ADR-0001、ADR-0002）：测试里用固定种子、假的 `dtReal`、假的存储端口。
- `tests/unit/core/rng.test.mjs`（实现随机流时写）钉死 `hash32` 和各条流前几个输出的黄金值。改这些值等于改所有存过的种子，要新写决策记录。
- 修 bug 时先写能复现它的测试，**在没修的代码上看着它失败**，再修。

## 已有的测试

| 文件 | 测什么 |
|---|---|
| `unit/architecture/purity-detector.test.mjs` | 规则层纯净检查器本身能抓到每一种禁止的写法，且不误报注释和字符串 |
| `integration/architecture/rules-layer-purity.test.mjs` | 扫描真实的 `src/rules`、`src/core`，有任何页面、时间、随机、存储引用就失败；目录还不存在时跳过（不算通过） |

2026-10-27 已验证：在 `src/rules` 里临时放一个调用 `Math.random()` 的文件，集成测试按预期失败并指出文件和行号；删掉后恢复跳过。

## Story Type → Test Evidence

| Story Type | Required Evidence | Location |
|---|---|---|
| Logic | Automated unit test — must pass | `tests/unit/[system]/` |
| Integration | Integration test OR playtest doc | `tests/integration/[system]/` |
| Visual/Feel | Screenshot + lead sign-off | `production/qa/evidence/` |
| UI | Retained screenshot of each screen touched | `production/qa/evidence/` |
| Config/Data | Smoke check pass | `production/qa/smoke-*.md` |

## CI

`.github/workflows/tests.yml`：每次推送到 `main` 和每个拉取请求都跑上面的命令，失败就挡住合并。目前只写在本地，还没推送过。
