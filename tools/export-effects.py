"""Reduce the generated effect atlas to sprites using the approved palette."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
source = Image.open(ROOT / 'tools/university-art/effects-source.png').convert('RGBA')
colors = sorted(color for _, color in Image.open(ROOT / 'tools/university-art/outside.png').convert('RGB').getcolors())
assert len(colors) == 64
palette = Image.new('P', (1, 1))
palette.putpalette([channel for color in colors for channel in color] * 4)
w, h = source.size
for name, cell, size in [
    ('lamp-glow', (0, 0), (32, 32)), ('lamp-pool', (0, 0), (48, 16)),
    ('fish', (1, 0), (18, 14)), ('door-light', (0, 1), (64, 48)), ('splash', (1, 1), (28, 12)),
]:
    x, y = cell
    sprite = source.crop((x * w // 2, y * h // 2, (x + 1) * w // 2, (y + 1) * h // 2))
    # Near-transparent generator speckles must not shrink the light away from the doorway.
    bounds = sprite.getchannel('A').point(lambda alpha: 255 if alpha > 32 else 0).getbbox()
    sprite = sprite.crop(bounds).resize(size, Image.Resampling.NEAREST)
    result = sprite.convert('RGB').quantize(palette=palette, dither=Image.Dither.NONE).convert('RGBA')
    result.putalpha(sprite.getchannel('A'))
    result.save(ROOT / f'src/assets/plaza-art/{name}.png')
    print(f'{name}: {size[0]}x{size[1]}, generated alpha preserved')
