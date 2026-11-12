import argparse
import json
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

WORK = Path(__file__).resolve().parent
FFMPEG = Path('C:/Users/Spat-Admin/AppData/Local/CapCut/Apps/9.7.1.4203/ffmpeg.exe')
WIDTH, HEIGHT, TOP = 1280, 584, 68
FPS = 10
LIGHT = np.asarray(Image.open(WORK / 'hand-255.png'), dtype=np.int16)
DARK = np.asarray(Image.open(WORK / 'hand-0.png'), dtype=np.int16)
OPAQUE = LIGHT - DARK < 36
EDGE_Y, EDGE_X = np.nonzero(OPAQUE & (LIGHT < 150))
FILL_Y, FILL_X = np.nonzero(OPAQUE & (DARK > 220))
FILL_Y, FILL_X = FILL_Y[::3], FILL_X[::3]


def locate_hand(frame):
    """Locate the recorded pointing-hand cursor by its outline and white fill."""
    center = frame[14:-9, 18:-4]
    palm = frame[14:-9, 16:-6]
    candidates = (center < 155) & (palm > 217)
    for dy in (-1, 1, 2):
        candidates &= frame[14 + dy:HEIGHT - 9 + dy, 18:-4] < 177
        candidates &= frame[14 + dy:HEIGHT - 9 + dy, 16:-6] > 220
    y, x = np.nonzero(candidates)
    y, x = y + 14, x + 18
    if not len(x):
        return None
    # Fit the Windows cursor's silhouette rather than treating text strokes as
    # pointer detections. Only use opaque points so the background can vary.
    base_x = np.tile(x, 10) - np.repeat([17] * 5 + [18] * 5, len(x))
    base_y = np.tile(y, 10) - np.repeat(list(range(12, 17)) * 2, len(y))
    valid = (base_y >= 0) & (base_y + 24 < HEIGHT)
    base_x, base_y = base_x[valid], base_y[valid]
    if not len(base_x):
        return None
    fill = frame[base_y[:, None] + FILL_Y, base_x[:, None] + FILL_X]
    valid = np.mean(fill > 203, axis=1) >= .60
    base_x, base_y, fill = base_x[valid], base_y[valid], fill[valid]
    if not len(base_x):
        return None
    edge = frame[base_y[:, None] + EDGE_Y, base_x[:, None] + EDGE_X]
    score = .74 * np.mean(edge < 168, axis=1) + .26 * np.mean(fill > 212, axis=1)
    best = int(np.argmax(score))
    if score[best] < 0:
        return None
    return [int(base_x[best] + 7), int(base_y[best] + TOP + 1), round(float(score[best]), 3)]


def track(video, output):
    command = [
        str(FFMPEG), '-hide_banner', '-loglevel', 'error', '-nostdin',
        '-i', str(video), '-map', '0:v:0',
        '-vf', f'fps={FPS},crop={WIDTH}:{HEIGHT}:0:{TOP},format=gray',
        '-f', 'rawvideo', '-pix_fmt', 'gray', 'pipe:1',
    ]
    positions = []
    with subprocess.Popen(command, stdout=subprocess.PIPE) as process:
        for index in range(100000):
            pixels = process.stdout.read(WIDTH * HEIGHT)
            if not pixels:
                break
            if len(pixels) != WIDTH * HEIGHT:
                raise ValueError('Incomplete frame')
            positions.append(locate_hand(np.frombuffer(pixels, np.uint8).reshape(HEIGHT, WIDTH)))
        if process.wait():
            raise RuntimeError('Unable to decode video')
    output.write_text(json.dumps(positions), encoding='utf-8')
    print(f'{video.name}: {len(positions)} frames sampled, {sum(p is not None for p in positions)} hand detections')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('video', type=Path)
    parser.add_argument('output', type=Path, nargs='?')
    args = parser.parse_args()
    if args.output:
        track(args.video, args.output)
    else:
        frame = np.asarray(Image.open(args.video).convert('L'))[TOP:TOP + HEIGHT]
        print(locate_hand(frame))

