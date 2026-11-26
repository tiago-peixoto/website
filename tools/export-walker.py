"""Pack corrected ImageGen poses with consistent directional heads. Requires Pillow."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'src/assets/plaza-art'
SOURCE = ROOT / 'tools/walker-art'
old = json.loads((SOURCE / 'model-layout.json').read_text())
model = Image.open(ART / 'model-sheet.png').convert('RGBA')
palette = Image.new('P', (1, 1))
colors = [tuple(bytes.fromhex(color[1:])) for color in old['palette']]
palette.putpalette([channel for color in colors for channel in color] * 8)
sheet = Image.new('RGBA', (17 * 32, 4 * 48))
for row in range(4):
    sheet.paste(model.crop((row * 32, 0, (row + 1) * 32, 48)), (0, row * 48))


def quantized(image):
    alpha = image.getchannel('A')
    result = image.convert('RGB').quantize(palette=palette, dither=Image.Dither.NONE).convert('RGBA')
    result.putalpha(alpha)
    return result


heads = [model.crop((row * 32, 0, row * 32 + 32, 20)) for row in range(4)]
face = Image.open(SOURCE / 'face-v3-source.png').convert('RGBA')
face.putalpha(face.getchannel('A').point(lambda a: 255 if a >= 192 else 0))
face = face.crop(face.getbbox())
face = quantized(face.resize((16, 16), Image.Resampling.NEAREST))
heads[0] = Image.new('RGBA', (32, 20))
heads[0].paste(face, (8, 4))
sheet.paste(heads[0], (0, 0))

for name, start, neck, bob in [
    ('walk-v3', 1, 0.40, [0, 1, 0, -1, 0, 1, 0, -1]),
    ('run-v3', 9, 0.39, [0, 1, -1, -2, 0, 1, -1, -2]),
]:
    source = Image.open(SOURCE / f'{name}-source.png').convert('RGBA')
    for row in range(4):
        frames = []
        for column in range(8):
            source_column = column % 4 if row in (0, 3) else column
            # The generated fourth profile pose hides the far hand behind the torso.
            if name == 'walk-v3' and row in (1, 2) and column == 3:
                source_column = 4
            source_row = 1 if row == 2 else row
            cell = source.crop((source_column * source.width // 8, source_row * source.height // 4,
                                (source_column + 1) * source.width // 8, (source_row + 1) * source.height // 4))
            cell.putalpha(cell.getchannel('A').point(lambda a: 255 if a >= 192 else 0))
            cell = cell.crop(cell.getbbox())
            neck_y = round(cell.height * neck)
            head = cell.crop((0, 0, cell.width, neck_y)).getbbox()
            center = (head[0] + head[2]) / 2
            scale = min(16 / (head[2] - head[0]), 14 / max(center, cell.width - center))
            offset = bob[column]
            body = cell.crop((0, neck_y, cell.width, cell.height)).resize(
                (round(cell.width * scale), 24), Image.Resampling.NEAREST)
            body = quantized(body)
            frame = Image.new('RGBA', (32, 48))
            frame.paste(body, (round(16 - center * scale), 20 + offset))
            if row == 2 or (row in (0, 3) and column >= 4):
                frame = frame.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            # Keep each directional identity stable without covering the generated shoulders.
            frame.paste(heads[row], (0, offset))
            assert frame.getbbox()[0] > 0 and frame.getbbox()[2] < 32
            assert frame.getbbox()[3] <= 45
            assert all(a in (0, 255) for _, a in frame.getchannel('A').getcolors())
            assert all(pixel[:3] in colors for _, pixel in frame.getcolors() if pixel[3])
            frames.append(frame)
            sheet.paste(frame, ((start + column) * 32, row * 48))
        assert len({frame.tobytes() for frame in frames}) == 8, (name, row)
sheet.save(ART / 'walker-grounded.png')
layout = {
    'generatedBy': 'python3 tools/export-walker.py',
    'cell': [32, 48], 'columns': 17, 'directions': old['directions'],
    'cycles': {
        'walk': {'start': 1, 'end': 8, 'frameRate': 12, 'speed': 60},
        'run': {'start': 9, 'end': 16, 'frameRate': 16, 'speed': 102},
    },
    'lockedRows': [0, 20],
    'method': 'Original ImageGen v3 bodies and corrected front face. Profile bodies mirror for consistent proportions; front and back half cycles mirror for alternating limbs. Directional heads remain stable. Nearest-neighbor palette export.',
}
(ART / 'walker-motion.json').write_text(json.dumps(layout, indent=2) + '\n')
print('Packed 64 corrected poses with stable directional heads.')
