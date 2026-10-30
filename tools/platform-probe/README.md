# 平台探测页

技术准备阶段的第一项（门禁报告 production/gate-checks/2026-10-27-systems-design-to-technical-setup.md）。用来核实小红书“小工具”的运行环境，结果决定存档方案和发布形态。三个文件合计约 10 KB，不联网，不收集任何个人信息，所有数据只存在手机本机。

## 怎么用

1. 把这个文件夹里的三个文件（`index.html`、`probe-extra.js`、`probe.json`）按小工具的要求打包上传。如果只能传单个 HTML，就只传 `index.html`，`extraScript` 和 `fetchJson` 两项会显示失败，这本身就是答案。
2. 在手机上打开，等 5 秒，点“复制结果”，把复制的文字发回来。
3. 再做三件事，然后重新打开、再复制一次：
   - 切到别的 App，过一会儿切回来；
   - 点一次手机的返回键（安卓）；
   - 横过来再竖回去。
4. 隔一天再打开一次，看“visitCount”是不是还在累加（本机存储会不会被清）。
5. 可选：点“测存储上限”，约 5 秒，看本机存储能存多少。

## 每一项回答什么问题

| 结果里的键 | 回答 | 影响哪个决定 |
|---|---|---|
| `userAgent` | 浏览器内核和版本 | 能用哪些 JS/CSS 特性 |
| `protocol`、`href`、`origin` | 页面是 file:// 还是 http(s)，来源会不会每次发版都变 | 本机存储是否稳定（来源变了等于清档） |
| `moduleScript` | 能否用 `<script type="module">` | 代码能不能按模块拆分 |
| `extraScript`、`fetchJson` | 能否多文件、能否 fetch 本地数据 | 单文件打包还是多文件 |
| `localStorage`、`visitCount`、`firstVisit` | 本机存储能不能用、会不会被清 | 存档方案（“进度、三星与存档”规则 12–17） |
| `storageEstimate`、`storagePersisted`、`localStorageQuotaKB` | 存储配额 | 存档大小上限 |
| `eventsThisVisit`、`lastEvents` | `visibilitychange`、`pagehide`、返回键（`popstate`）、横竖屏的事件到底来不来 | 后台暂停和横屏卡（“对局流程与时钟”规则 3、10、11） |
| `innerWxH`、`safeAreaTRBL`、`devicePixelRatio` | 可用高度、刘海和底部安全区 | 布局缩放（“界面与交互”的 fit_scale） |
| `font16pxComputed` | 宿主会不会放大字号 | 字号规则（美术圣经第 7 节） |
| `darkScheme`、`bodyBgComputed` | 会不会被强制深色反转 | 对比度是否有效 |
| `reducedMotion`、`pointerCoarse` | 系统“减弱动态效果”能不能读到、是不是触屏 | 少动版本、横屏判断 |
| `vibrate` | 有没有 `navigator.vibrate`、调用会不会被拦（`type`、`call`） | 暴怒、击碎的震动（“界面与交互”规则 21d）；没有就只做视觉 |
| `fps3s` | 3 秒内的帧率和最长卡顿 | 性能预算 |
| `fonts` | 苹方、思源/Noto、微软雅黑、楷体在不在 | 读的字的字体栈 |
