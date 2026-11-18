// One character per pixel. Edit a grid to redraw a sprite.
const SPRITES = {
  hero: [
    "......ooooo.........",
    "....oohhhhhoo.......",
    "...ohhHHhhhhho......",
    "..ohhHhhhhhhhho.rrr.",
    "..ohhhhhhhhhhhorn.nr",
    "..orrrrrrrrrrror.n.r",
    "..oswgssswgssSorn.nr",
    "..osggsssggssSor.n.r",
    "..ossssssssssSo.rrr.",
    "...ossssmmssSo...k..",
    "....oosssssSoo...k..",
    "....otttssttto...k..",
    "...otttttttttTo..k..",
    "..ostttttttttTsssk..",
    "..ostttttttttTooo...",
    "..ostttttttttTo.....",
    "...oottttttttTo.....",
    "....opppppppPo......",
    "....opppooppPo......",
    "....osso..osSo......",
    "....osso..osSo......",
    "....owwo..owwo......",
    "...owwwo..owwwo.....",
    "...ooooo..ooooo.....",
  ],
  back: [
    "......oooooo...........",
    "....oohhhhhhoo....rrr..",
    "...ohhhHHhhhhho..rn.nr.",
    "..ohhhHHhhhhhhho.r.n.r.",
    "..ohhhhhhhhhhhho.rn.nr.",
    "..orrrrrrrrrrrro.r.n.r.",
    ".oshhhhhhhhhhhhsorn.nr.",
    ".oshhhhhhhhhhhhso.rrr..",
    "..ohhhhhhhhhhhho...k...",
    "...ohhhhhhhhhho....k...",
    "....oosssssSoo.....k...",
    "...oottttttttttToo.k...",
    "..otttttttttttttTo.k...",
    ".otttttttttttttttTok...",
    ".otttotttttttttoTTok...",
    ".osssotttttttttosSsk...",
    ".osssotttttttttosSsk...",
    "..oooottttttttToooo....",
    ".....opppppppppo.......",
    ".....opppppppPPo.......",
  ],
  bug: [
    "..o......o..",
    "...o....o...",
    "...oooooo...",
    "..obbbbbbo..",
    ".obwobbwobo.",
    "oobbbbbbbboo",
    ".obbBBBBbbo.",
    "oobbbbbbbboo",
    ".obBbbbbBbo.",
    "o.oooooooo.o",
  ],
};
const LABELS = {
  hero: "Pixel art of Tiago holding a tennis racket",
  back: "Pixel art of Tiago seen from behind, racket raised",
  bug: "Pixel art of a green bug",
};
const COLORS = {
  o: "#1a1026", h: "#4a3020", H: "#6e4a30", s: "#f0bd90", S: "#cf9468",
  g: "#1a1026", m: "#b5524a", t: "#d7f23a", T: "#a9c21f",
  p: "#5b6ee1", P: "#4252b8", w: "#f4f4f4", r: "#e2463c", n: "#f4f4f4",
  k: "#3a3a4a", b: "#5fc24a", B: "#3d8f31",
};

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  eleventyConfig.addShortcode("sprite", (name) => {
    const grid = SPRITES[name];
    const rects = grid.flatMap((row, y) =>
      [...row].map((c, x) =>
        COLORS[c] ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${COLORS[c]}"/>` : "",
      ),
    ).join("");
    return `<svg class="sprite ${name}" viewBox="0 0 ${grid[0].length} ${grid.length}" shape-rendering="crispEdges" role="img" aria-label="${LABELS[name]}">${rects}</svg>`;
  });
}

export const config = { dir: { input: "src" } };
