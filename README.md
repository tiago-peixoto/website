# tiagop.dev.br

The personal site of Tiago Peixoto.
It is a static site built with [Eleventy](https://www.11ty.dev).

## Commands

- `npm start` serves the site at http://localhost:8080 and reloads on save.
- `npm test` builds the site and checks internal links, battle rules, plaza collisions, door reachability, and both languages.

## Plaza preview

Open `/play/` or `/pt/play/` after `npm start`.
The regular portfolio, journal, and battle are unchanged.
The intro and directory work before the game loads.
Only “Enter the plaza” loads Phaser, the Tiled maps, and the artwork.
Without JavaScript, the directory and regular portfolio links remain available.
If loading fails, the entry button offers another attempt.

Use arrows or WASD to walk, or hold a direction button on a touch screen.
Face the university door and press Enter or Space, or choose “Read university”.
The HTML panel contains only the university fact already published on the regular portfolio.
Escape closes the panel or moves focus outside the game.
Tab reaches the links normally.
The directory also opens the panel without walking.
Reduced motion pauses the water, including when the preference changes during play.
The camera follows the walker where the viewport is smaller than the map.
Integer camera zoom keeps the original pixels sharp.

`src/assets/plaza-art/` contains the approved round-two generated art, copied without changes.
The courtyard is an invented setting, not a reconstruction of UFSC.
`courtyard.tmj` supplies the terrain, objects, ground-contact depths, starting pose, and water frames.
The art export has no gameplay data.
The separate, hand-authored `src/assets/plaza-navigation.tmj` supplies blocked tiles, object footprints, and the university interaction area.
It uses the same 24 by 16 grid and 16-pixel tiles.
Keep both maps aligned when moving scenery.
The collision footprint covers the walker's feet, not the head or tree canopy.

Phaser 4.2.1 is pinned and copied from npm into the built site's assets.
The terrain uses Phaser's Tiled loader and tile layer.
Phaser's documentation warns that image-collection tilesets are unsupported.
The game therefore loads the map's object images individually, preserves their explicit top-left alignment, and applies the map's `feetY` depth values.
No art atlas conversion or new art generation is involved.

The build keeps relative asset URLs for previews under a subdirectory.

### Download measurements

A cold Chromium visit on 2026-11-25 measured the English page from a local server without compression.
The browser's transfer sizes include its reported response overhead.
Before entry, the page transferred 10,794 bytes and requested no engine, map, or artwork.
After entry, the total was 1,714,644 bytes.
Phaser accounted for 1,376,276 transferred bytes, leaving 338,368 bytes when that script is subtracted.
That subtraction is a size comparison, not a playable build without Phaser.
The Phaser file itself is 1,375,976 bytes, or 352,441 bytes with local gzip level 9 compression.
Production compression and cache behavior were not measured.

### Documentation read on 2026-11-25

- [Phaser Tilemap](https://docs.phaser.io/api-documentation/class/tilemaps-tilemap): Tiled parsing, tilesets, object layers, and image-collection limitation.
- [Phaser animations](https://docs.phaser.io/phaser/concepts/animations): sprite frames, timing, and repetition.
- [Phaser depth](https://docs.phaser.io/api-documentation/namespace/gameobjects-components-depth): larger depth values draw in front.
- [Phaser cameras](https://docs.phaser.io/phaser/concepts/cameras): following, bounds, viewport, and zoom.
- [Phaser scaling](https://docs.phaser.io/phaser/concepts/scale-manager): resizing the canvas to its parent.
- [Tiled JSON](https://doc.mapeditor.org/en/stable/reference/json-map-format/): tile arrays, image collections, and object layers.
- [Tiled objects](https://doc.mapeditor.org/en/stable/manual/objects/): rectangle footprints and explicit top-left tile alignment.

The online Phaser API labels itself 4.1.0.
The installed 4.2.1 loader documentation in `node_modules/phaser/src/loader/filetypes/TilemapJSONFile.js` confirms the object-input loading path used here.
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
- `src/assets/style.css` holds the regular portfolio styles.
- `src/play.liquid` and `src/_data/plaza.json` hold the bilingual plaza interface.
- `src/assets/plaza.css`, `plaza-entry.js`, `plaza.js`, and `plaza-map.js` hold the plaza styles, entry screen, Phaser scene, and collision rules.
- `check-plaza.js` checks the maps, movement, and published university wording.
- `src/assets/sprites/` holds the burgundy character sheet and green beetle as lossless WebP images.
- `eleventy.config.js` selects each sprite's region and accessible description.
- `src/assets/game.js` holds the rules of the battle.
- `src/_data/site.json` holds the site name and the canonical domain.
