# Grounded walk and run

The third revision uses original artwork generated with the built-in ImageGen tool on 26 November 2026.
The source images are `walk-v3-source.png`, `run-v3-source.png`, and `face-v3-source.png`.
`v3-prompts.txt` records their prompts and reference roles.
The previous source images remain as provenance for the reviewed version.
No photographed or franchise character was used.

`python3 tools/export-walker.py` generates `src/assets/plaza-art/walker-grounded.png` and `walker-motion.json`.
Do not edit those generated files by hand.
Install the pinned Pillow version with `python3 -m pip install -r tools/requirements-art.txt`.
The exporter crops each generated pose, aligns its head center, and reduces its body to the approved palette.
The down-facing head comes from the new face source.
The other directional heads retain the approved model.
The down-facing idle receives the same corrected head to avoid a face change when movement stops.

The generated shoulders remain part of the body.
Front and back poses mirror their first four bodies for the opposite footfall.
Both profile bodies use the left-facing source, mirrored for the right-facing cycle.
This applies the arm and torso corrections consistently while retaining the independent right-facing head.
The fourth profile walking pose uses the fifth source pose because the fourth source pose hides the far hand.
Its different vertical position preserves a distinct displayed frame.
Run bodies keep their height during vertical movement, so airborne frames lift their feet above the contact baseline.

The [Pillow Image documentation](https://pillow.readthedocs.io/en/stable/reference/Image.html) documents resizing, palette quantization, transparency, and pasting.
The exporter uses nearest-neighbor resizing and disables dithering during palette quantization.
It thresholds alpha to zero or 255 before sampling.
Unmasked pasting copies transparent pixels as well as visible pixels.
The palette and historical model measurements remain in `model-layout.json`.

The packed sheet has 17 columns of 32 by 48 pixels.
Rows face down, left, right and up.
Column zero contains idle poses.
Columns 1 through 8 contain Grounded walking.
Columns 9 through 16 contain running.
Walking uses 12 frames per second and moves 60 pixels per second.
Running uses 16 frames per second and moves 102 pixels per second.
Reduced motion uses the directional idle pose at either speed.

## Verification and review

`npm test` checks all 64 exported animation frames with `tools/check-walker.py`.
The tests check eye pixels, eye alignment, jaw taper, shoulder width, arm area, torso coverage, side arm displacement, and run leg movement.
They also preserve palette, binary alpha, connected silhouette, shoe, bounds, stable directional head, and unique displayed frame checks.
Each frame receives mutations that remove or enlarge its arms.
Applicable frames also receive mutations for narrow shoulders, blank eyes, rectangular jaws, or thin torsos.
Cycle mutations freeze the near arm or running legs.
All 294 mutations must fail their corresponding check.
These checks measure specific defects and do not replace visual judgment about animation quality.

After `npm run build`, run `node tools/walker-preview.mjs /absolute/review/directory`.
The builder writes self-contained `part.html` and `play.html` files.
The comparison reads its before image from reviewed commit `1691c9ad48a3bcb9af44f9fb720748c46ba4492e`.
It contains 128 numbered frames and 32 animated views covering both gaits and all four directions.
Feedback appears beside the frames that address it.
The strips scroll within their cards at phone widths.
Reduced motion starts the comparison paused.
Pause and Next frame support keyboard inspection.
The playable review includes English and Portuguese.
Changing its language starts a fresh game.

Open `play.html` with chrome-devtools-axi and run `chrome-devtools-axi run < tools/check-walker-browser.js` before entering.
The browser check covers the gate, reading without walking, eight animations, both speeds, Shift release, the Run toggle, collision and travel.
`tools/check-walker-access-browser.js` checks Portuguese controls and reduced motion.
