# Walker motion study

The three `*-source.png` atlases are original images generated with the built-in ImageGen tool on 26 November 2026.
The adjacent prompt files record the requests.
Every request used `src/assets/plaza-art/model-sheet.png` as the character reference.
No franchise or photographed character was used.

`python3 tools/export-walker.py` produces `src/assets/plaza-art/walker-grounded.png`, its `walker-motion.json`, and `tools/walker-art/lively-sheet.png`.
Do not edit those generated files by hand.
The exporter requires Pillow, like the existing art exporters.
It crops the 8-column, 4-row generated atlases, aligns their heads, and reduces the poses to the approved 32-color palette.
It restores the exact approved head and shoulder pixels above row 24, with vertical translations for weight transfer.
The lower body comes from the generated poses.
Contact poses keep the sole at row 43.
Two run poses lift the whole body by one pixel during flight.
Alpha is binary and scaling uses nearest neighbors to preserve the pixel grid.

Both packed sheets have 17 columns of 32 by 48 pixels.
Rows face down, left, right, and up.
Column zero is the original idle pose.
Columns 1 through 8 are walking.
Columns 9 through 16 are running.
The alternate walk remains outside the published assets because the game loads only Grounded.
The original walker files remain intact for comparison.

Grounded walks at 12 frames per second with one-pixel weight shifts.
Lively adds stronger two-pixel rises and a broader generated stride.
Running uses a separate generated cycle at 16 frames per second.
Walking remains 60 pixels per second, while running moves at 102 pixels per second.
The existing one-pixel collision checks apply at both speeds.
Reduced motion keeps directional idle poses while preserving both speeds.

Hold Shift while moving to run.
The visible Run button is a toggle for touch and keyboard use.
A visible toggle is discoverable and does not require holding a second finger on the screen.
Leaving the window, opening the menu, closing a dialog, and directory travel clear the toggle.
Walking across an edge preserves held movement and running.

## Review and verification

After `npm run build`, run `node tools/walker-preview.mjs /absolute/review/directory`.
The script writes standalone `part.html` and `play.html` files with their scripts, images, and map data embedded.
The playable review includes English and Portuguese.
Changing its language starts a fresh game, as the website's language navigation does.
Portfolio links remain explicit outbound navigation, but opening and playing the review makes no external requests.

Open `play.html` with chrome-devtools-axi, then run `chrome-devtools-axi run < tools/check-walker-browser.js` before entering the game.
This check exercises the actual scene with controlled elapsed time for repeatable speed measurements.
It covers the enter gate, reading before entering, all four directions at both speeds, animation selection, Shift release, toggle state, collision, three exits, blur, menu, dialogs, and offline loading.
`npm test` also checks the sheet dimensions, animation ranges, speeds, collision, exits, and localized controls.
The exporter checks palette membership, binary alpha, frame bounds, and eight distinct frames in every direction.

Phaser documents inclusive numbered frame ranges in [generateFrameNumbers](https://docs.phaser.io/api-documentation/class/animations-animationmanager#generateFrameNumbers).
The installed Phaser 4.2.1 source confirms that `play(key, true)` ignores repeated calls only while that same animation is playing.
This permits switching directly between the walk and run cycles.
[KeyboardEvent.shiftKey](https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/shiftKey) reports Shift after each key event.
The keyboard handlers also normalize letter case, so Shift does not break WASD movement.
