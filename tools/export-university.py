"""Export the original university compositions as 16-pixel Tiled maps."""
from pathlib import Path
import json
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'src/assets/plaza-art'

def rectangle(name, box, **properties):
    x, y, width, height = box
    return dict(name=name, x=x, y=y, width=width, height=height, rotation=0, visible=True,
                properties=[dict(name=k, type='string', value=v) for k, v in properties.items()])

for name in ['outside', 'interior']:
    if name == 'outside':
        scene = Image.open(ROOT / 'tools/university-art/outside.png').convert('RGBA')
    else:
        palette = Image.open(ROOT / 'tools/university-art/outside.png').convert('RGB').quantize(colors=64)
        scene = Image.open(ROOT / 'tools/university-art/interior-workshop-source.png').convert('RGB')
        scene = scene.resize((384, 256), Image.Resampling.NEAREST)
        tabletop = Image.open(ROOT / 'tools/university-art/interior-tabletop-patch.png').convert('RGB')
        scene.paste(tabletop.resize((26, 14), Image.Resampling.NEAREST), (96, 173))
        scene = scene.quantize(palette=palette, dither=Image.Dither.NONE).convert('RGBA')
    assert scene.size == (384, 256)
    composition = scene.copy()
    pieces = []
    if name == 'interior':
        for item, box, clean in [('notebook', (122, 177, 132, 187), (119, 170, 129, 177)), ('sensor', (282, 184, 293, 192), (295, 184, 306, 192))]:
            piece = scene.crop(box)
            piece.save(OUT / f'{item}.png')
            scene.paste(scene.crop(clean).resize(piece.size, Image.Resampling.NEAREST), box[:2])
            pieces.append(rectangle(item, (box[0], box[1], piece.width, piece.height)))
    tiles, ids, indices = [], [], {}
    for y in range(0, 256, 16):
        for x in range(0, 384, 16):
            tile = scene.crop((x, y, x + 16, y + 16))
            pixels = tile.tobytes()
            if pixels not in indices:
                indices[pixels] = len(tiles) + 1
                tiles.append(tile)
            ids.append(indices[pixels])
    atlas = Image.new('RGBA', (256, ((len(tiles) + 15) // 16) * 16))
    for i, tile in enumerate(tiles):
        atlas.paste(tile, (i % 16 * 16, i // 16 * 16))
    atlas.save(OUT / f'{name}-tiles.png')
    tilesets = [dict(firstgid=1, name=f'{name}-terrain', image=f'{name}-tiles.png', imagewidth=atlas.width,
                    imageheight=atlas.height, tilewidth=16, tileheight=16, columns=16, tilecount=len(tiles), margin=0, spacing=0)]
    if pieces:
        tilesets.append(dict(firstgid=len(tiles) + 1, name='study-items', columns=0, objectalignment='topleft',
                             tilewidth=32, tileheight=32, tilecount=len(pieces), tiles=[
                                 dict(id=i, image=f'{p["name"]}.png', imagewidth=p['width'], imageheight=p['height']) for i, p in enumerate(pieces)]))
        for i, piece in enumerate(pieces):
            piece['gid'] = len(tiles) + 1 + i
    layers = [dict(name='ground', type='tilelayer', width=24, height=16, data=ids)]
    layers.append(dict(name='items', type='objectgroup', objects=pieces))
    if name == 'outside':
        obstacles = [rectangle(n, b) for n, b in [
            ('left-bed', (0, 128, 84, 10)), ('middle-bed', (121, 128, 104, 10)),
            ('left-garden', (0, 160, 62, 80)), ('bench', (319, 145, 65, 31)),
            ('right-garden', (310, 202, 74, 54)), ('bottom-left-garden', (0, 240, 90, 16)),
            ('bottom-garden', (128, 240, 96, 16)),
            ('lamp', (51, 187, 7, 18)), ('bicycle-rack', (229, 128, 33, 12))]]
        interactions = [rectangle('study', (88, 112, 32, 16)),
                        rectangle('university', (274, 112, 36, 16))]
        spawns = [rectangle('entry', (18, 150, 0, 0), facing='right'), rectangle('return', (104, 148, 0, 0), facing='down')]
        exits = [rectangle('plaza', (5, 142, 1, 18), facing='left')]
        blocked = [int(i // 24 < 8) for i in range(384)]
    else:
        obstacles = [rectangle(n, b) for n, b in [
            ('left-wall', (0, 100, 25, 156)), ('right-wall', (375, 100, 9, 156)),
            ('shelves', (25, 100, 54, 8)), ('reading-table', (76, 169, 59, 39)),
            ('reading-chair', (95, 188, 20, 28)),
            ('computer-table', (268, 93, 76, 32)), ('computer-stool', (296, 111, 16, 17)),
            ('robot-bench', (275, 181, 59, 35)), ('robot-arm', (290, 156, 32, 25)),
            ('welding-bench', (111, 113, 65, 42)), ('welding-arm', (138, 89, 35, 24)),
            ('tool-cart', (43, 125, 30, 41)), ('parts-rack', (232, 197, 36, 41))]]
        interactions = [rectangle('studyLamp', (76, 169, 22, 19)),
                        rectangle('paper', (98, 169, 19, 39)),
                        rectangle('paper', (76, 188, 22, 20)),
                        rectangle('paper', (95, 208, 20, 8)),
                        rectangle('notebook', (117, 169, 18, 39)),
                        rectangle('sensor', (275, 181, 15, 35)),
                        rectangle('robot', (290, 156, 32, 25)),
                        rectangle('robot', (290, 181, 44, 35)),
                        rectangle('computer', (268, 93, 76, 32)),
                        rectangle('computer', (296, 125, 16, 3)),
                        rectangle('board', (145, 84, 95, 12)),
                        rectangle('light', (19, 108, 6, 27)),
                        rectangle('welding', (111, 113, 65, 42)),
                        rectangle('welding', (138, 89, 35, 24)),
                        rectangle('tools', (43, 125, 30, 41)),
                        rectangle('parts', (232, 197, 36, 41))]
        spawns = [rectangle('entry', (192, 222, 0, 0), facing='up')]
        exits = [rectangle('outside', (160, 255, 64, 1), facing='down')]
        blocked = [int(i // 24 < 6) for i in range(384)]
    layers.extend([dict(name='blocked', type='tilelayer', width=24, height=16, data=blocked, visible=False),
                   dict(name='obstacles', type='objectgroup', objects=obstacles, visible=False),
                   dict(name='interactions', type='objectgroup', objects=interactions, visible=False),
                   dict(name='spawns', type='objectgroup', objects=spawns, visible=False),
                   dict(name='exits', type='objectgroup', objects=exits, visible=False)])
    object_id = 1
    for i, layer in enumerate(layers, 1):
        layer.update(id=i, x=0, y=0, opacity=1, visible=layer.get('visible', True))
        for obj in layer.get('objects', []):
            obj['id'] = object_id
            object_id += 1
    world = dict(type='map', version='1.10', orientation='orthogonal', renderorder='right-down', infinite=False,
                 width=24, height=16, tilewidth=16, tileheight=16, nextlayerid=len(layers) + 1, nextobjectid=object_id,
                 tilesets=tilesets, layers=layers)
    (OUT / f'{name}.tmj').write_text(json.dumps(world, indent=2) + '\n')
    proof = Image.new('RGBA', scene.size)
    for i, gid in enumerate(ids):
        proof.paste(tiles[gid - 1], (i % 24 * 16, i // 24 * 16))
    for piece in pieces:
        proof.alpha_composite(Image.open(OUT / f'{piece["name"]}.png'), (piece['x'], piece['y']))
    assert ImageChops.difference(proof, composition).getbbox(alpha_only=False) is None
    print(f'{name}: {len(tiles)} unique 16px tiles, 384 placements, reconstruction matches source pixels')
