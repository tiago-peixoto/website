import assert from "node:assert/strict";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const destination = process.argv[2];
assert(destination, "Usage: node tools/walker-preview.mjs /absolute/review/directory (after npm run build)");
const read = (name) => readFileSync(resolve("_site", name), "utf8");
const data = (name, type = "image/png") => `data:${type};base64,${readFileSync(name).toString("base64")}`;
const json = (name) => JSON.parse(read(`assets/${name}`));
const maps = ["courtyard", "outside", "interior"].map((name) => json(`plaza-art/${name}.tmj`));
const assets = {};
for (const name of ["plaza-navigation.tmj", "plaza-art/courtyard.tmj", "plaza-art/outside.tmj", "plaza-art/interior.tmj", "plaza-art/walker-motion.json"]) {
  assets[name] = data(resolve("_site/assets", name), "application/json");
}
const images = new Set(["walker-grounded.png", "walker-shadow.png", "lamp-glow.png", "lamp-pool.png", "fish.png", "splash.png", "door-light.png"]);
for (const art of maps) for (const set of art.tilesets) {
  if (set.image) images.add(set.image);
  for (const tile of set.tiles || []) images.add(tile.image);
}
for (const name of images) assets[`plaza-art/${name}`] = data(resolve("_site/assets/plaza-art", name));

function replaceOnce(text, from, to) {
  assert.equal(text.split(from).length, 2, `preview must match once: ${from}`);
  return text.replace(from, () => to);
}
const stripImports = (text) => text.replace(/^import .*?;\n/gm, "").replace(/^export /gm, "");
let entry = stripImports(read("assets/plaza-entry.js"));
entry = replaceOnce(entry, 'import("./plaza.js")', "Promise.resolve({ startPlaza: previewStartPlaza })");
entry = replaceOnce(entry, 'script.src = new URL("./phaser.min.js", import.meta.url).href;', `script.textContent = ${JSON.stringify(read("assets/phaser.min.js"))};`);
entry = replaceOnce(entry, "document.head.append(script);", "document.head.append(script);\n    if (window.Phaser) script.onload();");
entry = replaceOnce(entry, '(name) => new URL(`./${name}`, import.meta.url).href', "(name) => previewAssets[name]");
const script = `/*\n${read("assets/phaser-LICENSE.txt")}\n*/\nconst previewAssets = ${JSON.stringify(assets)};\n${stripImports(read("assets/plaza-map.js"))}\n${stripImports(read("assets/plaza-state.js"))}\n${stripImports(read("assets/plaza.js"))}\nconst previewStartPlaza = startPlaza;\n${entry}`;
assert(!/import\.meta|\bimport\s*\(/.test(script));
const pages = {};
for (const [language, path] of [["en", "play/index.html"], ["pt-BR", "pt/play/index.html"]]) {
  let html = read(path).replace(/<script type="module"[^>]+><\/script>/, "");
  html = html.replace(/<link rel="stylesheet"[^>]+>/, () => `<style>${read("assets/plaza.css")}</style>`);
  html = html.replace(/<link rel="icon"[^>]+>/, () => `<link rel="icon" href="${data(resolve("_site/assets/ball.svg"), "image/svg+xml")}">`);
  html = html.replace(/<a href="[^"]+" lang="[^"]+" hreflang="[^"]+">[^<]+<\/a>/, "");
  html = html.replaceAll('href="../../', 'href="https://tiagop.dev.br/').replaceAll('href="../', 'href="https://tiagop.dev.br/');
  assert(!/<(?:script|link|img)[^>]+(?:src|href)="(?:\.\.?\/|https?:)/.test(html));
  pages[language] = html;
}
const safe = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");
const play = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Walker playable review</title>
<style>body{margin:0;background:#153a37;font:16px system-ui;color:#fff}header{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;gap:8px}select{font:inherit;padding:6px}iframe{display:block;width:100%;height:calc(100svh - 48px);border:0}</style>
<header><strong>Grounded walk + run</strong><label>Language <select id="language"><option value="en">English</option><option value="pt-BR">Português</option></select></label></header>
<iframe title="Playable plaza with running"></iframe><script>const pages=${safe(pages)}, source=${safe(script)};const select=document.querySelector('select'),frame=document.querySelector('iframe');frame.onload=()=>{const s=frame.contentDocument.createElement('script');s.textContent=source;frame.contentDocument.body.append(s)};function show(){frame.srcdoc=pages[select.value]}select.addEventListener('change',show);show();</script></html>`;

const old = data(resolve("src/assets/plaza-art/walker-sheet.png"));
const lively = data(resolve("tools/walker-art/lively-sheet.png"));
const terrain = maps[0].tilesets.find((set) => set.image);
const comparison = {
  current: { title: "Current", description: "6 frames · 10 fps · fixed upper body", image: old, count: 6, start: 1, fps: 10 },
  grounded: { title: "A · Grounded", description: "Recommended · 8 frames · 12 fps · subtle weight shift", image: assets["plaza-art/walker-grounded.png"], count: 8, start: 1, fps: 12 },
  lively: { title: "B · Lively", description: "8 frames · 12 fps · stronger bounce and arm swing", image: lively, count: 8, start: 1, fps: 12 },
};
const directions = ["Down", "Left", "Right", "Up"];
const card = (key, row, run = false) => `<article class="walker-card ${key === "grounded" ? "walker-recommended" : ""}"><h3>${run ? "Run" : comparison[key].title} · ${directions[row]}</h3><p>${run ? "8 frames · 16 fps · 1.7× walking speed" : comparison[key].description}</p><div class="walker-samples"><figure><canvas width="64" height="56" data-option="${key}" data-row="${row}" data-run="${run}" role="img" aria-label="${directions[row]} ${run ? "run" : key + " walk"}, native size"></canvas><figcaption>1× · native pixels</figcaption></figure><figure><canvas class="walker-large" width="64" height="56" data-option="${key}" data-row="${row}" data-run="${run}" role="img" aria-label="${directions[row]} ${run ? "run" : key + " walk"}, four times enlarged"></canvas><figcaption>4× · inspect the motion</figcaption></figure></div></article>`;
const part = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Walker motion comparison</title>
<section id="walker-review" aria-labelledby="walker-title">
<style>#walker-review{font:16px/1.5 system-ui;color:#f4eedf;background:#142e2b;padding:clamp(16px,3vw,40px);max-width:1500px;margin:auto}#walker-review *{box-sizing:border-box}#walker-review h2{font-size:clamp(28px,4vw,44px);line-height:1.1;margin:12px 0}#walker-review h3{font-size:18px;margin:0}#walker-review p{max-width:80ch}#walker-review button{font:inherit;min-height:44px;padding:8px 16px;border:1px solid #ebc987;background:#f4eedf;color:#142e2b;border-radius:4px}#walker-review button:focus-visible{outline:3px solid #f6c86d;outline-offset:3px}.walker-eyebrow{letter-spacing:.12em;text-transform:uppercase;color:#ebc987}.walker-toolbar{display:flex;gap:12px;flex-wrap:wrap;margin:24px 0}.walker-grid{display:grid;grid-template-columns:repeat(3,minmax(320px,1fr));gap:16px}.walker-card{padding:16px;background:#203d37;border:1px solid #4b6253;border-radius:8px}.walker-recommended{border-color:#ebc987}.walker-card p{font-size:14px;min-height:42px;color:#dad6c5}.walker-samples{display:flex;align-items:flex-end;justify-content:center;gap:8px;flex-wrap:wrap}.walker-samples figure{margin:0;text-align:center}.walker-samples canvas{display:block;image-rendering:pixelated;margin:auto}.walker-large{width:256px;height:224px}.walker-samples figcaption{font-size:12px;margin-top:8px;color:#dad6c5}.walker-run{grid-template-columns:repeat(2,minmax(320px,1fr))}.walker-note{padding:16px 20px;background:#304b40;border-left:4px solid #ebc987}.walker-overflow{overflow-x:auto;padding-bottom:12px}@media(max-width:750px){.walker-grid{width:1010px}.walker-run{width:auto;grid-template-columns:1fr}.walker-samples{justify-content:space-around}}</style>
<p class="walker-eyebrow">Character study · original generated art</p><h2 id="walker-title">A little more life in each step.</h2>
<p>Two new walks, the same Tiago. Every view uses the plaza floor, the approved palette, and the locked head and shoulders.</p>
<p class="walker-note"><strong>Recommendation: A · Grounded.</strong> Eight distinct poses soften the footfalls without making a quiet stroll look hurried. B adds a larger bounce and broader gestures. The playable review uses A.</p>
<div class="walker-toolbar"><button id="walker-pause" type="button">Pause animation</button><button id="walker-step" type="button">Next frame</button><span id="walker-status" role="status"></span></div>
<div class="walker-overflow"><div class="walker-grid">${directions.map((_, row) => Object.keys(comparison).map((key) => card(key, row)).join("")).join("")}</div></div>
<h2>Pick up the pace.</h2><p>Hold Shift while moving, or turn on Run before holding a touch direction. A visible toggle avoids an undiscoverable long-press. Run uses a separate eight-frame cycle at 102 pixels per second. Walk stays at 60.</p>
<div class="walker-grid walker-run">${directions.map((_, row) => card("grounded", row, true)).join("")}</div>
<p class="walker-note">Reduced motion starts this comparison paused. Next frame supports still inspection. In the game, movement and running remain available with a static directional pose. Run turns off when leaving play, opening the menu, or changing places through the directory.</p>
<p>Review A, B, or the current walk in the combined review document. No selection on this page changes the live website.</p>
</section><script>(()=>{
const root=document.querySelector('#walker-review'), options=${safe(comparison)}, ground=${safe(maps[0].layers.find((layer) => layer.name === "ground"))}, tiles=${safe(terrain)};
const load=(src)=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src});
const motion=matchMedia('(prefers-reduced-motion: reduce)');let paused=motion.matches,time=0,last=0,step=0;
const pause=root.querySelector('#walker-pause'),status=root.querySelector('#walker-status');
function labels(){pause.textContent=paused?'Play animation':'Pause animation';pause.setAttribute('aria-pressed',String(paused));status.textContent=paused?'Paused. Inspect each pose with Next frame.':'Playing at the game animation rates.'}labels();
pause.onclick=()=>{paused=!paused;labels()};root.querySelector('#walker-step').onclick=()=>{paused=true;step++;labels()};motion.addEventListener('change',()=>{paused=motion.matches;labels()});
Promise.all([load(${safe(assets[`plaza-art/${terrain.image}`])}),load(${safe(assets["plaza-art/walker-shadow.png"])}),...Object.values(options).map(o=>load(o.image))]).then(([floor,shadow,...sheets])=>{
const textures=Object.fromEntries(Object.keys(options).map((key,i)=>[key,sheets[i]]));
function draw(now){if(!paused&&last)time+=Math.min(now-last,100);last=now;
for(const canvas of root.querySelectorAll('canvas')){const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;const o=options[canvas.dataset.option],run=canvas.dataset.run==='true',row=Number(canvas.dataset.row),count=run?8:o.count,fps=run?16:o.fps,col=(run?9:o.start)+(Math.floor(time*fps/1000)+step)%count;
for(let y=0;y<4;y++)for(let x=0;x<4;x++){const tile=ground.data[(10+y)*ground.width+10+x]-tiles.firstgid;c.drawImage(floor,(tile%tiles.columns)*16,Math.floor(tile/tiles.columns)*16,16,16,x*16,y*16,16,16)}
c.drawImage(shadow,24,45);c.drawImage(textures[canvas.dataset.option],col*32,row*48,32,48,16,4,32,48)}requestAnimationFrame(draw)}requestAnimationFrame(draw)
}).catch(()=>{status.textContent='An embedded sprite could not load.'});
})();<\/script></html>`;
mkdirSync(destination, { recursive: true });
for (const [name, html] of [["part.html", part], ["play.html", play]]) {
  writeFileSync(resolve(destination, name), html);
  console.log(`${name}: ${Buffer.byteLength(html)} bytes, assets and scripts embedded`);
}
