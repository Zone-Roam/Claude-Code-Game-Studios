"""Headless capture of a bot playthrough: one JPEG per 1/24 s frame + the sound log as JSON.

usage: py -3.13 tools/video/record.py "file:///<repo>/dist/rec.html?seed=505&chapter=ch05" tools/video/bot.js <out-dir> [tail-frames]
The page is make_rec.js's rec.html. Use file:// (the Bash sandbox blocks 127.0.0.1). Stops
`tail-frames` frames after the win (default 60), or at a loss. 390x844 CSS px at 2.5x -> 975x2110.
"""
import sys, os, json, time
from playwright.sync_api import sync_playwright

url, bot_path, out = sys.argv[1], sys.argv[2], sys.argv[3]
tail = int(sys.argv[4]) if len(sys.argv) > 4 else 60
os.makedirs(out, exist_ok=True)
for f in os.listdir(out):
    if f.endswith('.jpg'):
        os.remove(os.path.join(out, f))
bot = open(bot_path, encoding='utf-8').read()

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2.5)
    page.goto(url)
    page.wait_for_function('window.__screens && document.querySelector("#title-screen .start")', timeout=30000)
    page.wait_for_timeout(1500)  # samples and music decode
    page.evaluate(bot)
    i, end, t0 = 0, None, time.time()
    while True:
        sn = page.evaluate('window.__tick()')
        page.screenshot(path=os.path.join(out, '%05d.jpg' % i), type='jpeg', quality=90)
        i += 1
        if sn['overlay'] == 'lose':
            print('LOST at frame', i); break
        if sn['overlay'] == 'win' and end is None:
            end = i
        if end is not None and i >= end + tail:
            break
        if i > 4000:
            print('gave up'); break
    alog = page.evaluate('window.__alog')
    json.dump({'frames': i, 'fps': 24, 'win_frame': end, 'alog': alog}, open(os.path.join(out, 'sound-log.json'), 'w'), indent=1)
    print('frames', i, 'win at', end, 'sounds', len(alog), 'secs', round(time.time() - t0, 1))
    browser.close()
