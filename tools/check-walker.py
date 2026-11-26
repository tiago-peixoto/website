"""Check exported anatomy and reject pixel mutations for the review's named defects."""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ART = ROOT / 'src/assets/plaza-art'
layout = json.loads((ROOT / 'tools/walker-art/model-layout.json').read_text())
colors = {tuple(bytes.fromhex(c[1:])) for c in layout['palette']}
model = Image.open(ART / 'model-sheet.png').convert('RGBA')
round2 = Image.open(ROOT / 'tools/walker-art/round-2-sheet.png').convert('RGBA')
round3 = Image.open(ROOT / 'tools/walker-art/round-3-sheet.png').convert('RGBA')

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
        minimum_width = 11 if gait == 'walk' else (13 if row == 0 else 14)
        assert minimum_width <= width <= 17, f'shoulder width outside {minimum_width}..17: {width}'
    torso = len(points(frame, (12, 22, 20, 31)))
    if gait == 'run' and row in (1, 2):
        assert torso >= 60, f'thin torso: {torso} central pixels'
    if row == 0 and gait == 'walk':
        pupils = [points(frame, box, eye) for box in [(13, 14, 16, 15), (17, 14, 20, 15)]]
        assert all(len(p) >= 1 for p in pupils), f'blank eye: {[len(p) for p in pupils]}'
        assert abs(centroid(pupils[0])[1] - centroid(pupils[1])[1]) <= 0.5, 'uneven eyes'
        widths = [len(points(frame, (8, y, 24, y + 1))) for y in (15, 16, 17, 18)]
        assert 10 <= widths[0] <= 12 and widths[0] >= widths[1] > widths[2] > widths[3] >= 2, f'broken jaw taper: {widths}'
    return {'arms': [len(a) for a in arms], 'shoulders': width, 'torso': torso, 'armSpan': arm_span}


def walk_direction(frames, row):
    # With screen y increasing downward, a forward left step traces a negative shoe orbit.
    feet = [centroid(points(f, (0, 33, 32, 44), shoe)) for f in frames]
    orbit = sum(a[0] * b[1] - b[0] * a[1]
                for a, b in zip(feet, feet[1:] + feet[:1])) / 2
    assert orbit * (-1 if row == 1 else 1) >= 4, f'walk runs backwards relative to facing: orbit={orbit}'


def cycle_motion(frames, row, gait):
    if row in (1, 2) and gait == 'walk':
        walk_direction(frames, row)
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


def preserved_pixels(sheet):
    for row in range(4):
        box = (0, row * 48, 32, (row + 1) * 48)
        assert sheet.crop(box).tobytes() == round3.crop(box).tobytes(), 'idle pose changed'
        for gait, start in [('walk', 1), ('run', 9)]:
            for i in range(8):
                box = ((start + i) * 32, row * 48, (start + i + 1) * 32, (row + 1) * 48)
                actual = sheet.crop(box)
                if (gait == 'run' and row != 0) or (gait == 'walk' and row == 3):
                    expected = (round3 if gait == 'run' else round2).crop(box)
                    assert actual.tobytes() == expected.tobytes(), f'{row} {gait}: approved frame {i+1} changed'
                if row == 0 and gait == 'run':
                    bob = [0, 1, -1, -2][i % 4]
                    legs = (0, 32 + bob, 32, 48)
                    assert actual.crop(legs).tobytes() == round3.crop(box).crop(legs).tobytes(), 'down run legs changed'
                    shoulders = (0, 21 + bob, 32, 25 + bob)
                    def width(image):
                        pixels = points(image, shoulders, shirt)
                        return max(x for x, y in pixels) - min(x for x, y in pixels) + 1
                    assert 1 <= width(round3.crop(box)) - width(actual) <= 3, 'down run torso must be slightly thinner'
                if row == 0 and gait == 'walk':
                    expected = round2.crop(box)
                    bob = [0, 1, 0, -1][i % 4]
                    for patch in [(17, 14 + bob, 19, 15 + bob), (13, 18 + bob, 19, 20 + bob)]:
                        actual.paste(expected.crop(patch), patch[:2])
                    assert actual.tobytes() == expected.tobytes(), 'down walk changed outside left eye/chin'
            if row in (1, 2) and gait == 'walk':
                def poses(source):
                    return sorted(source.crop((col * 32, row * 48, (col + 1) * 32, (row + 1) * 48)).tobytes()
                                  for col in range(1, 9))
                assert poses(sheet) == poses(round3), 'profile walk art changed beyond frame order'


def validate(sheet):
    assert sheet.size == (544, 192)
    preserved_pixels(sheet)
    results, mutations = [], 0
    for column, row, label in [(1, 0, 'down walk body'), (1, 3, 'up walk'), (9, 1, 'left run'), (9, 2, 'right run'), (9, 3, 'up run'), (0, 0, 'idle')]:
        broken = sheet.copy()
        broken.putpixel((column * 32 + 16, row * 48 + 25), (255, 0, 0, 255))
        mutations += reject(lambda: preserved_pixels(broken), label + ' changed outside scope')
    for column in range(9, 17):
        broken = sheet.copy()
        box = (column * 32, 0, (column + 1) * 32, 48)
        broken.paste(round3.crop(box), box[:2])
        mutations += reject(lambda: preserved_pixels(broken), 'wide down run')
    for row, direction in enumerate(layout['directions']):
        for gait, start, bob in [('walk', 1, [0, 1, 0, -1] * 2), ('run', 9, [0, 1, -1, -2] * 2)]:
            if gait == 'walk' and row in (1, 2):
                bob = [0, -1, 0, 1] * 2
            frames, raw_frames = [], []
            head = model.crop((row * 32, 0, row * 32 + 32, 20))
            if row == 0:
                head = sheet.crop((32, 0, 64, 20)) if gait == 'walk' else round2.crop((0, 0, 32, 20))
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
                if row == 0 and gait == 'walk':
                    for box in [(13, 14, 16, 15), (17, 14, 20, 15)]:
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
                for shift in range(8):
                    rotated = frames[shift:] + frames[:shift]
                    walk_direction(rotated, row)
                    mutations += reject(lambda: walk_direction(rotated[::-1], row), direction + ' backwards walk')
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
