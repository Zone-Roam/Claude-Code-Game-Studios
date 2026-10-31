# 下落压境 (gravity press) — first capture (2026-10-31)

Build `dist/index.html` 886,520 bytes, 127.0.0.1:8765, Claude browser pane at 375 x 734.

| File | Shows |
|---|---|
| ch01-start-settled.jpg | 第一回 at 开讲: the 4 dealt rows settled to the bottom, "12 秒后落下一排 · 0/6", hourglass bar |
| ch01-after-match-and-drop.jpg | After clearing the 鼓 pair in row 6 (tiles above fell) and the first timed drop: the new row sits on the column stacks, uneven heights (taken before the 压→落 wording change) |

The 200 ms fall slide itself is motion and is not visible in a still; it needs a look on the phone.

Simulation (scratchpad sim-gravity.mjs, 30–40 seeds, greedy bot, skill when ready): with gravity the round
length follows the player's pace (1 pair / 1.5 s ≈ 29 s, 1 pair / 5 s ≈ 90 s on 第一回), idle always loses
(破城), and the press interval barely matters because "no linkable pair → next row at once" brings rows early.
