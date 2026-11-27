import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = process.argv[2];
assert(output, "Usage: node tools/plaza-preview.mjs /absolute/path/play.html (after npm run build)");
const read = (name) => readFileSync(resolve(root, "_site", name), "utf8");
const data = (name, type) => `data:${type};base64,${readFileSync(resolve(root, "_site", name)).toString("base64")}`;
const assets = {};
const images = new Set(["walker-grounded.png", "walker-shadow.png", "lamp-glow.png", "lamp-pool.png", "fish.png", "splash.png", "door-light.png"]);
for (const name of ["plaza-navigation.tmj", "plaza-art/courtyard.tmj", "plaza-art/outside.tmj", "plaza-art/interior.tmj", "plaza-art/walker-motion.json"]) {
  assets[name] = data(`assets/${name}`, "application/json");
  for (const tileset of JSON.parse(read(`assets/${name}`)).tilesets || []) {
    if (name === "plaza-navigation.tmj") continue;
    if (tileset.image) images.add(tileset.image);
    for (const tile of tileset.tiles || []) images.add(tile.image);
  }
}
for (const image of images) assets[`plaza-art/${image}`] = data(`assets/plaza-art/${image}`, "image/png");
function replaceOnce(text, from, to) {
  assert.equal(text.split(from).length, 2, `preview adapter must match exactly once: ${from}`);
  return text.replace(from, () => to);
}
const scriptBody = (file) => read(`assets/${file}`).replace(/^import .*;\n/gm, "").replace(/^export /gm, "");
let entry = scriptBody("plaza-entry.js");
entry = replaceOnce(entry, 'import("./plaza.js")', "Promise.resolve({ startPlaza: previewStartPlaza })");
entry = replaceOnce(entry, 'script.src = new URL("./phaser.min.js", import.meta.url).href;', `script.textContent = ${JSON.stringify(read("assets/phaser.min.js"))};`);
entry = replaceOnce(entry, "document.head.append(script);", "document.head.append(script);\n    if (window.Phaser) script.onload();");
entry = replaceOnce(entry, '(name) => new URL(`./${name}`, import.meta.url).href', "(name) => previewAssets[name]");
const bundle = [
  `/*\n${read("assets/phaser-LICENSE.txt")}\n*/`,
  `const previewAssets = ${JSON.stringify(assets)};`,
  ...["plaza-map.js", "plaza-state.js", "plaza-challenges.js", "plaza-dialogue.js", "plaza-experiments.js", "plaza.js"].map(scriptBody),
  "const previewStartPlaza = startPlaza;",
  entry,
].join("\n");
assert(!/\bimport\s*\(|import\.meta|^import /m.test(bundle), "standalone code must not import modules");
const documents = {};
for (const [lang, prefix, other] of [["en", "", "pt-BR"], ["pt-BR", "pt/", "en"]]) {
  let html = read(`${prefix}play/index.html`);
  html = html.replace(/<script type="module"[^>]+><\/script>/, "");
  html = html.replace(/<link rel="stylesheet"[^>]+>/, () => `<style>${read("assets/plaza.css")}</style>`);
  html = html.replace(/<link rel="icon"[^>]+>/, () => `<link rel="icon" href="${data("assets/ball.svg", "image/svg+xml")}">`);
  html = html.replace(/href="[^"#][^"]*"/g, (attribute) => attribute.startsWith('href="data:') ? attribute : 'href="#"');
  const previewLinks = `document.querySelector('header a[hreflang]').addEventListener('click', (event) => { event.preventDefault(); parent.postMessage({ previewLanguage: ${JSON.stringify(other)} }, '*'); });
    for (const link of document.querySelectorAll('a:not([hreflang])')) link.addEventListener('click', (event) => event.preventDefault());`;
  html = replaceOnce(html, "</body>", `<script>${(bundle + "\n" + previewLinks).replaceAll("</script", "<\\/script")}</script>\n</body>`);
  assert(!/<(?:script|link|img)[^>]+(?:src|href)="(?:\.\.?\/|https?:)/.test(html), "no external resources");
  documents[lang] = html;
}
const payload = JSON.stringify(documents).replaceAll("<", "\\u003c");
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Interactions playable review</title>
<style>html,body,iframe{margin:0;width:100%;height:100%;border:0;display:block}body{background:#153a37}</style>
<iframe title="Playable interaction review in English and Portuguese" sandbox="allow-scripts allow-same-origin"></iframe>
<script>const documents=${payload};const frame=document.querySelector('iframe');frame.srcdoc=documents.en;
window.addEventListener('message',event=>{if(event.source===frame.contentWindow&&documents[event.data?.previewLanguage])frame.srcdoc=documents[event.data.previewLanguage];});</script></html>`;
mkdirSync(dirname(resolve(output)), { recursive: true });
writeFileSync(output, html);
console.log(`Wrote bilingual standalone preview: ${output} (${Buffer.byteLength(html)} bytes)`);
