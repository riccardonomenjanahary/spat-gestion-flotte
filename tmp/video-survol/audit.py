import argparse
import json
import math
import subprocess
from pathlib import Path

from PIL import Image, ImageDraw

from render import FFMPEG, FPS, WORK, smooth_positions


def groups(points):
    active = []
    for index, point in enumerate(points):
        if point is None or (active and math.dist(active[0][1][:2], point[:2]) > 36):
            if active:
                yield active
                active = []
        if point is not None:
            active.append((index, point))
    if active:
        yield active


def audit(tag, source):
    raw = json.loads((WORK / f'{tag}-v2.json').read_text(encoding='utf-8'))
    entries = []
    for group in groups(smooth_positions(raw)):
        index, point = max(group, key=lambda entry: entry[1][2])
        entries.append((index, point, group[0][0], group[-1][0]))
    info = WORK / f'{tag}-audit.json'
    info.write_text(json.dumps(entries), encoding='utf-8')
    filter_text = "select='" + '+'.join(f'eq(n,{3 * index + 1})' for index, *_ in entries) + "'"
    script = WORK / f'{tag}-audit.filter'
    script.write_text(filter_text, encoding='ascii')
    command = [
        str(FFMPEG), '-hide_banner', '-loglevel', 'error', '-nostdin', '-i', str(source),
        '-filter_script:v', str(script), '-fps_mode', 'vfr', '-an',
        '-f', 'rawvideo', '-pix_fmt', 'rgb24', 'pipe:1',
    ]
    with subprocess.Popen(command, stdout=subprocess.PIPE) as process:
        for number, (index, point, start, end) in enumerate(entries):
            pixels = process.stdout.read(1280 * 720 * 3)
            frame = Image.frombytes('RGB', (1280, 720), pixels)
            x, y = map(round, point[:2])
            left, top = max(0, min(1280 - 220, x - 110)), max(0, min(720 - 75, y - 33))
            area = frame.crop((left, top, left + 220, top + 75))
            if number % 36 == 0:
                sheet = Image.new('RGB', (880, 900), '#142839')
                draw = ImageDraw.Draw(sheet)
            sx, sy = (number % 4) * 220, ((number % 36) // 4) * 100
            sheet.paste(area, (sx, sy + 23))
            draw.text((sx + 4, sy + 4), f'{number + 1}  |  {start/FPS:.1f}–{(end+1)/FPS:.1f} s', fill='white')
            px, py = sx + x - left, sy + 23 + y - top
            draw.ellipse((px - 10, py - 10, px + 10, py + 10), outline='#26ed70', width=2)
            if number % 36 == 35 or number == len(entries) - 1:
                sheet.save(WORK / f'{tag}-audit-{number // 36 + 1}.jpg', quality=91)
        if process.wait():
            raise RuntimeError('Unable to extract reference frames')
    print(f'{tag}: {len(entries)} candidate hover intervals')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('tag')
    parser.add_argument('source', type=Path)
    args = parser.parse_args()
    audit(args.tag, args.source.resolve())
