import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
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
const script = `/*\n${read("assets/phaser-LICENSE.txt")}\n*/\nconst previewAssets = ${JSON.stringify(assets)};\n${stripImports(read("assets/plaza-map.js"))}\n${stripImports(read("assets/plaza-state.js"))}\n${stripImports(read("assets/plaza-challenges.js"))}\n${stripImports(read("assets/plaza-dialogue.js"))}\n${stripImports(read("assets/plaza.js"))}\nconst previewStartPlaza = startPlaza;\n${entry}`;
assert(!/import\.meta|\bimport\s*\(/.test(script));
const pages = {};
for (const [language, path] of [["en", "play/index.html"], ["pt-BR", "pt/play/index.html"]]) {
  let html = read(path).replace(/<script type="module"[^>]+><\/script>/, "");
  html = html.replace(/<link rel="stylesheet"[^>]+>/, () => `<style>${read("assets/plaza.css")}</style>`);
  html = html.replace(/<link rel="icon"[^>]+>/, () => `<link rel="icon" href="${data(resolve("_site/assets/ball.svg"), "image/svg+xml")}">`);
  html = html.replace(/<a href="[^"]+" lang="[^"]+" hreflang="[^"]+">[^<]+<\/a>/, "");
  html = html.replaceAll('href="../../', 'href="https://tiagop.dev.br/').replaceAll('href="../', 'href="https://tiagop.dev.br/');
  html = html.replace(/href="https:\/\/tiagop\.dev\.br\/[^"\n]*"/g, 'href="#" onclick="event.preventDefault()" title="Portfolio links are disabled in this offline preview"');
  assert(!/<(?:script|link|img)[^>]+(?:src|href)="(?:\.\.?\/|https?:)/.test(html));
  pages[language] = html;
}
const safe = (value) => JSON.stringify(value).replaceAll("<", "\\u003c");
const play = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Walker playable review</title>
<style>body{margin:0;background:#153a37;font:16px system-ui;color:#fff}header{height:48px;display:flex;align-items:center;justify-content:space-between;padding:0 12px;gap:8px}select{font:inherit;padding:6px}iframe{display:block;width:100%;height:calc(100svh - 48px);border:0}</style>
<header><strong>Grounded walk + run</strong><label>Language <select id="language"><option value="en">English</option><option value="pt-BR">Português</option></select></label></header>
<iframe title="Playable plaza with running"></iframe><script>const pages=${safe(pages)}, source=${safe(script)};const select=document.querySelector('select'),frame=document.querySelector('iframe');frame.onload=()=>{const s=frame.contentDocument.createElement('script');s.textContent=source;frame.contentDocument.body.append(s)};function show(){frame.srcdoc=pages[select.value]}select.addEventListener('change',show);show();</script></html>`;

const before = `data:image/png;base64,${execFileSync("git", ["show", "ad736259e74a8b3f81ef21a59721969352d249fc:src/assets/plaza-art/walker-grounded.png"]).toString("base64")}`;
const terrain = maps[0].tilesets.find((set) => set.image);
const directions = ["Down", "Left", "Right", "Up"];
const options = { before, after: assets["plaza-art/walker-grounded.png"] };
const canvas = (version, row, gait, frame, cls = "") => `<canvas width="64" height="56" class="${cls}" data-version="${version}" data-row="${row}" data-gait="${gait}" ${frame === undefined ? "data-animated" : `data-frame="${frame}"`} role="img" aria-label="${version}, ${directions[row]} ${gait}${frame === undefined ? " cycle" : ` frame ${frame + 1}`}"></canvas>`;
const card = (version, row, gait) => `<article class="walker-card"><h4>${version === "before" ? "Before · ad736259" : "After · revised Grounded"}</h4><div class="walker-inspect"><div class="walker-samples"><figure>${canvas(version, row, gait)}<figcaption>1× · actual pixels</figcaption></figure><figure>${canvas(version, row, gait, undefined, "walker-large")}<figcaption>4× · animated cycle</figcaption></figure></div><div class="walker-strip" role="region" tabindex="0" aria-label="${version} ${directions[row]} ${gait}, all eight numbered frames"><div class="walker-frames">${Array.from({length: 8}, (_, frame) => `<figure>${canvas(version, row, gait, frame, "walker-still")}<figcaption>Frame ${frame + 1}</figcaption></figure>`).join("")}</div></div></div></article>`;
const part = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Grounded walk and run / second pass</title>
<section id="walker-review" aria-labelledby="walker-title">
<style>
#walker-review{font:16px/1.5 system-ui;color:#f4eedf;background:#142e2b;padding:clamp(16px,3vw,40px);max-width:1500px;margin:auto}#walker-review *{box-sizing:border-box}#walker-review h2{font:700 clamp(30px,4vw,48px)/1.1 Georgia,serif;margin:12px 0}#walker-review h3{font-size:24px;margin:36px 0 12px}#walker-review h4{font-size:17px;margin:0 0 16px}#walker-review p{max-width:75ch}#walker-review button{font:inherit;min-height:44px;padding:8px 16px;border:1px solid #ebc987;background:#f4eedf;color:#142e2b;border-radius:4px}#walker-review :focus-visible{outline:3px solid #f6c86d;outline-offset:3px}.walker-eyebrow{letter-spacing:.1em;text-transform:uppercase;color:#ebc987;font-size:13px}.walker-toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:24px 0}.walker-card{padding:16px;background:#203d37;border:1px solid #4b6253;border-radius:8px;margin:12px 0;min-width:0}.walker-inspect{display:grid;grid-template-columns:344px minmax(0,1fr);gap:24px;align-items:center}.walker-samples{display:flex;gap:16px;align-items:flex-end}.walker-samples figure,.walker-frames figure{margin:0;text-align:center;flex:none}.walker-samples canvas,.walker-frames canvas{display:block;image-rendering:pixelated}.walker-large{width:256px;height:224px}.walker-still{width:128px;height:112px}.walker-frames{display:flex;gap:12px;width:max-content;padding:4px}.walker-frames figure{border:2px solid transparent;padding:4px}.walker-frames figure.active{border-color:#ebc987}.walker-strip{overflow-x:auto;min-width:0;padding-bottom:12px}.walker-card figcaption{font-size:12px;color:#dad6c5;padding-top:6px}.walker-note{padding:16px 20px;background:#304b40;border-left:4px solid #ebc987}.walker-frame-status{min-width:80px}@media(max-width:850px){.walker-inspect{grid-template-columns:minmax(0,1fr)}.walker-samples{flex-wrap:wrap;justify-content:center}.walker-card{padding:12px}.walker-strip{width:100%}.walker-large{max-width:100%;height:auto}}body{margin:0;background:#142e2b}
</style>
<p class="walker-eyebrow">Character only / 26 November 2026 / Second pass</p><h2 id="walker-title">Grounded steps. Complete arms.</h2>
<p>The revised walk keeps the quiet pace of option A. The run has complete bent arms, visible hands and a separate stride.</p>
<p>The approved head stays fixed within each direction. The generated body now includes the shoulders, so the export cannot cut the arms at the chest.</p>
<div class="walker-note" data-task-id="website-walker-v2-review-20261126"><strong>Review question:</strong> Keep this revised Grounded walk and run, or iterate? If a pose needs work, name the gait, direction and frame number.</div>
<p>Each comparison shows the reviewed proposal beside the revision on the same plaza floor. The numbered strips show every frame at 2× size.</p>
<div class="walker-toolbar"><button id="walker-pause" type="button">Pause animation</button><button id="walker-step" type="button">Next frame</button><span id="walker-status" role="status"></span></div>
${["walk", "run"].map(gait => `<h2>${gait === "walk" ? "Grounded walk" : "Run"}</h2><p>${gait === "walk" ? "Eight frames at 12 frames per second. Walking speed remains 60 pixels per second." : "Eight frames at 16 frames per second. Running speed remains 102 pixels per second."}</p>${directions.map((direction,row) => `<section><h3>${direction} · ${gait}</h3>${card("before",row,gait)}${card("after",row,gait)}</section>`).join("")}`).join("")}
<p class="walker-note">Reduced motion starts this page paused. Use Next frame for still inspection. In the game, reduced motion keeps the directional idle pose.</p>
<p>The playable review contains only the revised Grounded walk and run. Keyboard controls, touch controls and both languages remain available.</p>
</section><script>(()=>{
const root=document.querySelector('#walker-review'), options=${safe(options)}, ground=${safe(maps[0].layers.find(layer=>layer.name === "ground"))}, tiles=${safe(terrain)};
const load=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src});
const motion=matchMedia('(prefers-reduced-motion: reduce)');let paused=motion.matches,time=0,last=0,step=0;
const pause=root.querySelector('#walker-pause'),status=root.querySelector('#walker-status');
function labels(){pause.textContent=paused?'Play animation':'Pause animation';pause.setAttribute('aria-pressed',String(paused));status.textContent=paused?'Paused. Use Next frame to inspect all eight poses.':'Playing at the game animation rates.'}labels();
pause.onclick=()=>{paused=!paused;labels()};root.querySelector('#walker-step').onclick=()=>{paused=true;step=(step+1)%8;time=0;labels()};motion.addEventListener('change',()=>{paused=motion.matches;labels()});
Promise.all([load(${safe(assets[`plaza-art/${terrain.image}`])}),load(${safe(assets["plaza-art/walker-shadow.png"])}),load(options.before),load(options.after)]).then(([floor,shadow,before,after])=>{
const sheets={before,after};const canvases=[...root.querySelectorAll('canvas')];
function render(canvas,frame){const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
for(let y=0;y<4;y++)for(let x=0;x<4;x++){const tile=ground.data[(10+y)*ground.width+10+x]-tiles.firstgid;c.drawImage(floor,(tile%tiles.columns)*16,Math.floor(tile/tiles.columns)*16,16,16,x*16,y*16,16,16)}
c.drawImage(shadow,24,45);const col=(canvas.dataset.gait==='run'?9:1)+frame;c.drawImage(sheets[canvas.dataset.version],col*32,Number(canvas.dataset.row)*48,32,48,16,4,32,48);canvas.dataset.rendered=String(frame+1)}
for(const canvas of canvases.filter(c=>c.dataset.frame!==undefined))render(canvas,Number(canvas.dataset.frame));
function draw(now){if(!paused&&last)time+=Math.min(now-last,100);last=now;
for(const canvas of canvases){const frame=(Math.floor(time*(canvas.dataset.gait==='run'?16:12)/1000)+step)%8;
if(canvas.hasAttribute('data-animated'))render(canvas,frame);else canvas.parentElement.classList.toggle('active',Number(canvas.dataset.frame)===frame)}requestAnimationFrame(draw)}requestAnimationFrame(draw);root.dataset.ready='true';
}).catch(()=>{status.textContent='An embedded sprite could not load.'});
})();<\/script></html>`;
assert(!part.includes("—"));
assert.equal((part.match(/data-frame="/g) || []).length, 128);
assert.equal((part.match(/data-animated/g) || []).length, 33);
mkdirSync(destination, { recursive: true });
for (const [name, html] of [["part.html", part], ["play.html", play]]) {
  writeFileSync(resolve(destination, name), html);
  console.log(`${name}: ${Buffer.byteLength(html)} bytes, assets and scripts embedded`);
}
