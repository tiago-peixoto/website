# tiagop.dev.br

The personal site of Tiago Peixoto.
It is a static site built with [Eleventy](https://www.11ty.dev).

## Commands

- `npm start` serves the site at http://localhost:8080 and reloads on save.
- `npm test` builds the site and checks internal links, battle rules, all three maps, interaction reachability, viewport coverage, and both languages.

## Plaza preview

Open `/play/` or `/pt/play/` after `npm start`.
The portfolio and game share the confirmed degree wording in `src/_data/university.json`.
The intro and directory work before the game loads.
Only “Enter the plaza” loads Phaser, the Tiled maps, and the artwork.
Without JavaScript, the directory and regular portfolio links remain available.
If loading fails, the entry button offers another attempt.

Use arrows or WASD to walk, or hold a direction button on a touch screen.
Face the university door and press Enter or Space to enter the university courtyard.
The left entrance leads into one engineering study room.
Face an object and press Enter or Space, or use the interaction button beside the direction controls.
Read the paper, switch the room lights, collect the notebook and sensor, and inspect the robot, computer and math board.
The paper and computer reuse published portfolio text.
The robot gripper and math calculation are small imagined demonstrations, not claims about a real laboratory.
The inventory lasts while the page remains open, including travel between areas.
It has no save, scoring or quest system.
Escape closes the panel or moves focus outside the game.
Tab reaches the links normally.
Every interaction is also available in the HTML directory before the engine loads.
Once play starts, the directory can visit any of the three areas without walking.
Reduced motion pauses the water and walking animation, including when the preference changes during play.
The canvas fills the browser viewport beneath the interface.
The camera uses the smallest whole-number zoom that covers both viewport dimensions, and follows the walker within the map bounds.
This keeps the approved native 384 by 256 artwork sharp without empty bands or fractional scaling.
Narrow windows show less of the map at once, and the camera follows movement to reveal the rest.
The courtyard tree becomes partly transparent when it covers the walker.

`src/assets/plaza-art/` contains the approved round-two courtyard and the approved university compositions.
These are invented settings inspired by UFSC, not reconstructions of its buildings or laboratories.
`courtyard.tmj` supplies the terrain, objects, ground-contact depths, starting position, and water frames.
The walker starts there facing down.
The art export has no gameplay data.
The separate, hand-authored `src/assets/plaza-navigation.tmj` supplies blocked tiles, object footprints, the university transition, and the `return` spawn in front of the university door.
Leaving the university courtyard puts the walker on that spawn, facing away from the door.
It uses the same 24 by 16 grid and 16-pixel tiles.
Keep both maps aligned when moving scenery.
The collision footprint covers the walker's feet, not the head or tree canopy.

`outside.tmj` and `interior.tmj` contain the new art, collision footprints, interaction rectangles and spawn points.
Their interaction rectangles include the direction the walker must face.
`tools/export-university.py` exports these maps from the approved native images in `tools/university-art/`.
Run it with Python and Pillow 12.3 or later after changing its source art or map definitions.
Do not hand-edit its generated maps or atlases.
It slices each composition into 16-pixel tiles and checks that reconstruction with collectible items matches the approved pixels exactly.
These compositions have 384 unique tiles each, so the exports are specific to these scenes rather than a general reusable terrain set.
The notebook and sensor use separate image objects over clean tabletop patches sampled from the generated art.

Phaser 4.2.1 is pinned and copied from npm into the built site's assets.
The terrain uses Phaser's Tiled loader and tile layer.
Phaser's documentation warns that image-collection tilesets are unsupported.
The game therefore loads the map's object images individually, preserves their explicit top-left alignment, and applies the map's `feetY` depth values.
The new university maps use ordinary tile atlases for their scenery and image objects for collectible items.

The build keeps relative asset URLs for previews under a subdirectory.

### Earlier download measurements

A cold Chromium visit on 2026-11-25 measured the English page from a local server without compression.
The browser's transfer sizes include its reported response overhead.
Before entry, the page transferred 10,794 bytes and requested no engine, map, or artwork.
After entry, the total was 1,714,644 bytes.
Phaser accounted for 1,376,276 transferred bytes, leaving 338,368 bytes when that script is subtracted.
That subtraction is a size comparison, not a playable build without Phaser.
The Phaser file itself is 1,375,976 bytes, or 352,441 bytes with local gzip level 9 compression.
Production compression and cache behavior were not measured.

These measurements describe the earlier courtyard-only build, not the university extension.

### Documentation

The camera, scaling, Tiled JSON and Pillow references were checked on 2026-11-26 for the university extension.
The other references document the existing courtyard implementation.

- [Phaser Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap): Tiled parsing, tilesets, object layers, and image-collection limitation.
- [Phaser animations](https://docs.phaser.io/phaser/concepts/animations): sprite frames, timing, and repetition.
- [Phaser depth](https://docs.phaser.io/api-documentation/namespace/gameobjects-components-depth): larger depth values draw in front.
- [Phaser cameras](https://docs.phaser.io/phaser/concepts/cameras): following, bounds, viewport, and zoom.
- [Phaser scaling](https://docs.phaser.io/phaser/concepts/scale-manager): resizing the canvas to its parent.
- [Tiled JSON](https://doc.mapeditor.org/en/stable/reference/json-map-format/): tile arrays, image collections, and object layers.
- [Tiled objects](https://doc.mapeditor.org/en/stable/manual/objects/): rectangle footprints and explicit top-left tile alignment.
- [Pillow images](https://pillow.readthedocs.io/en/stable/reference/Image.html): palette conversion, image composition and exact pixel comparison.

The online Phaser API labels itself 4.1.0.
The installed 4.2.1 loader documentation in `node_modules/phaser/src/loader/filetypes/TilemapJSONFile.js` confirms the object-input loading path used here.
Its camera documentation confirms that `startFollow(..., true)` rounds rendering positions and that integer zoom enables pixel rounding.
Its alpha documentation confirms that `setAlpha` applies a single opacity value across the whole tree image.
The attempted `/phaser/concepts/tilemaps` URL failed with HTTP 403 and 404, so the API page above replaces it.

## Write a post

Create a markdown file in `src/posts`, for example `src/posts/reproduce-first.md`:

```md
---
title: Reproduce first
date: 2026-11-20
---

The text of the post.
```

The post appears in the journal and on the home page with no other edit.

## Where things live

- `src/index.liquid` holds the home page structure, shared by both languages.
- `src/_data/i18n.json` holds the home page text in English and Portuguese.
- `src/_data/university.json` holds the university name, dates and degree wording, shared by the home page and game in both languages.
- `src/assets/style.css` holds the regular portfolio styles.
- `src/play.liquid` and `src/_data/plaza.json` hold the bilingual plaza interface.
- `src/assets/plaza.css`, `plaza-entry.js`, `plaza.js`, and `plaza-map.js` hold the plaza styles, entry screen, Phaser scene, and collision rules.
- `check-plaza.js` checks the maps, every walkable position, all interactions, integer viewport coverage and shared university wording.
- `src/assets/sprites/` holds the burgundy character sheet and green beetle as lossless WebP images.
- `eleventy.config.js` selects each sprite's region and accessible description.
- `src/assets/game.js` holds the rules of the battle.
- `src/_data/site.json` holds the site name and the canonical domain.
