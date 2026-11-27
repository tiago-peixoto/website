# tiagop.dev.br

The personal site of Tiago Peixoto.
It is a static site built with [Eleventy](https://www.11ty.dev).

## Commands

- `python3 -m pip install -r tools/requirements-art.txt` installs Pillow for the sprite checks and art exporters.
- `npm start` serves the site at http://localhost:8080 and reloads on save.
- `npm test` builds the site and checks internal links, battle rules, all three maps, interaction reachability, viewport coverage, both languages, and every walker frame.

## Plaza preview

Open `/play/` or `/pt/play/` after `npm start`.
The portfolio and game share the confirmed degree wording in `src/_data/university.json`.
The intro and directory work before the game loads.
Only “Enter the plaza” loads Phaser, the Tiled maps, and the artwork.
Without JavaScript, the directory and regular portfolio links remain available.
If loading fails, the entry button offers another attempt.

Use arrows or WASD to walk, or hold a direction button on a touch screen.
Hold Shift to run, or toggle Run before holding a direction.
Walking stays at 60 pixels per second, and running uses a separate animation at 102 pixels per second.
Walk off the plaza's right path to reach the university courtyard from its left edge.
Walk back across the courtyard's left edge to return to the plaza.
Edge crossings happen automatically, without an interaction key.
The left entrance leads into one engineering study room.
Daylight marks the study room's bottom exit, including when the room lights are off.
Walking through that exit returns to the courtyard.
Face an object and press Enter or Space, or use the interaction button beside the direction controls.
Switch the plaza lamp on and off, or watch a fish leap from the pond and splash back into the water.
Read the paper, switch the room lights, collect the notebook and sensor, and inspect the robot, computer and math board.
Each object opens a first-person conversation next to the walker.
Enter, Space, a tap on the text, or the action button reveals the current line, then advances to the next one.
The study doorway opens a conversation before entering the room.
The final action closes the balloon and automatically collects a pickup.
Escape cancels speech without collecting the item.
The math board offers three addition problems directly on its surface.
The robot uses three arm positions, with left/right controls and Space to grip or release the part.
Both games stay in the scene, with a closer camera view and touch controls.
The study lamp has its own target and toggles its glow and the room brightness.
Each challenge has an ending, an immediate replay, and feedback for mistakes.
Neither challenge has a countdown or saved scores.
The robot and math board are imagined demonstrations, not claims about a real laboratory.
The computer, university, sensor, paper and light conversations adapt the published portfolio.
The pond and inventory adapt [Goodbye Kanterbury](https://world.hey.com/tiagop/goodbye-kanterbury-b1f97ba2).
The notebook adapts [Is my mind modular?](https://world.hey.com/tiagop/is-my-mind-modular-023e3e47).
The new phrasing is an adaptation for review, not a quotation or new biographical claim.
Both language versions live in `src/_data/dialogue.json`.
The inventory lasts while the page remains open, including travel between areas.
It has no save, scoring or quest system.
Escape closes the panel or moves focus outside the game.
Tab reaches the links normally.
Every interaction is also available in the HTML directory before the engine loads.
The directory contains the complete conversation transcripts, including without JavaScript.
The nonmodal speech dialog leaves the action button available and returns focus to the opener on close.
Screen readers receive each complete line separately from the decorative typing animation.
Reduced motion reveals each line immediately, including when the preference changes during typing.
Once play starts, the directory can visit any of the three areas without walking.
Reduced motion pauses the water and walking animation, including when the preference changes during play.
The pond then shows a brief stationary ripple instead of a moving fish.
Light switches report their state inside the conversation.
Pickups announce their inventory update after the final line.
The canvas fills the area between the header and the controls, so neither bar covers the map, the walker or an exit.
The final play layout is set before loading the scene, and a size observer keeps the canvas aligned when translated controls wrap.
The camera uses the smallest whole-number zoom that covers both dimensions of that area, and follows the walker within the map bounds.
This keeps the approved native 384 by 256 artwork sharp without empty bands or fractional scaling.
Narrow windows show less of the map at once, and the camera follows movement to reveal the rest.
The courtyard tree becomes partly transparent when it covers the walker.

`src/assets/plaza-art/` contains the approved round-two courtyard and the approved university compositions.
These are invented settings inspired by UFSC, not reconstructions of its buildings or laboratories.
`courtyard.tmj` supplies the terrain, objects, ground-contact depths, starting position, and water frames.
The walker starts there facing down.
The art export has no gameplay data.
The separate, hand-authored `src/assets/plaza-navigation.tmj` supplies blocked tiles, object footprints, lamp and pond interactions, and the right-edge transition.
Its `return` spawn places the walker inside that edge, facing left.
The original plaza building opens the published university information, and no longer transports the walker.
It uses the same 24 by 16 grid and 16-pixel tiles.
Keep both maps aligned when moving scenery.
The collision footprint covers the walker's feet, not the head or tree canopy.

`outside.tmj` and `interior.tmj` contain the new art, collision footprints, interaction rectangles, edge exits and spawn points.
Their interaction rectangles describe the target surfaces, not the place where the walker must stand.
A 24-pixel ray from the center of the feet finds the first target in the facing direction.
The ray stops at intervening blocked tiles or obstacles.
Objects support every reachable side, while walls and adjacent furniture still block inaccessible sides.
Items on a table use separate parts of its footprint so they remain reachable from the exposed edges.
Exit rectangles also specify the outgoing direction, so arriving at an edge does not immediately send the walker back.
`tools/export-university.py` exports these maps from the approved images in `tools/university-art/`.
The outside map uses the native `outside.png`.
The study room uses `interior-workshop-source.png`, an original ImageGen edit of the reviewed smaller furniture, reduced to 384 by 256 pixels.
Its welding workbench, tool cart and parts rack each have English and Portuguese speech through the existing conversation mechanism.
The exporter adds their collision and interaction surfaces while preserving the central aisle and existing approaches.
`interior-workshop-prompt.txt` records the generation and clearance correction.
Run it with Python and Pillow 12.3 or later after changing its source art or map definitions.
Do not hand-edit its generated maps or atlases.
It slices each composition into 16-pixel tiles and checks that reconstruction with collectible items matches the approved pixels exactly.
These compositions have 384 unique tiles each, so the exports are specific to these scenes rather than a general reusable terrain set.
The notebook and sensor use separate image objects over clean tabletop patches sampled from the generated art.
`interior-tabletop-patch.png` removes the painted open book so the red collectible is the only notebook.
The exporter applies this patch only inside the open book's 26-by-14-pixel footprint.
`npm test` checks the empty tabletop and verifies that all other room pixels remain unchanged.
`tools/export-effects.py` exports the generated lamp glow, fish, splash and doorway light from `tools/university-art/effects-source.png`.
It trims faint background speckles, reduces each sprite with nearest-neighbor sampling, and maps its colors to the approved 64-color palette.
The retained pixels preserve the generated alpha channel.

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
- [Phaser components](https://docs.phaser.io/phaser/concepts/gameobjects/components): opacity and vertical sprite flipping for the new effects.
- [Phaser cameras](https://docs.phaser.io/phaser/concepts/cameras): following, bounds, viewport, and zoom.
- [Phaser scaling](https://docs.phaser.io/phaser/concepts/scale-manager): resizing the canvas to its parent.
- [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver): observing changes to the canvas container.
- [Tiled JSON](https://doc.mapeditor.org/en/stable/reference/json-map-format/): tile arrays, image collections, and object layers.
- [Tiled objects](https://doc.mapeditor.org/en/stable/manual/objects/): rectangle footprints and explicit top-left tile alignment.
- [Pillow images](https://pillow.readthedocs.io/en/stable/reference/Image.html): palette conversion, image composition and exact pixel comparison.

The online Phaser API labels itself 4.1.0.
The installed 4.2.1 loader documentation in `node_modules/phaser/src/loader/filetypes/TilemapJSONFile.js` confirms the object-input loading path used here.
Its camera documentation confirms that `startFollow(..., true)` rounds rendering positions and that integer zoom enables pixel rounding.
Its alpha documentation confirms that `setAlpha` applies a single opacity value across the whole tree image.
The installed ScaleManager documentation confirms that `getParentBounds()` updates parent dimensions and returns whether they changed.
Its `refresh()` method applies those dimensions in RESIZE mode and emits the resize event.
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
- `src/play.liquid`, `src/_data/plaza.json`, and `src/_data/dialogue.json` hold the bilingual plaza interface and conversations.
- `src/assets/plaza.css`, `plaza-entry.js`, `plaza.js`, and `plaza-map.js` hold the plaza styles, entry screen, Phaser scene, and collision rules.
- `src/assets/plaza-state.js` holds session state changes for lights, pond interactions and item pickup.
- `src/assets/plaza-dialogue.js` controls speech, focus and balloon placement.
- `src/assets/plaza-experiments.js` controls the two mini-game panels, their keys and their buttons.
- `src/assets/plaza-challenges.js` holds the two finite challenge rules.
- `check-plaza.js` checks the maps, every walkable position, every reachable interaction side, occlusion, automatic exits, toggles, challenge endings, transcripts, integer viewport coverage and shared university wording.
- `src/assets/sprites/` holds the burgundy character sheet and green beetle as lossless WebP images.
- `eleventy.config.js` selects each sprite's region and accessible description.
- `src/assets/game.js` holds the rules of the battle.
- `src/_data/site.json` holds the site name and the canonical domain.

### Interaction verification and offline review

Build the standalone preview below and open it in a named `chrome-devtools-axi` session.
Run `chrome-devtools-axi run < tools/check-interactions-browser.js` on a fresh English preview.
The script checks the enter gate, pickup timing and cancellation, 21 study approaches, both games, keyboard controls, touch controls, and the lamp.
It does not approach the welding workbench, tool cart or parts rack, whose reachable sides `check-plaza.js` checks in `npm test`.
Repeat at 390 by 844, 1280 by 720, and 1920 by 1080.

After `npm run build`, run `node tools/plaza-preview.mjs /absolute/path/play.html` to generate the standalone review.
The preview embeds both languages, the engine, all maps, and every image.
Its language link reloads the embedded page in the other language.
Portfolio links are disabled inside this offline review.
The production portfolio links remain unchanged.

The interaction implementation checked the [native dialog documentation](https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/show).
`show()` opens a nonmodal dialog, so the action button remains usable.
The installed Phaser 4.2.1 documentation in `src/cameras/2d/BaseCamera.js` describes `matrixCombined` as combining the internal and external camera transforms.
`src/gameobjects/components/TransformMatrix.js` documents `transformPoint()` for projecting the walker's head and feet into the canvas.
`src/core/events/POST_RENDER_EVENT.js` documents the event after scene rendering, when those camera transforms are current.
The balloon and board surface use these coordinates.
[Phaser camera controls](https://docs.phaser.io/phaser/concepts/cameras) stop following the walker during experiments and restore following afterward.
Camera changes and robot poses are immediate, including with reduced motion.
The robot reuses pixels from the approved room through [canvas textures](https://docs.phaser.io/phaser/concepts/textures).
The arm outline, floor patch, board surface, and lamp glow use coordinates in the current 384 by 256 study composition.
Update those coordinates if that artwork moves during integration.
Open the generated preview in the browser, then run `chrome-devtools-axi run < tools/check-preview-browser.js`.
This checks engine startup, every area, both challenges, replay, language switching, and zero external resource requests in both languages.
The transcript template follows LiquidJS's documented [hash iteration](https://liquidjs.com/tags/for.html) and [HTML escaping](https://liquidjs.com/filters/escape.html).
