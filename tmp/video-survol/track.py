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


def reference_shapes():
    references = [
        ('video-surete/final-01.png', 1063, 375),
        ('video-assistant/final-01.png', 553, 336),
        ('video-hors-ville/final-recadre-01.png', 777, 410),
    ]
    result = []
    for filename, x, y in references:
        image = np.asarray(Image.open(WORK.parent / filename).convert('L'))
        patch = image[y-11:y+8, x-16:x+1]
        yy, xx = np.indices(patch.shape)
        # Restrict points to the hand itself: three fingers, palm and outline.
        fingers = (yy >= 3) & (yy <= 10) & (xx >= 5) & (xx <= 14)
        palm = (yy >= 10) & (yy <= 17) & (xx >= 7) & (xx <= 13)
        lower_left = (yy >= 10) & (yy <= 16) & (np.abs(xx - (yy - 9)) <= 1)
        bottom = (yy >= 16) & (yy <= 18) & (xx >= 6) & (xx <= 13)
        right = (yy >= 9) & (yy <= 15) & (xx >= 15)
        edge_y, edge_x = np.nonzero((patch < 155) & (fingers | lower_left | bottom | right))
        fill_y, fill_x = np.nonzero((patch > 239) & (fingers | palm))
        result.append((edge_y - 11, edge_x - 16, fill_y[::2] - 11, fill_x[::2] - 16))
    return result


SHAPES = reference_shapes()


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
    # A candidate can fall on either of two adjacent contour pixels.
    x = np.tile(x, 3)
    y = np.concatenate([y - 1, y, y + 1])
    score = np.zeros(len(x))
    for edge_y, edge_x, fill_y, fill_x in SHAPES:
        edge = frame[y[:, None] + edge_y, x[:, None] + edge_x]
        fill = frame[y[:, None] + fill_y, x[:, None] + fill_x]
        fit = .64 * np.mean(edge < 180, axis=1) + .36 * np.mean(fill > 218, axis=1)
        score = np.maximum(score, fit)
    best = int(np.argmax(score))
    if score[best] < .83:
        return None
    return [int(x[best] - 9), int(y[best] + TOP - 14), round(float(score[best]), 3)]


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
