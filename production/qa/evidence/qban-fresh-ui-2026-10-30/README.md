# Q版卡通·清爽版 UI — first in-game capture (2026-10-30)

Build: `node tools/build/build.mjs` (dev), `dist/index.html` 636,054 bytes. Served from 127.0.0.1:8767 and
captured with headless Chrome over CDP at 375 x 734 CSS px, device scale 2 (real mouse events, no debug code
in the build). `catalog-progress` / `board-stacked` used a hand-written test save in localStorage
(ch01–ch04 won) to reach 第五回 (stackDepth 2).

| File | Shows |
|---|---|
| catalog.png | Fresh save: cream rows, star pieces, locked rows greyed with padlock |
| catalog-progress.png | Stars 3/2/1/2 on won chapters, 第五回 unlocked |
| open.png | Open card on the cream wood panel, primary button |
| board.png / board-selected.png | 第一回 (compact top band): banner plaque, round pause, red countdown bar, tile bases, selected tile |
| pause.png | Pause card over the light sky veil, primary + secondary buttons |
| board-stacked.png | 第五回 (full top band): wooden title banner, hearts, boss pips, foe box, "+1/+2" badges and card edges, green general cards |

Art: EvoMeme GPT Image 2.5 sheets (Q版清爽 UI sheet + magenta-keyed 马/酒 sheet), cut and packed into
`src/view/ui-assets.mjs` and `src/view/art-assets.mjs` (TILE_ART).
