# Grounded walk and run

The two source atlases are original artwork made with the built-in ImageGen tool on 26 November 2026.
The adjacent prompt files record the requests.
Both requests used `src/assets/plaza-art/model-sheet.png` as the character reference.
No photographed or franchise character was used.
The run source received a further ImageGen edit to remove gray haze around its silhouette.

`python3 tools/export-walker.py` generates `src/assets/plaza-art/walker-grounded.png` and `walker-motion.json`.
Do not edit those generated files by hand.
The exporter requires Python 3 and Pillow.
Install the pinned version with `python3 -m pip install -r tools/requirements-art.txt`.
The exporter crops the generated bodies, aligns their head centers, and reduces them to the approved palette.
It restores only the approved head through row 19.
The former boundary at row 24 cut across generated upper arms.
Generated shoulders, sleeves, forearms and hands now remain together.
Front and back walking poses mirror their first four body poses for the opposite footfall.
The head remains the independently approved directional model.
Body scaling leaves transparent margins for the widest run strides.

The [Pillow Image documentation](https://pillow.readthedocs.io/en/stable/reference/Image.html) defines nearest-neighbor resizing, palette quantization and unmasked pasting.
The exporter uses nearest-neighbor resizing and disables dithering.
It thresholds alpha to zero or 255 before sampling.
Unmasked pasting copies the source alpha, including transparent pixels.
The palette and original model measurements live in `model-layout.json`.
That historical model metadata remains unchanged.

The packed sheet has 17 columns of 32 by 48 pixels.
Rows face down, left, right and up.
Column zero contains the original idle pose.
Columns 1 through 8 contain Grounded walking.
Columns 9 through 16 contain running.
The old six-frame walk and Lively files were removed.
The review reads its before image directly from commit `ad736259e74a8b3f81ef21a59721969352d249fc`.

Walking uses 12 frames per second and moves 60 pixels per second.
Running uses 16 frames per second and moves 102 pixels per second.
Reduced motion uses the directional idle pose at either speed.
The existing input, collision and interaction code is unchanged.

## Verification and review

`npm test` checks all 64 exported animation frames with `tools/check-walker.py`.
The checks count visible skin pixels in each arm region, excluding the neck.
They also check both lower-leg regions, shoe pixels, exact head pixels, palette membership, binary alpha, frame bounds and eight distinct poses.
Each frame has two deletion checks that remove the skin pixels from one arm region.
All 128 deletions must fail the arm check.
Every opaque pixel must also connect to the same silhouette, allowing diagonal pixel contact.
These checks detect disappearing limbs but do not replace visual review of the numbered strips.

After `npm run build`, run `node tools/walker-preview.mjs /absolute/review/directory`.
The builder writes self-contained `part.html` and `play.html` files.
The comparison contains every before and after frame, numbered 1 through 8, for all four directions and both gaits.
Each strip sits beside animated cycles at native and four-times size on the plaza floor.
The strips scroll horizontally within their cards at phone widths.
Reduced motion starts the comparison paused.
Pause and Next frame support keyboard inspection.

The playable review includes English and Portuguese.
Changing its language starts a fresh game.
Open `play.html` with chrome-devtools-axi and run `chrome-devtools-axi run < tools/check-walker-browser.js` before entering.
The browser check covers the gate, reading without walking, eight animations, both speeds, Shift release, the Run toggle, collision and travel.
