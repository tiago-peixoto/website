import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const output = process.argv[2];
assert(output, "Usage: node scripts/plaza-preview.js /absolute/path/plaza.html (after npm run build)");
const read = (name) => readFileSync(resolve("_site", name), "utf8");
const data = (name, type) => `data:${type};base64,${readFileSync(resolve("_site", name)).toString("base64")}`;
const art = JSON.parse(read("assets/plaza-art/courtyard.tmj"));
const assets = {};
for (const name of ["plaza-navigation.tmj", "plaza-art/courtyard.tmj", "plaza-art/walker-layout.json"]) {
  assets[name] = data(`assets/${name}`, "application/json");
}
const images = new Set(["walker-sheet.png"]);
for (const tileset of art.tilesets) {
  if (tileset.image) images.add(tileset.image);
  for (const tile of tileset.tiles || []) images.add(tile.image);
}
for (const image of images) assets[`plaza-art/${image}`] = data(`assets/plaza-art/${image}`, "image/png");

function replaceOnce(text, from, to) {
  assert.equal(text.split(from).length, 2, `preview adapter must match exactly once: ${from}`);
  return text.replace(from, () => to);
}
let entry = read("assets/plaza-entry.js");
entry = replaceOnce(entry, 'import("./plaza.js")', "Promise.resolve({ startPlaza: previewStartPlaza })");
entry = replaceOnce(entry, 'script.src = new URL("./phaser.min.js", import.meta.url).href;', `script.textContent = ${JSON.stringify(read("assets/phaser.min.js"))};`);
entry = replaceOnce(entry, "document.head.append(script);", "document.head.append(script);\n    if (window.Phaser) script.onload();");
entry = replaceOnce(entry, '(name) => new URL(`./${name}`, import.meta.url).href', "(name) => previewAssets[name]");
const rules = read("assets/plaza-map.js").replace(/^export /gm, "");
let game = read("assets/plaza.js");
game = replaceOnce(game, 'import { navigation } from "./plaza-map.js";\n', "").replace(/^export /gm, "");
assert(!/\bimport\s*\(|import\.meta/.test(game));
let html = read("play/index.html");
html = replaceOnce(html, '<title>A little plaza - Tiago Peixoto</title>', '<title>Phaser + Tiled prototype</title>');
html = replaceOnce(html, '<h1>A little plaza</h1>', '<h1>Phaser + Tiled prototype</h1>');
html = replaceOnce(html, '<script type="module" src="../assets/plaza-entry.js"></script>', "");
html = replaceOnce(html, '<link rel="stylesheet" href="../assets/plaza.css">', `<style>${read("assets/plaza.css")}</style>`);
html = replaceOnce(html, 'href="../assets/ball.svg"', `href="${data("assets/ball.svg", "image/svg+xml")}"`);
const site = JSON.parse(readFileSync("src/_data/site.json", "utf8")).url;
html = html.replaceAll('href="../pt/play/"', `href="${site}/pt/"`).replaceAll('href="../', `href="${site}/`);
const script = `/*\n${read("assets/phaser-LICENSE.txt")}\n*/\nconst previewAssets = ${JSON.stringify(assets)};\n${rules}\n${game}\nconst previewStartPlaza = startPlaza;\n${entry}`.replaceAll("</script", "<\\/script");
html = replaceOnce(html, "</body>", `<script>${script}</script>\n</body>`);
assert(!/<(?:script|link|img)[^>]+(?:src|href)="(?:\.\.?\/|https?:)/.test(html), "preview must not request external resources");
mkdirSync(dirname(resolve(output)), { recursive: true });
writeFileSync(output, html);
console.log(`Wrote self-contained English preview: ${output} (${Buffer.byteLength(html)} bytes)`);
