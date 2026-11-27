"""Apply the fourth review's bounded edits to the original ImageGen artwork."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'src/assets/plaza-art'
SOURCE = ROOT / 'tools/walker-art'
old = json.loads((SOURCE / 'model-layout.json').read_text())
round2 = Image.open(SOURCE / 'round-2-sheet.png').convert('RGBA')
round3 = Image.open(SOURCE / 'round-3-sheet.png').convert('RGBA')
sheet = round3.copy()
palette = Image.new('P', (1, 1))
colors = [tuple(bytes.fromhex(color[1:])) for color in old['palette']]
palette.putpalette([channel for color in colors for channel in color] * 8)
face = Image.open(SOURCE / 'face-v4-source.png').convert('RGBA').resize((32, 48), Image.Resampling.NEAREST)
alpha = face.getchannel('A').point(lambda a: 255 if a >= 192 else 0)
face = face.convert('RGB').quantize(palette=palette, dither=Image.Dither.NONE).convert('RGBA')
face.putalpha(alpha)


def frame(source, row, column):
    return source.crop((column * 32, row * 48, (column + 1) * 32, (row + 1) * 48))


for i, bob in enumerate([0, 1, 0, -1] * 2):
    down = frame(round2, 0, i + 1)
    # Mask the generated edit so every pixel outside the named eye and chin stays round 2.
    for box in [(17, 14, 19, 15), (13, 18, 19, 20)]:
        down.paste(face.crop(box), (box[0], box[1] + bob))
    sheet.paste(down, ((i + 1) * 32, 0))
    sheet.paste(frame(round2, 3, i + 1), ((i + 1) * 32, 144))

# Reverse time, not facing: the planted foot must travel opposite the body's direction.
for row in (1, 2):
    for i, source_index in enumerate([0, 7, 6, 5, 4, 3, 2, 1]):
        sheet.paste(frame(round3, row, source_index + 1), ((i + 1) * 32, row * 48))

for i, bob in enumerate([0, 1, -1, -2] * 2):
    down = frame(round3, 0, i + 9)
    # Resample the existing body to retain all eight poses instead of replacing them with regenerated poses.
    body = down.crop((0, 20 + bob, 32, 32 + bob)).resize((28, 12), Image.Resampling.NEAREST)
    down.paste(Image.new('RGBA', (32, 12)), (0, 20 + bob))
    down.paste(body, (2, 20 + bob))
    down.paste(round2.crop((0, 0, 32, 20)), (0, bob))
    sheet.paste(down, ((i + 9) * 32, 0))

sheet.save(ART / 'walker-grounded.png')
layout = {
    'generatedBy': 'python3 tools/export-walker.py',
    'cell': [32, 48], 'columns': 17, 'directions': old['directions'],
    'cycles': {
        'walk': {'start': 1, 'end': 8, 'frameRate': 12, 'speed': 60},
        'run': {'start': 9, 'end': 16, 'frameRate': 16, 'speed': 102},
    },
}
(ART / 'walker-motion.json').write_text(json.dumps(layout, indent=2) + '\n')
print('Packed 64 poses with cycle-specific round-4 edits.')
