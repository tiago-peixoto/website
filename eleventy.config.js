const SPRITES = {
  hero: {
    file: "tiago-burgundy.webp", size: [1536, 1024], crop: [48, 50, 500, 950],
    label: "Pixel art of Tiago in a burgundy shirt holding a tennis racket",
  },
  back: {
    file: "tiago-burgundy.webp", size: [1536, 1024], crop: [585, 93, 935, 900],
    label: "Pixel art of Tiago seen from behind, racket raised",
  },
  bug: {
    file: "bug-beetle.webp", size: [1254, 1254], crop: [83, 235, 1068, 892],
    label: "Pixel art of a green beetle facing Tiago",
  },
};

export default function (eleventyConfig) {
  eleventyConfig.addPassthroughCopy({ "src/assets": "assets" });

  eleventyConfig.addShortcode("sprite", (name) => {
    const { file, size, crop, label } = SPRITES[name];
    const [x, y, width, height] = crop;
    // Clip the source so the other pose cannot appear in the fitted viewBox's side margins.
    return `<svg class="sprite ${name}" viewBox="${crop.join(" ")}" role="img" aria-label="${label}">
      <defs><clipPath id="sprite-${name}-clip"><rect x="${x}" y="${y}" width="${width}" height="${height}"/></clipPath></defs>
      <image href="/assets/sprites/${file}" width="${size[0]}" height="${size[1]}" clip-path="url(#sprite-${name}-clip)"/>
    </svg>`;
  });
}

export const config = { dir: { input: "src" } };
