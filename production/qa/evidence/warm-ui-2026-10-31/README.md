# 暖木 Q版 UI — in-game capture (2026-10-31)

Build: `node tools/build/build.mjs`, `dist/index.html` 873,164 bytes. Served from 127.0.0.1:8765 (`.claude/launch.json`
"dist"), captured in the Claude browser pane at 375 x 734 CSS px. `open-ch05` / `board-ch05-selected` used a
hand-written test save in localStorage (ch01–ch06 won).

| File | Shows |
|---|---|
| board-ch01.jpg | 第一回 (compact top band): plaque with crescent, hourglass + green countdown bar, coloured tile bases, wooden tray, wide 关羽 lead card with skill line (taken before the pips text colour fix) |
| open-ch05.jpg | Open card: Q版 张飞 / 关羽 / 赵云 in the roster, green 开讲 button |
| board-ch05-selected.jpg | 第五回 (full top band): big plaque, hearts + boss pips, foe box, "+1/+2" stacks, gold selection ring, wide 张飞 lead card + 关羽 / 赵云 cards |

Art: EvoMeme 暖木 UI sheet (GPT Image 2.5) matted per component with RMBG-2.0 in the user's ComfyUI, then
largest-blob keep, edge-only despill, premultiplied Lanczos resize, PNG-8 (octree, alpha kept) — packed into
`src/view/warm-assets.mjs`. Comparison: `../style-options-2026-10-30/rmbg-compare.png`.

## Charge row and ready state (later on 2026-10-31)

| File | Shows |
|---|---|
| card-charge-half.png | Lead card charge row: 刀 icon + gold / empty segments (1 of 2) |
| card-ready.jpg | Ready lead card: gold frame, pulsing gold glow ring, "点我出招" badge, "令" token |

Both states were set in the page with a console call (class `ready`, segment classes) for the look only, because
the press timer kept pushing rows mid-capture; the charge logic itself is covered by the general-skills tests.
Also fixed: the 清爽 `border: none` rules reset `border-image`, so ready / armed / show / standby cards lost their frame.
