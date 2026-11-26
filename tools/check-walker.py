"""Check exported anatomy and reject pixel mutations for the review's named defects."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'src/assets/plaza-art'
layout = json.loads((ROOT / 'tools/walker-art/model-layout.json').read_text())
colors = {tuple(bytes.fromhex(c[1:])) for c in layout['palette']}
model = Image.open(ART / 'model-sheet.png').convert('RGBA')

def palette(values):
    return {tuple(bytes.fromhex(c)) for c in values.split()}

skin = palette('714a3c 986148 bf855c e0a775 f7c58b ffe0a6 845537 ac7349 cf925e f1b77a')
shirt = palette('412533 612a40 81354d a34c60 bf6a73 de8890')
shoe = palette('c1b8b5 e5d5c2 fff1d3 ffe0a6 f7c58b f1b77a e0a775')
eye = palette('211d2a 342233')


def points(frame, box, colors=None):
    x0, y0, x1, y1 = box
    return [(x, y) for y in range(y0, y1) for x in range(x0, x1)
            if frame.getpixel((x, y))[3] and
            (colors is None or frame.getpixel((x, y))[:3] in colors)]


def centroid(pixels):
    assert pixels, 'missing pixels'
    return tuple(sum(p[axis] for p in pixels) / len(pixels) for axis in (0, 1))


def anatomy(frame, row, gait):
    arms = [points(frame, (side * 16, 22, (side + 1) * 16, 35), skin) for side in range(2)]
    minimum = 4 if gait == 'run' else 2
    assert all(minimum <= len(arm) <= 32 for arm in arms), f'arm area outside {minimum}..32: {[len(a) for a in arms]}'
    arm_pixels = arms[0] + arms[1]
    arm_span = max(x for x, y in arm_pixels) - min(x for x, y in arm_pixels)
    if gait == 'run' and row in (1, 2):
        assert arm_span <= 16, f'oversized profile arm reach: {arm_span}'
    if gait == 'run' and row == 3:
        assert max(map(len, arms)) <= 21, f'oversized back arm: {[len(a) for a in arms]}'
    legs = [points(frame, (side * 16, 33, (side + 1) * 16, 44)) for side in range(2)]
    assert all(len(leg) >= 5 for leg in legs), 'missing lower leg'
    assert len(points(frame, (0, 30, 32, 44), shoe)) >= 5, 'missing shoes'
    shoulders = points(frame, (0, 21, 32, 25), shirt)
    width = max(x for x, y in shoulders) - min(x for x, y in shoulders) + 1
    if row in (0, 3):
        assert 14 <= width <= 17, f'shoulder width outside 14..17: {width}'
    torso = len(points(frame, (12, 22, 20, 31)))
    if gait == 'run' and row in (1, 2):
        assert torso >= 60, f'thin torso: {torso} central pixels'
    if row == 0:
        pupils = [points(frame, box, eye) for box in [(12, 13, 16, 15), (16, 13, 20, 15)]]
        assert all(len(p) >= 4 for p in pupils), f'blank eye: {[len(p) for p in pupils]}'
        assert abs(centroid(pupils[0])[1] - centroid(pupils[1])[1]) <= 0.5, 'uneven eyes'
        widths = [len(points(frame, (8, y, 24, y + 1))) for y in (15, 16, 17, 18)]
        assert 10 <= widths[0] <= 12 and widths[0] > widths[1] > widths[2] > widths[3] >= 2, f'broken jaw taper: {widths}'
    return {'arms': [len(a) for a in arms], 'shoulders': width, 'torso': torso, 'armSpan': arm_span}


def cycle_motion(frames, row, gait):
    if row in (1, 2) and gait == 'walk':
        # The nearer arm has more exposed skin than the far hand in each contact pose.
        contacts = []
        for frame in (frames[0], frames[4]):
            arms = [points(frame, (side * 16, 22, (side + 1) * 16, 35), skin) for side in range(2)]
            contacts.append(centroid(max(arms, key=len))[0])
        delta = contacts[1] - contacts[0]
        assert delta * (1 if row == 1 else -1) >= 6, f'near arm does not swing front to back: {delta}'
    if gait == 'run':
        masks = [frozenset(points(f, (0, 33, 32, 44))) for f in frames]
        assert all(len(masks[i] ^ masks[(i + 1) % 8]) >= 4 for i in range(8)), 'run legs remain stationary between frames'
        if row == 3:
            heights = []
            for frame in frames:
                feet = [points(frame, (side * 16, 33, (side + 1) * 16, 44), shoe) for side in range(2)]
                heights.append(centroid(feet[0])[1] - centroid(feet[1])[1])
            assert all(abs(h) >= 1 for h in heights), f'run feet lack depth offset: {heights}'
            assert all(heights[i] * heights[i + 4] < 0 for i in range(4)), 'up run repeats the same planted leg'


def reject(check, label):
    try:
        check()
    except AssertionError:
        return 1
    raise AssertionError(f'{label} mutation escaped detection')


def validate(sheet):
    assert sheet.size == (544, 192)
    results, mutations = [], 0
    for row, direction in enumerate(layout['directions']):
        for gait, start, bob in [('walk', 1, [0, 1, 0, -1] * 2), ('run', 9, [0, 1, -1, -2] * 2)]:
            frames, raw_frames = [], []
            head = model.crop((row * 32, 0, row * 32 + 32, 20)) if row else sheet.crop((0, 0, 32, 20))
            for i, offset in enumerate(bob):
                frame = sheet.crop(((start + i) * 32, row * 48, (start + i + 1) * 32, (row + 1) * 48))
                raw_frames.append(frame.tobytes())
                label = f'{direction} {gait} {i + 1}'
                assert all(p[3] in (0, 255) and (not p[3] or p[:3] in colors) for _, p in frame.getcolors()), label + ': palette or alpha drift'
                bounds = frame.getbbox()
                assert 0 < bounds[0] < bounds[2] < 32 and bounds[3] <= 45, label + ': clipped silhouette'
                normalized = Image.new('RGBA', (32, 48))
                normalized.paste(frame, (0, -offset))
                assert normalized.crop((0, 4, 32, 20)).tobytes() == head.crop((0, 4, 32, 20)).tobytes(), label + ': unstable head'
                silhouette = set(points(normalized, (0, 0, 32, 48)))
                assert 230 <= len(silhouette) <= 550, label + ': broken silhouette mass'
                remaining = silhouette.copy()
                pending = [remaining.pop()]
                while pending:
                    x, y = pending.pop()
                    for dx in (-1, 0, 1):
                        for dy in (-1, 0, 1):
                            p = x + dx, y + dy
                            if p in remaining:
                                remaining.remove(p)
                                pending.append(p)
                assert not remaining, label + ': detached pixels'
                try:
                    metrics = anatomy(normalized, row, gait)
                except AssertionError as error:
                    raise AssertionError(f'{label}: {error}') from error
                for side in range(2):
                    broken = normalized.copy()
                    for p in points(broken, (side * 16, 22, (side + 1) * 16, 35), skin):
                        broken.putpixel(p, (0, 0, 0, 0))
                    mutations += reject(lambda: anatomy(broken, row, gait), label + ' erased arm')
                broken = normalized.copy()
                for y in range(23, 32):
                    for x in range(5, 11):
                        broken.putpixel((x, y), (224, 167, 117, 255))
                mutations += reject(lambda: anatomy(broken, row, gait), label + ' oversized arm')
                if row in (0, 3):
                    broken = normalized.copy()
                    for p in points(broken, (0, 21, 32, 25), shirt):
                        if p[0] < 11 or p[0] > 20:
                            broken.putpixel(p, (0, 0, 0, 0))
                    mutations += reject(lambda: anatomy(broken, row, gait), label + ' narrow shoulders')
                if row == 0:
                    for box in [(12, 13, 16, 15), (16, 13, 20, 15)]:
                        broken = normalized.copy()
                        for p in points(broken, box, eye):
                            broken.putpixel(p, (224, 167, 117, 255))
                        mutations += reject(lambda: anatomy(broken, row, gait), label + ' blank eye')
                    broken = normalized.copy()
                    for x in range(10, 22):
                        broken.putpixel((x, 18), (224, 167, 117, 255))
                    mutations += reject(lambda: anatomy(broken, row, gait), label + ' rectangular jaw')
                if gait == 'run' and row in (1, 2):
                    broken = normalized.copy()
                    for y in range(22, 31):
                        for x in (12, 13, 18, 19):
                            broken.putpixel((x, y), (0, 0, 0, 0))
                    mutations += reject(lambda: anatomy(broken, row, gait), label + ' thin torso')
                results.append({'frame': label, **metrics})
                frames.append(normalized)
            assert len(set(raw_frames)) == 8, f'{direction} {gait}: duplicate poses'
            cycle_motion(frames, row, gait)
            if row in (1, 2) and gait == 'walk':
                broken = [f.copy() for f in frames]
                broken[4].paste(frames[0].crop((0, 22, 32, 35)), (0, 22))
                mutations += reject(lambda: cycle_motion(broken, row, gait), direction + ' fixed arm')
            if gait == 'run':
                broken = [f.copy() for f in frames]
                for f in broken:
                    f.paste(frames[0].crop((0, 33, 32, 44)), (0, 33))
                mutations += reject(lambda: cycle_motion(broken, row, gait), direction + ' stationary legs')
    return results, mutations


if __name__ == '__main__':
    import sys
    sheet = Image.open(ART / 'walker-grounded.png').convert('RGBA')
    results, mutations = validate(sheet)
    print(f'ok: {len(results)} frames, eyes, jaw, shoulders, arm areas, side swing, torso, run legs, palette and connected silhouettes; {mutations} defect mutations rejected')
    if len(sys.argv) > 1:
        Path(sys.argv[1]).write_text(json.dumps(results, indent=2) + '\n')
