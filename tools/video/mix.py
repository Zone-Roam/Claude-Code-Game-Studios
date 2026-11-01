"""Rebuild a recording's audio from record.py's sound log, using the sounds the game embeds.

usage: py -3.13 tools/video/mix.py <sound-log.json> <start-frame> <out.wav>

Reads src/view/sfx-assets.mjs and src/view/bgm-assets.mjs, so sample order and loop lengths are
the game's own: feedback.mjs decodes SFX_DATA keys, then BGM_DATA keys, in file order, and the
sound log names each buffer by that decode index. Mixing follows feedback.mjs: master 0.6, each
voice's gain from the log, the music bus 0.35 with 0.8 s linear fades, music looping between
loopStart and loopEnd. Needs numpy and ffmpeg on PATH.
"""
import sys, os, re, json, base64, subprocess, tempfile
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SR = 44100
MASTER, MUSIC, FADE = 0.6, 0.35, 0.8


def embedded():
    """[(name, mp3 bytes, loop or None)] in decode order."""
    out = []
    sfx = open(os.path.join(ROOT, 'src', 'view', 'sfx-assets.mjs'), encoding='utf-8').read()
    for name, b64 in re.findall(r"^\s+(\w+): '([A-Za-z0-9+/=]+)',$", sfx, re.M):
        out.append((name, base64.b64decode(b64), None))
    bgm = open(os.path.join(ROOT, 'src', 'view', 'bgm-assets.mjs'), encoding='utf-8').read()
    for name, loop, b64 in re.findall(r"^\s+(\w+): \{ loop: ([\d.]+), data: '([A-Za-z0-9+/=]+)' \},$", bgm, re.M):
        out.append((name, base64.b64decode(b64), float(loop)))
    return out


def decode(mp3):
    with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as f:
        f.write(mp3)
        path = f.name
    try:
        raw = subprocess.run(['ffmpeg', '-v', 'quiet', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                             capture_output=True, check=True).stdout
    finally:
        os.remove(path)
    return np.frombuffer(raw, dtype=np.float32).copy()


def main():
    log_path, start_frame, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    d = json.load(open(log_path))
    sounds = embedded()
    t0 = start_frame / d['fps']
    dur = d['frames'] / d['fps'] - t0 + 0.5
    mix = np.zeros(int(dur * SR) + SR, dtype=np.float32)
    cache = {}

    def sample(idx):
        if idx not in cache:
            x = decode(sounds[idx][1])
            if sounds[idx][2] is None:  # effects play from their first audible sample (feedback.mjs SAMPLE_ONSET)
                x = x[int(np.argmax(np.abs(x) > 0.01)):]
            cache[idx] = x
        return cache[idx]

    def add(x, at, gain):
        i = int(round(at * SR))
        if i >= len(mix) or i + len(x) <= 0:
            return
        if i < 0:
            x, i = x[-i:], 0
        n = min(len(x), len(mix) - i)
        mix[i:i + n] += x[:n] * gain

    playing, music = {}, []
    for e in sorted(d['alog'], key=lambda e: e['t'] + e['delay'] * 1000):
        idx = e['idx']
        t = (e['t'] + e['delay'] * 1000) / 1000 - t0
        if sounds[idx][2] is not None:  # a music track
            if e['ev'] == 'start':
                playing[idx] = t
            elif idx in playing:
                fade_from = e['t'] / 1000 - t0  # feedback.mjs starts the fade when it schedules the stop
                music.append((idx, playing.pop(idx), fade_from))
            continue
        if e['ev'] != 'start':
            continue
        x = sample(idx)
        rate = e.get('rate') or 1
        if abs(rate - 1) > 1e-3:  # playbackRate: shorter and higher
            n = int(len(x) / rate)
            x = np.interp(np.arange(n) * rate, np.arange(len(x)), x).astype(np.float32)
        add(x, t, MASTER * (e.get('vol') or 1))
    music += [(idx, st, None) for idx, st in playing.items()]

    for idx, st, fade_from in music:
        end = fade_from + FADE if fade_from is not None else dur
        if end <= st:
            continue
        loop = sample(idx)[:int(sounds[idx][2] * SR)]
        n = int((end - st) * SR)
        y = np.tile(loop, n // len(loop) + 2)[:n]
        env = np.ones(n, dtype=np.float32)
        fi = min(int(FADE * SR), n)
        env[:fi] = np.linspace(0, 1, fi)
        if fade_from is not None:
            a = max(0, int((fade_from - st) * SR))
            env[a:] *= np.linspace(1, 0, n - a)
        add(y * env, st, MASTER * MUSIC)

    peak = float(np.abs(mix).max())
    if peak > 0.98:
        mix *= 0.98 / peak
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '1', '-i', '-', out],
                   input=mix[:int(dur * SR)].tobytes(), check=True)
    print('ok', round(dur, 2), 's; peak', round(peak, 3), '; music',
          [(sounds[i][0], round(s, 2), round(f, 2) if f is not None else None) for i, s, f in music])


main()
