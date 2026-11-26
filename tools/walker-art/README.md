# Grounded walk and run

The fourth revision applies the review's changes separately to each cycle.
All artwork is original ImageGen artwork.
No photographed or franchise character was used.
`face-v4-source.png` contains the generated eye and chin edit.
`v4-prompts.txt` records its prompt and reference.
Earlier generated sources and prompts remain as provenance.

`round-2-sheet.png` is the exact exported sheet from commit `1691c9ad48a3bcb9af44f9fb720748c46ba4492e`.
`round-3-sheet.png` is the exact exported sheet from commit `020191a0ebf6036af00e19c5845f6b854f91285a`.
These immutable references let the exporter preserve approved pixels without requiring Git history at export time.

## Export

Install the pinned Pillow version with `python3 -m pip install -r tools/requirements-art.txt`.
`python3 tools/export-walker.py` generates `src/assets/plaza-art/walker-grounded.png` and `walker-motion.json`.
Do not edit those generated files by hand.

| Cycle | Fourth revision |
| --- | --- |
| Down walk | Round 2, with only the left-eye and chin rectangles imported from the generated edit. |
| Left and right walk | Exact round-3 frames in order 1, 8, 7, 6, 5, 4, 3, 2. |
| Up walk | Exact round-2 frames, unchanged. |
| Down run | Original round-3 upper body narrowed from 32 to 28 columns and centered, with unchanged legs and the exact round-2 head. |
| Left, right and up run | Exact round-3 frames, unchanged. |
| All idle poses | Exact round-3 poses, unchanged. |

Down walk changes nine pixels per frame.
The character's left eye is on the viewer's right.
The import rectangles use half-open coordinates `(17, 14, 19, 15)` and `(13, 18, 19, 20)` before vertical movement.
The remaining face, hair, body and clothes remain byte-identical to round 2.
Down run intentionally restores the original face exactly, as requested, rather than sharing the edited walking face.
Idle poses retain their previous faces because this round only changes the named moving cycles.

The profile walks reverse time without mirroring or repainting their art.
In round 3, the grounded shoes travel in the same direction as the body, producing backwards motion.
The reversed order makes them travel opposite the body's direction during contact.
Both profile walks use the same correction because their bodies mirror one another.

The [Pillow Image documentation](https://pillow.readthedocs.io/en/stable/reference/Image.html) defines crop coordinates, nearest-neighbor resizing, quantization, and pasting.
The exporter uses nearest-neighbor sampling and disables dithering.
It thresholds generated alpha to zero or 255.
Unmasked pasting copies transparent pixels as well as visible pixels.
The palette remains in `model-layout.json`.

The sheet retains 17 columns of 32 by 48 pixels.
Rows face down, left, right and up.
Column zero contains idle poses.
Columns 1 through 8 contain walking.
Columns 9 through 16 contain running.
Walking uses 12 frames per second and moves 60 pixels per second.
Running uses 16 frames per second and moves 102 pixels per second.

## Verification and review

`npm test` checks all 64 animation frames with `tools/check-walker.py`.
The checks preserve the earlier arm, torso, leg, palette, transparency, silhouette, shoe, bounds, stable-head and unique-frame checks.
Shoulder and face checks now match the restored round-2 art instead of requiring the rejected round-3 face and shoulders.
Exact reference comparisons protect unchanged cycles and all pixels outside the down-walk masks.
Down-run shoulders must be one to three pixels narrower than round 3 in every frame.

The direction check measures the signed area traced by shoe centers through the profile walk.
Screen coordinates increase downward, so forward left motion has negative area and forward right motion has positive area.
The check accepts all eight starting phases and rejects all eight reversals for both directions.
It detects temporal reversal independently of the contact-frame arm check.
These geometric checks support visual review rather than measuring subjective animation quality.

After `npm run build`, run `node tools/walker-preview.mjs /absolute/review/directory`.
The builder writes a self-contained `index.html` with all three revisions and the complete playable game.
It also writes `part.html` and `play.html` for isolated inspection.
The complete review contains 192 numbered frames and 48 animated views.
Each cycle has its feedback and one keep-or-iterate question.
One final decision card consolidates the review.
The strips scroll within their cards at phone widths.
Reduced motion starts the comparison paused.
Pause and Next frame support still inspection.
The game retains both languages and the inherited notebook correction.

Run `chrome-devtools-axi run < tools/check-walker-review-browser.js` on the complete review.
Run `chrome-devtools-axi run < tools/check-walker-browser.js` on a fresh `play.html`.
The game check covers all eight animations, both speeds, controls, collision and travel.
