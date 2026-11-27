# University art sources

`outside.png` and `interior.png` are the approved original generated compositions at 384 by 256 pixels.
They use the approved round-two 64-color environment palette.
Both compositions were approved on 26 November 2026.

Public photographs informed shapes, materials, colors and vegetation only.
No photograph was copied into these images or supplied to the generator.
The compositions do not reconstruct the real campus or claim to depict its laboratories.

Photo sources consulted on 26 November 2026, Europe/Berlin:

- [UFSC automation course](https://automacao.ufsc.br/) and its [department entrance photo](https://gradautomacao.paginas.ufsc.br/files/2025/10/integrantes_multilab_hidrogenio_verde.jpg): yellow-and-blue sign and dark glazing.
- [Apufsc engineering buildings, 3 May 2023](https://www.apufsc.org.br/2023/05/03/apesar-de-ser-o-centro-da-ufsc-que-mais-arrecada-recursos-ctc-nao-consegue-fazer-compras-por-burocracia-e-falta-de-manutencao/) and its [courtyard photo](https://www.apufsc.org.br/wp-content/uploads/2023/04/IMG_4354-1-1024x683.jpg): concrete bands, brick, palms and benches.
- [Apufsc central library, 17 November 2023](https://www.apufsc.org.br/2023/11/17/biblioteca-central-da-ufsc-em-florianopolis-segue-fechada-nesta-sexta-feira-dia-17/) and its [library photo](https://www.apufsc.org.br/wp-content/uploads/2022/07/2022_04_18_BU-UFSC_Biblioteca_Apufsc-scaled.jpg): broad canopy, peach tiled facade and glass entrance.

`../export-university.py` generates the production maps and images.
It preserves the approved appearance while separating collectible objects from the tabletops underneath them.
The original courtyard exporter supplied the nearest-neighbor reduction and palette method used before approval.

## Interaction effects

`effects-source.png` is the original transparent atlas generated with the built-in ImageGen tool on 26 November 2026.
`effects-prompt.txt` preserves the exact prompt.
The approved round-two courtyard reconstruction and `interior.png` served as style references.
No public photograph or franchise art was supplied.

`../export-effects.py` crops the four generated shapes and exports `lamp-glow.png`, `lamp-pool.png`, `fish.png`, `door-light.png` and `splash.png`.
It ignores faint generator speckles when choosing crop bounds, reduces with nearest-neighbor sampling, and maps RGB colors to the approved outside scene's 64-color palette.
It preserves the generated alpha values within each retained crop.
The exporter gives each sprite its final display dimensions, so the scene never stretches individual sprite pixels.
The scene places the doorway light at the bottom threshold and draws it over the room shade so sunlight remains visible with the lights off.
The same generated halo supplies the lamp's bulb glow and its flattened pool of light.

## Interior furniture scale

The smaller furniture scale was approved on 26 November 2026.
`interior-scale-prompt.txt` preserves both prompts of the ImageGen edit that produced it, and the reference roles.
That generated image is not in this repository, because no exporter or check reads it.
`interior-workshop-source.png` is a later ImageGen edit of that image, which adds the welding workbench, tool cart and parts rack.
`interior-workshop-prompt.txt` records its prompts.
`interior-tabletop-patch.png` replaces the painted open book with empty tabletop, and `interior-tabletop-prompt.txt` records its prompt.
The original approved `interior.png` remains available for comparison.
No photograph, franchise art or new character was supplied.

`../export-university.py` reduces `interior-workshop-source.png` to 384 by 256 pixels using nearest-neighbor sampling, applies the tabletop patch, then maps the result to the outside scene's 64-color palette without dithering.
[Pillow documents the resize filter and palette-based quantization](https://pillow.readthedocs.io/en/stable/reference/Image.html).
The exporter separates the notebook and sensor, rebuilds the 16-pixel terrain tiles, and asserts that reconstruction matches the reduced composition exactly.
[Tiled documents the pixel dimensions and object alignment used by the map](https://doc.mapeditor.org/en/stable/reference/json-map-format/).

The locked walker has a 40-pixel visible height inside its 32 by 48 frame.
Furniture uses a 14-pixel chair seat height, close to the walker's hips, and a 28-pixel chair back height.
The reading desk's front edge is about 16 pixels above its feet.
Projected bounds below include tabletop depth, so they are not physical furniture heights.

| Prop | Original bounds, pixels | Approved bounds, pixels |
| --- | --- | --- |
| Reading chair | 28 x 44 | 20 x 28 |
| Reading desk | 92 x 62 | 59 x 40 |
| Desk lamp | 34 x 35 | 22 x 25 |
| Loose paper | 20 x 20 | 11 x 10 |
| Open book | 38 x 24 | 23 x 13 |
| Notebook pickup | 15 x 18 | 10 x 10 |
| Robot bench, including storage | 88 x 53 | 59 x 35 |
| Robot arm and base | 61 x 54 | 32 x 39 |
| Sensor pickup | 19 x 15 | 11 x 8 |
| Computer desk | 105 x 47 | 76 x 33 |
| Both monitors | 78 x 34 | 56 x 23 |
| Computer stool | 26 x 28 | 16 x 19 |
| Keyboard | 29 x 9 | 24 x 8 |
| Computer electronics pair | 47 x 18 | 35 x 14 |
| Right potted plant | 42 x 47 | 33 x 33 |

The tall bookcase, books, box and left plant remain architectural decoration, approximately 54 by 92 pixels together.
The chalkboard remains approximately 108 by 60 pixels, the windows 50 by 52, the pendant lights 28 by 26, and the switch 12 by 21.
These fixtures keep their original scale and position within a few generated pixels.
The room remains 384 by 256 pixels.

Collision rectangles follow the final furniture positions and include separate chair and stool footprints.
The eleven interactions follow the furniture surfaces and accept every reachable facing direction.
The paper station, robot and computer each use two target rectangles to cover their separate exposed surfaces.
The entry point and exit remain unchanged.
The notebook and sensor artwork moves with the smaller desks, so both pickup images have new coordinates.
The doorway light is unchanged.
