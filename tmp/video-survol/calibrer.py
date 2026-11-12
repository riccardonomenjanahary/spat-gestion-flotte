from pathlib import Path
import numpy as np
from PIL import Image

root = Path(__file__).resolve().parents[1]
samples = [
    ('video-surete/final-01.png', 1063, 375),
    ('video-assistant/final-01.png', 553, 336),
    ('video-hors-ville/final-recadre-01.png', 777, 410),
]
patches = []
for path, x, y in samples:
    image = np.asarray(Image.open(root / path).convert('L'))
    patches.append(image[y-15:y+9, x-17:x+1])
patches = np.asarray(patches)
for row in patches.transpose(1, 0, 2):
    print(' | '.join(''.join('#' if p < 168 else 'o' if p < 220 else '.' for p in sample) for sample in row))
