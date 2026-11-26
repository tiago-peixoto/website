"""Pack generated limb poses with the approved model and palette. Requires Pillow."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'src/assets/plaza-art'
SOURCE = ROOT / 'tools/walker-art'
old = json.loads((ART / 'walker-layout.json').read_text())
model = Image.open(ART / 'model-sheet.png').convert('RGBA')
palette = Image.new('P', (1, 1))
colors = [tuple(bytes.fromhex(color[1:])) for color in old['palette']]
palette.putpalette([channel for color in colors for channel in color] * 8)
cycles = {}

for name, bob in [('grounded', [0, 1, 0, -1, 0, 1, 0, -1]),
                  ('lively', [0, 1, -1, -2, 0, 1, -1, -2]),
                  ('run', [0, 1, -1, -2, 0, 1, -1, -2])]:
    source = Image.open(SOURCE / f'{name}-source.png').convert('RGBA')
    frames = []
    for row in range(4):
        for column in range(8):
            cell = source.crop((column * source.width // 8, row * source.height // 4,
                                (column + 1) * source.width // 8, (row + 1) * source.height // 4))
            bounds = cell.getchannel('A').point(lambda alpha: 255 if alpha >= 192 else 0).getbbox()
            assert bounds, (name, row, column)
            cell = cell.crop(bounds)
            # Register the head, rather than the swinging feet, to avoid sideways jitter.
            head = cell.crop((0, 0, cell.width, cell.height * 2 // 5)).getchannel('A').getbbox()
            scale = 40 / cell.height
            center = (head[0] + head[2]) / 2
            pose = Image.new('RGBA', (32, 48))
            small = cell.resize((round(cell.width * scale), 40), Image.Resampling.NEAREST)
            small = small.convert('RGB').quantize(palette=palette, dither=Image.Dither.NONE).convert('RGBA')
            small.putalpha(cell.resize(small.size, Image.Resampling.NEAREST).getchannel('A').point(lambda a: 255 if a >= 192 else 0))
            pose.paste(small, (round(16 - center * scale), 4))
            offset = bob[column]
            frame = Image.new('RGBA', (32, 48))
            legs = pose.crop((0, 24, 32, 44)).resize((32, 20 - offset), Image.Resampling.NEAREST)
            frame.paste(legs, (0, 24 + offset))
            frame.paste(model.crop((row * 32, 0, row * 32 + 32, 24)), (0, offset))
            if name == 'run' and column in (3, 7):
                airborne = Image.new('RGBA', (32, 48))
                airborne.paste(frame, (0, -1))
                frame = airborne
            assert frame.getbbox()[2] < 32 and frame.getbbox()[3] <= 44
            assert all(a in (0, 255) for _, a in frame.getchannel('A').getcolors())
            assert all(pixel[:3] in colors for _, pixel in frame.getcolors() if pixel[3])
            frames.append(frame)
        assert len({frame.tobytes() for frame in frames[-8:]}) == 8, f'{name}: eight distinct {old["directions"][row]} poses'
    cycles[name] = frames

for name in ('grounded', 'lively'):
    sheet = Image.new('RGBA', (17 * 32, 4 * 48))
    for row in range(4):
        sheet.paste(model.crop((row * 32, 0, (row + 1) * 32, 48)), (0, row * 48))
        for column in range(8):
            sheet.paste(cycles[name][row * 8 + column], ((column + 1) * 32, row * 48))
            sheet.paste(cycles['run'][row * 8 + column], ((column + 9) * 32, row * 48))
    destination = ART / 'walker-grounded.png' if name == 'grounded' else SOURCE / 'lively-sheet.png'
    sheet.save(destination)
    print(f'{destination.relative_to(ROOT)}: {sheet.size}, 8 unique walk and run frames per direction')

layout = {
    'generatedBy': 'python3 tools/export-walker.py',
    'cell': [32, 48], 'columns': 17, 'directions': old['directions'],
    'cycles': {
        'walk': {'start': 1, 'end': 8, 'frameRate': 12, 'speed': 60},
        'run': {'start': 9, 'end': 16, 'frameRate': 16, 'speed': 102},
    },
    'lockedRows': [0, 24],
    'method': 'Original ImageGen limb poses, nearest-neighbor export to the approved palette. Locked model head and shoulders retain their pixels, translated for weight transfer.',
}
(ART / 'walker-motion.json').write_text(json.dumps(layout, indent=2) + '\n')
