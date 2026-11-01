# 演示视频录制（dev-only，不进发布包）

用无界面浏览器自动打一回，逐帧截图，再按游戏里每一声的播放记录混出音轨，合成竖屏有声视频。2026-11-01 用它录了小红书帖子“连连看，但是要打吕布”的视频（第五回，两阶段吕布，28.8 秒）。

**不要**用 browser harness 在用户自己的 Chrome 里逐帧截：后台标签页会节流、模拟设备尺寸会让页面重新加载，一帧要 1.5 秒。这套脚本 717 帧 42 秒录完。

## 需要

- Node 24（构建）
- Python 3.13，带 `playwright`（1.63，含它自带的 Chromium）和 `numpy`
- ffmpeg 在 PATH 里

## 步骤

```bash
# 1. 开发版构建（只有开发版认 ?seed=，同一局能重放）→ 生成录制页 → 把 dist/index.html 还原成发布版
node tools/build/build.mjs
node tools/video/make_rec.js dist
node tools/build/build.mjs --release

# 2. 录：file:// 打开（Bash 沙箱不让连 127.0.0.1）；chapter 默认 ch05，seed 决定这一局
py -3.13 tools/video/record.py "file:///E:/<仓库>/dist/rec.html?seed=505&chapter=ch05" tools/video/bot.js out/rec 60

# 3. 混音：第二个参数是成片从第几帧开始（第 25 帧左右是回目开场卡）
py -3.13 tools/video/mix.py out/rec/sound-log.json 25 out/audio.wav

# 4. 合成 1080×1920：画面按高度放满，两边用同一画面的模糊放大版填满
ffmpeg -y -framerate 24 -start_number 25 -i out/rec/%05d.jpg -i out/audio.wav -filter_complex "[0:v]split[a][b];[a]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=28:3,eq=brightness=-0.12[bg];[b]scale=-2:1920:flags=lanczos[fg];[bg][fg]overlay=(W-w)/2:0,format=yuv420p[v]" -map "[v]" -map 1:a -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 160k -shortest -movflags +faststart out/demo.mp4
```

`out/` 随便放（建议放在仓库外或 `dist/` 里，别提交录出来的几百张图）。

## 各文件做什么

| 文件 | 作用 |
|---|---|
| `make_rec.js` | 在开发版 `dist/index.html` 上加录制钩子，写成 `dist/rec.html`：动画帧和所有 CSS 动画改成手动推进（`__frame(dt)`）；音频上下文假装在运行（没有用户手势也能出声记录），每个音频片段的开始、停止都记到 `__alog`；把 `screens` 和输入队列挂到 `window` 上给机器人用 |
| `bot.js` | 机器人：开始 → 选回目 → 开讲；每隔几帧用 `board.findPath` 找一对连得通的点掉（不会连错，连击一直保持）；武将蓄满就放技能，要选目标的挑棋子最多的一排 |
| `record.py` | Playwright 打开录制页、加载机器人，每推进一帧截一张 JPEG（975×2110），打赢后再录 60 帧（胜利卡），最后把音效记录写进 `sound-log.json`；输了会打印 `LOST`，换个 seed 再录 |
| `mix.py` | 直接读 `src/view/sfx-assets.mjs` 和 `bgm-assets.mjs` 里内嵌的音频，按记录的时间点、音量、播放速率（连击升调）混音；BGM 按游戏里的循环区间循环，换曲 0.8 秒淡入淡出；混音参数和 `src/platform/feedback.mjs` 一致 |

## 注意

- 换了音效或 BGM，不用改脚本：`mix.py` 按 `feedback.mjs` 的解码顺序（先 SFX_DATA，再 BGM_DATA，按文件里的顺序）对上记录里的编号。
- 机器人约半秒连一对，比真人快。要更像真人，把 `bot.js` 里配对后的 `B.wait = 9` 调大。
- 录之前先跑一遍看能不能赢（`record.py` 会说），帧数和胜利帧会打印出来。
