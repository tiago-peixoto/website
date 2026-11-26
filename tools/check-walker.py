"""Check the shipped pixels, including regressions that erase either arm."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'src/assets/plaza-art'
layout = json.loads((ROOT / 'tools/walker-art/model-layout.json').read_text())
colors = {tuple(bytes.fromhex(c[1:])) for c in layout['palette']}
skin = {tuple(bytes.fromhex(c)) for c in ['986148', 'bf855c', 'e0a775', 'f7c58b', 'ffe0a6']}
shoe = {tuple(bytes.fromhex(c)) for c in ['c1b8b5', 'e5d5c2', 'fff1d3', 'ffe0a6', 'f7c58b']}
model = Image.open(ART / 'model-sheet.png').convert('RGBA')
sheet = Image.open(ART / 'walker-grounded.png').convert('RGBA')
assert sheet.size == (544, 192)


def arm_region(side):
    return [(x, y) for y in range(20, 35) for x in range(side * 16, (side + 1) * 16)
            if y >= 23 or x < 13 or x > 18]


def count(frame, region, palette=None):
    return sum(frame.getpixel(p)[3] == 255 and (palette is None or frame.getpixel(p)[:3] in palette)
               for p in region)


def check_limbs(frame, minimum):
    arms = [count(frame, arm_region(side), skin) for side in range(2)]
    assert min(arms) >= minimum, f'vanished or unreadable arm: {arms}'
    legs = [count(frame, [(x, y) for y in range(33, 44) for x in range(side * 16, (side + 1) * 16)])
            for side in range(2)]
    assert min(legs) >= 5, f'vanished leg: {legs}'
    shoes = count(frame, [(x, y) for y in range(30, 44) for x in range(32)], shoe)
    assert shoes >= 5, f'vanished shoes: {shoes}'
    return {'arms': arms, 'legs': legs, 'shoes': shoes}


results = []
mutations = 0
for row, direction in enumerate(layout['directions']):
    for name, start, bob, minimum in [
        ('walk', 1, [0, 1, 0, -1, 0, 1, 0, -1], 2),
        ('run', 9, [0, 1, -1, -2, 0, 1, -1, -2], 6),
    ]:
        frames = []
        for i, offset in enumerate(bob):
            frame = sheet.crop(((start + i) * 32, row * 48, (start + i + 1) * 32, (row + 1) * 48))
            label = f'{direction} {name} {i + 1}'
            try:
                metrics = check_limbs(frame, minimum)
                expected = Image.new('RGBA', (32, 48))
                expected.paste(model.crop((row * 32, 0, row * 32 + 32, 20)), (0, offset))
                assert frame.crop((0, 0, 32, 20 + offset)).tobytes() == expected.crop((0, 0, 32, 20 + offset)).tobytes(), 'head changed'
                assert all(pixel[3] in (0, 255) and (not pixel[3] or pixel[:3] in colors)
                           for _, pixel in frame.getcolors()), 'palette or alpha drift'
                bounds = frame.getbbox()
                assert bounds[0] > 0 and bounds[2] < 32 and bounds[3] <= 44, 'clipped silhouette'
                silhouette = {(x, y) for y in range(48) for x in range(32) if frame.getpixel((x, y))[3]}
                pending = [silhouette.pop()]
                while pending:
                    x, y = pending.pop()
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            neighbor = (x + dx, y + dy)
                            if neighbor in silhouette:
                                silhouette.remove(neighbor)
                                pending.append(neighbor)
                assert not silhouette, 'detached body part or stray outline pixel'
                opaque = sum(n for n, a in frame.getchannel('A').getcolors() if a)
                assert 230 <= opaque <= 550, f'broken silhouette: {opaque}'
                for side in range(2):
                    broken = frame.copy()
                    for p in arm_region(side):
                        if broken.getpixel(p)[:3] in skin:
                            broken.putpixel(p, (0, 0, 0, 0))
                    try:
                        check_limbs(broken, minimum)
                    except AssertionError:
                        mutations += 1
                    else:
                        raise AssertionError(f'arm deletion escaped detection: {side}')
            except AssertionError as error:
                raise AssertionError(f'{label}: {error}') from error
            results.append({'frame': label, **metrics, 'opaque': opaque})
            frames.append(frame.tobytes())
        assert len(set(frames)) == 8, f'{direction} {name}: duplicate poses'
assert mutations == 128
print(f'ok: {len(results)} frames, locked heads, both arms and legs, shoes, palette, bounds; {mutations} arm-deletion regressions rejected')
if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1:
        Path(sys.argv[1]).write_text(json.dumps(results, indent=2) + '\n')
