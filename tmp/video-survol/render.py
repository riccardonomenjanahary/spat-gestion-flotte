import argparse
import json
import math
import subprocess
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw

from track import FFMPEG, FPS, WORK

VIDEO_FPS = 30
SIZE = 64
FACTOR = VIDEO_FPS // FPS


def nearby(first, second, distance):
    return first is not None and second is not None and math.dist(first[:2], second[:2]) <= distance


def smooth_positions(raw):
    points = raw.copy()
    for index, point in enumerate(raw):
        if point is not None:
            before = raw[max(0, index - 2):index]
            after = raw[index + 1:index + 3]
            if not any(nearby(point, other, 24) for other in before + after):
                points[index] = None
    for index in range(1, len(points) - 1):
        if points[index] is None and nearby(points[index - 1], points[index + 1], 14):
            a, b = points[index - 1], points[index + 1]
            points[index] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, min(a[2], b[2])]
    return points


def animation_frames(points, frame_count):
    start = -1
    first = None
    for index in range(frame_count):
        sample = index // FACTOR
        point = points[min(sample, len(points) - 1)]
        if point is None:
            start, first = -1, None
            yield None, 0, 0
            continue
        next_point = points[sample + 1] if sample + 1 < len(points) else None
        if first is None or not nearby(first, point, 44):
            start, first = index, point
        fraction = index % FACTOR / FACTOR
        x, y = point[:2]
        if nearby(point, next_point, 28):
            x += (next_point[0] - x) * fraction
            y += (next_point[1] - y) * fraction
        phase = index - start
        fade = (FACTOR - index % FACTOR) / FACTOR if next_point is None else 1
        yield (round(x), round(y)), min(phase, 16), round(fade * 3)


@lru_cache(maxsize=70)
def sprite(phase, fade):
    canvas = Image.new('RGBA', (SIZE * 3, SIZE * 3))
    if not fade:
        return bytes(SIZE * SIZE * 4)
    draw = ImageDraw.Draw(canvas)
    center = SIZE * 3 // 2
    strength = fade / 3

    def ring(radius, color, width):
        span = round(radius * 3)
        draw.ellipse(
            (center - span, center - span, center + span, center + span),
            outline=(*color[:3], round(color[3] * strength)), width=width,
        )

    ring(12, (0, 84, 40, 210), 10)
    ring(12, (84, 251, 133, 245), 5)
    if phase < 16:
        progress = phase / 16
        ring(14 + 13 * (1 - (1 - progress) ** 2), (25, 225, 105, 170 * (1 - progress)), 7)
    return canvas.resize((SIZE, SIZE), Image.Resampling.LANCZOS).tobytes()


def render(tag, source, destination, frame_count):
    raw = json.loads((WORK / f'{tag}-v2.json').read_text(encoding='utf-8'))
    points = smooth_positions(raw)
    adjustments = json.loads((WORK / 'adjustments.json').read_text(encoding='utf-8'))[tag]
    audit = json.loads((WORK / f'{tag}-audit.json').read_text(encoding='utf-8'))
    for entry in adjustments['reject']:
        _, _, start, end = audit[entry - 1]
        points[start:end + 1] = [None] * (end - start + 1)
    for start, end, x, y in adjustments['add']:
        start_frame, end_frame = round(start * FPS), round(end * FPS)
        points[start_frame:end_frame] = [[x, y, 1.0]] * (end_frame - start_frame)
    frames = list(animation_frames(points, frame_count))
    commands = []
    last = None
    for index, (point, phase, fade) in enumerate(frames):
        if point is not None and point != last:
            x, y = point
            time = max(0, index / VIDEO_FPS - .00001)
            commands.append(
                f'{time:.6f} overlay@mouse x {x - SIZE // 2}, overlay@mouse y {y - SIZE // 2};'
            )
            last = point
    cmd_file = WORK / f'{tag}.cmd'
    cmd_file.write_text('\n'.join(commands), encoding='ascii')
    command = [
        str(FFMPEG), '-hide_banner', '-loglevel', 'error', '-nostdin', '-n',
        '-i', str(source), '-f', 'rawvideo', '-pix_fmt', 'rgba',
        '-s', f'{SIZE}x{SIZE}', '-r', str(VIDEO_FPS), '-i', 'pipe:0',
        '-filter_complex', (
            f'[0:v]sendcmd=f={cmd_file.name}[base];'
            '[base][1:v]overlay@mouse=x=-100:y=-100:eval=frame:format=yuv420[out]'
        ),
        '-map', '[out]', '-map', '0:a:0', '-map_chapters', '-1',
        '-c:v', 'h264_mf', '-b:v', '6500k', '-pix_fmt', 'yuv420p',
        '-c:a', 'copy', '-movflags', '+faststart', str(destination),
    ]
    with subprocess.Popen(command, cwd=WORK, stdin=subprocess.PIPE) as process:
        for point, phase, fade in frames:
            process.stdin.write(sprite(phase, fade if point is not None else 0))
        process.stdin.close()
        if process.wait():
            raise RuntimeError(f'Video export failed: {tag}')
    print(f'{tag}: {sum(point is not None for point, _, _ in frames)} frames with a hover effect')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('tag')
    parser.add_argument('source', type=Path)
    parser.add_argument('destination', type=Path)
    parser.add_argument('frame_count', type=int)
    args = parser.parse_args()
    render(args.tag, args.source.resolve(), args.destination.resolve(), args.frame_count)
