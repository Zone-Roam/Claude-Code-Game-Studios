# 网页平台（H5）— 平台参考

本项目**不用引擎**（ADR-0001）。这份文件顶替模板的 `docs/engine-reference/<engine>/VERSION.md`：写明游戏跑在什么环境里、哪些事实还没核实、哪些功能不许用。

| 字段 | 值 |
|---|---|
| **运行环境** | 小红书 App 内的“小工具”WebView，离线 H5，竖屏单指 |
| **内核与版本** | **未知**。等平台探测页（`tools/platform-probe/`）在真机上的结果 |
| **安卓基准机** | 2020 年前后的千元机，4 GB 内存，Android 10（美术圣经第 8 节） |
| **iOS 基准机** | iPhone 8 或 SE2（WKWebView，跟随系统版本） |
| **语言基线** | ES2017（`async`/`await`、`Object.entries`）。探测结果回来前不用 ES2020 起的语法（`?.`、`??`、`BigInt`） |
| **开发工具** | 本机 Node 24 自带功能（`node:test`、`node:http`、`node:fs`），只在开发时用，不进发布包 |
| **探测状态** | 未运行（2026-10-27） |
| **Last Verified** | 2026-10-30：只核对了设计约束（新增 vibrate 未知项），平台事实全部待核实 |

## 知识风险

- 通用 Web 标准（DOM、Pointer Events、`requestAnimationFrame`、`localStorage`、CSS transform）：**LOW**，训练数据覆盖充分。
- 小红书 WebView 的具体行为：**HIGH**，模型完全不知道。下表每一项都要等探测结果：

| 未知项 | 探测键 | 影响的决策 |
|---|---|---|
| 页面是 `file://` 还是 http(s)，来源会不会每次发版都变 | `protocol`、`origin` | ADR-0004 存档（来源变了等于清档） |
| 能不能多文件、能不能 `fetch` 本地文件、能不能用 `<script type="module">` | `extraScript`、`fetchJson`、`moduleScript` | ADR-0001 发布形态（默认单文件，不依赖这三项） |
| `localStorage` 能不能用、会不会被清、配额 | `localStorage`、`visitCount`、`localStorageQuotaKB` | ADR-0004 |
| `visibilitychange`、`pagehide`、返回键 `popstate`、横竖屏事件来不来 | `eventsThisVisit`、`lastEvents` | ADR-0002 后台与暂停 |
| 宿主会不会放大字号、强制深色 | `font16pxComputed`、`darkScheme` | 美术圣经第 7 节字号、对比度 |
| 安全区、可用高度 | `safeAreaTRBL`、`innerWxH` | 界面 fit_scale |
| 帧率 | `fps3s` | 性能预算 |
| 有没有震动接口（`navigator.vibrate`；iOS WKWebView 没有，安卓宿主可能拦截） | `vibrate` | ui-interaction 规则 21d（暴怒 60 ms、击碎 80 ms）；结果回来前按“可能没有”处理，只做特性检测加 `try/catch` |

## 禁用（发布包）

- 第三方库、框架、CDN 和任何联网请求（不联网、不收集数据）。
- CSS `filter`、`backdrop-filter`、`mix-blend-mode`、运行时 SVG `<filter>`；`clip-path`、`mask-image` 做动画。
- 对 `left`、`top`、`width`、`height`、`font-size` 做动画：只动 `transform` 和 `opacity`。
- emoji 当图标用（图标一律内联 SVG）。
- `eval`、`new Function`、动态 `import()`（单文件包里没有可加载的模块）。
- 在规则层（`src/rules/`）里碰 `document`、`window`、`localStorage`、`Date.now()`、`Math.random()`（ADR-0001、ADR-0002）。

## 慎用（探测结果回来前）

- `IndexedDB`、`navigator.storage`、Clipboard API：探测页会报告，可用了再说。
- `document.fonts`：毛笔体选定前不用。
- `matchMedia('(prefers-reduced-motion: reduce)')`：读不到时按默认版本播放（界面规则 29）。
- 震动：只经 `src/platform/feedback.mjs` 调用，先用宿主的 `window.xhs.miniTool.vibrateShort`（客户端 9.50+），再退到 `navigator.vibrate`，都先判断是函数再 `try/catch`，失败静默（ui-interaction 规则 21d）。
- Web Audio：小工具文档允许音视频播放，没有禁用 Web Audio；音效是内嵌的 MP3 录音（base64，`decodeAudioData` 解码，不走 `<audio>` 或网络），解码失败用合成音（规则 21e），第一次按下时才开启。
