"""Collected items must reveal empty tabletop, not a painted duplicate."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'src/assets/plaza-art'
SOURCE = ROOT / 'tools/university-art'
world = json.loads((ART / 'interior.tmj').read_text())
atlas = Image.open(ART / 'interior-tiles.png').convert('RGBA')
ground = Image.new('RGBA', (384, 256))
for i, gid in enumerate(world['layers'][0]['data']):
    tile = gid - 1
    x, y = tile % 16 * 16, tile // 16 * 16
    ground.paste(atlas.crop((x, y, x + 16, y + 16)), (i % 24 * 16, i // 24 * 16))

palette = Image.open(SOURCE / 'outside.png').convert('RGB').quantize(colors=64)
original = Image.open(SOURCE / 'interior-workshop-source.png').convert('RGB').resize((384, 256), Image.Resampling.NEAREST)
original = original.quantize(palette=palette, dither=Image.Dither.NONE).convert('RGBA')
book_box = (96, 173, 122, 187)
patch = Image.open(SOURCE / 'interior-tabletop-patch.png').convert('RGB').resize((26, 14), Image.Resampling.NEAREST)
patch = patch.quantize(palette=palette, dither=Image.Dither.NONE).convert('RGBA')
assert ground.crop(book_box).tobytes() == patch.tobytes(), 'painted open-book duplicate remains after pickup'

expected = original.copy()
expected.paste(patch, book_box[:2])
for name, box, clean in [
    ('notebook', (122, 177, 132, 187), (119, 170, 129, 177)),
    ('sensor', (282, 184, 293, 192), (295, 184, 306, 192)),
]:
    empty = expected.crop(clean).resize((box[2] - box[0], box[3] - box[1]), Image.Resampling.NEAREST)
    assert ground.crop(box).tobytes() == empty.tobytes(), f'{name}: painted item remains after pickup'

composition = ground.copy()
for item in world['layers'][1]['objects']:
    composition.alpha_composite(Image.open(ART / f'{item["name"]}.png'), (item['x'], item['y']))
assert composition.tobytes() == expected.tobytes(), 'room pixels changed outside the removed open book'
print('ok: no painted notebook or sensor duplicates; all other room pixels unchanged')
