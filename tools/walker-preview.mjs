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
const script = `/*\n${read("assets/phaser-LICENSE.txt")}\n*/\nconst previewAssets = ${JSON.stringify(assets)};\n${stripImports(read("assets/plaza-map.js"))}\n${stripImports(read("assets/plaza-state.js"))}\n${stripImports(read("assets/plaza-challenges.js"))}\n${stripImports(read("assets/plaza-dialogue.js"))}\n${stripImports(read("assets/plaza-experiments.js"))}\n${stripImports(read("assets/plaza.js"))}\nconst previewStartPlaza = startPlaza;\n${entry}`;
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

const before = data(resolve("tools/walker-art/round-2-sheet.png"));
const middle = data(resolve("tools/walker-art/round-3-sheet.png"));
const terrain = maps[0].tilesets.find((set) => set.image);
const directions = ["Down", "Left", "Right", "Up"];
const options = { before, middle, after: assets["plaza-art/walker-grounded.png"] };
const canvas = (version, row, gait, frame, cls = "") => `<canvas width="64" height="56" class="${cls}" data-version="${version}" data-row="${row}" data-gait="${gait}" ${frame === undefined ? "data-animated" : `data-frame="${frame}"`} role="img" aria-label="${version}, ${directions[row]} ${gait}${frame === undefined ? " cycle" : ` frame ${frame + 1}`}"></canvas>`;
const feedback = {
  "walk-Down": '“was this really generated with codex on astra? the before one is way better. go back to that one, fix only the left eye and polish a little bit the chin” - Round 2 restored. Only nine pixels in the left eye and chin change per frame.',
  "walk-Left": '“this is great quality bit it appears to be walking backwards” - The same eight round-3 frames now play in reverse order. The planted foot travels opposite the movement direction.',
  "walk-Right": 'No new note. The mirrored walk had the same backwards motion. Only frame order changes, matching the left walk.',
  "walk-Up": '“go back to previous one” - Every round-2 frame is restored unchanged.',
  "run-Down": '“body is better, but needs to be a bit thinner. face is completely wrong, recover before.” - The round-3 torso is slightly narrower. Legs stay unchanged. The exact round-2 face returns.',
  "run-Left": '“this looks great!” - All round-3 frames remain unchanged.',
  "run-Right": 'No new note. All round-3 frames remain unchanged.',
  "run-Up": '“this looks great!” - All round-3 frames remain unchanged.',
};
const labels = { before: "Round 2 · 1691c9a", middle: "Round 3 · 020191a", after: "New · fourth revision" };
const question = (gait, direction) => `<fieldset class="cycle-question" data-cycle-question><legend>Keep ${direction.toLowerCase()} ${gait}, or iterate?</legend><label><input type="radio" name="${gait}-${direction}" value="keep"> Keep</label><label><input type="radio" name="${gait}-${direction}" value="iterate"> Iterate</label><label class="cycle-notes">Frame or change (optional)<textarea name="${gait}-${direction}-notes" rows="2"></textarea></label></fieldset>`;
const card = (version, row, gait) => `<article class="walker-card"><h4>${labels[version]}</h4><div class="walker-inspect"><div class="walker-samples"><figure>${canvas(version, row, gait)}<figcaption>1× · actual pixels</figcaption></figure><figure>${canvas(version, row, gait, undefined, "walker-large")}<figcaption>4× · animated cycle</figcaption></figure></div><div class="walker-strip" role="region" tabindex="0" aria-label="${version} ${directions[row]} ${gait}, all eight numbered frames"><div class="walker-frames">${Array.from({length: 8}, (_, frame) => `<figure>${canvas(version, row, gait, frame, "walker-still")}<figcaption>Frame ${frame + 1}</figcaption></figure>`).join("")}</div></div></div></article>`;
const part = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Grounded walk and run / fourth review</title>
<section id="walker-review" aria-labelledby="walker-title">
<style>
#walker-review{font:16px/1.5 system-ui;color:#f4eedf;background:#142e2b;padding:clamp(16px,3vw,40px);max-width:1500px;margin:auto}#walker-review *{box-sizing:border-box}#walker-review h2{font:700 clamp(30px,4vw,48px)/1.1 Georgia,serif;margin:12px 0}#walker-review h3{font-size:24px;margin:36px 0 12px}#walker-review h4{font-size:17px;margin:0 0 16px}#walker-review p{max-width:75ch}#walker-review button{font:inherit;min-height:44px;padding:8px 16px;border:1px solid #ebc987;background:#f4eedf;color:#142e2b;border-radius:4px}#walker-review :focus-visible{outline:3px solid #f6c86d;outline-offset:3px}.walker-eyebrow{letter-spacing:.1em;text-transform:uppercase;color:#ebc987;font-size:13px}.walker-toolbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:24px 0}.walker-card{padding:16px;background:#203d37;border:1px solid #4b6253;border-radius:8px;margin:12px 0;min-width:0}.walker-inspect{display:grid;grid-template-columns:344px minmax(0,1fr);gap:24px;align-items:center}.walker-samples{display:flex;gap:16px;align-items:flex-end}.walker-samples figure,.walker-frames figure{margin:0;text-align:center;flex:none}.walker-samples canvas,.walker-frames canvas{display:block;image-rendering:pixelated}.walker-large{width:256px;height:224px}.walker-still{width:128px;height:112px}.walker-frames{display:flex;gap:12px;width:max-content;padding:4px}.walker-frames figure{border:2px solid transparent;padding:4px}.walker-frames figure.active{border-color:#ebc987}.walker-strip{overflow-x:auto;min-width:0;padding-bottom:12px}.walker-card figcaption{font-size:12px;color:#dad6c5;padding-top:6px}.walker-note{padding:16px 20px;background:#304b40;border-left:4px solid #ebc987}.walker-frame-status{min-width:80px}@media(max-width:850px){.walker-inspect{grid-template-columns:minmax(0,1fr)}.walker-samples{flex-wrap:wrap;justify-content:center}.walker-card{padding:12px}.walker-strip{width:100%}.walker-large{max-width:100%;height:auto}}.cycle-nav{display:flex;flex-wrap:wrap;gap:8px}.cycle-nav a{color:#f4eedf;padding:10px;border:1px solid #718171;border-radius:4px}.cycle-question{border:1px solid #ebc987;padding:16px;margin:24px 0 48px}.cycle-question legend{font-weight:700}.cycle-question>label{display:inline-flex;gap:8px;align-items:center;min-height:44px;margin-right:24px}.cycle-question .cycle-notes{display:flex;flex-direction:column;align-items:stretch;margin:8px 0 0}.cycle-question textarea{font:inherit;width:100%;padding:8px;border-radius:4px}#combined-game{display:block;width:100%;height:850px;height:90svh;min-height:680px;border:1px solid #ebc987}#combined-play,#review-decision{padding:24px 0}.decision-card{border:2px solid #ebc987;padding:24px;background:#304b40}#walker-review section{scroll-margin-top:16px}body{margin:0;background:#142e2b}
</style>
<p class="walker-eyebrow">Character only / Fourth review</p><h2 id="walker-title">The requested cycles, one by one.</h2>
<p>Round 2 returns where requested. Round 3 remains where approved. Compare each cycle, then play the combined game.</p>
<p>Original ImageGen artwork. Down walk receives a small generated eye and chin edit. Down run retains its original body with a narrower export.</p>
<p>Each cycle shows round 2, round 3 and the new revision at the same scale. All eight frames appear in numbered strips.</p>
<nav class="cycle-nav" aria-label="Cycles">${["walk", "run"].flatMap(gait => directions.map(direction => `<a href="#${gait}-${direction}">${direction} ${gait}</a>`)).join("")}<a href="#combined-play">Play</a><a href="#review-decision">Decision</a></nav>
<div class="walker-toolbar"><button id="walker-pause" type="button">Pause animation</button><button id="walker-step" type="button">Next frame</button><span id="walker-status" role="status"></span></div>
${["walk", "run"].map(gait => `<h2>${gait === "walk" ? "Grounded walk" : "Run"}</h2><p>${gait === "walk" ? "Eight frames at 12 frames per second. Walking speed remains 60 pixels per second." : "Eight frames at 16 frames per second. Running speed remains 102 pixels per second."}</p>${directions.map((direction,row) => `<section id="${gait}-${direction}"><h3>${direction} · ${gait}</h3><p class="walker-note">${feedback[gait+"-"+direction]}</p>${card("before",row,gait)}${card("middle",row,gait)}${card("after",row,gait)}${question(gait,direction)}</section>`).join("")}`).join("")}
<p class="walker-note">Reduced motion starts this page paused. Use Next frame for still inspection. In the game, reduced motion keeps the directional idle pose.</p>
<p>The playable review contains only the revised Grounded walk and run. Keyboard controls, touch controls and both languages remain available.</p>
</section><script>(()=>{
const root=document.querySelector('#walker-review'), options=${safe(options)}, ground=${safe(maps[0].layers.find(layer=>layer.name === "ground"))}, tiles=${safe(terrain)};
const load=src=>new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=reject;img.src=src});
const motion=matchMedia('(prefers-reduced-motion: reduce)');let paused=motion.matches,time=0,last=0,step=0;
const pause=root.querySelector('#walker-pause'),status=root.querySelector('#walker-status');
function labels(){pause.textContent=paused?'Play animation':'Pause animation';pause.setAttribute('aria-pressed',String(paused));status.textContent=paused?'Paused. Use Next frame to inspect all eight poses.':'Playing at the game animation rates.'}labels();
pause.onclick=()=>{paused=!paused;labels()};root.querySelector('#walker-step').onclick=()=>{paused=true;step=(step+1)%8;time=0;labels()};motion.addEventListener('change',()=>{paused=motion.matches;labels()});
Promise.all([load(${safe(assets[`plaza-art/${terrain.image}`])}),load(${safe(assets["plaza-art/walker-shadow.png"])}),load(options.before),load(options.middle),load(options.after)]).then(([floor,shadow,before,middle,after])=>{
const sheets={before,middle,after};const canvases=[...root.querySelectorAll('canvas')];
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
assert.equal((part.match(/data-frame="/g) || []).length, 192);
assert.equal((part.match(/data-animated/g) || []).length, 49);
mkdirSync(destination, { recursive: true });
const index = part.replace('</section><script>', `<section id="combined-play"><h2>Play the combined game</h2><p>Use arrow keys or WASD to walk. Hold Shift or choose Run to run. On a phone, use the direction controls.</p><p>The notebook correction remains included. All four idle poses remain round 3.</p><iframe id="combined-game" title="Combined playable game"></iframe></section>
<section id="review-decision"><article class="decision-card" data-task-id="website-walker-v4-review-20261126"><h2>Ready for a pull request?</h2><p>Choose ready for a pull request, iterate first, or defer this revision.</p><p>Use the eight cycle answers above to name what should stay or change.</p><p>Overall feedback from round 3: “iterate once again”.</p></article><p>Local branch <code>fm/walker-v4</code>. This review contains the complete game and all comparison assets.</p></section>
</section><script>document.querySelector('#combined-game').srcdoc=${safe(play)};<\/script><script>`);
assert.equal((index.match(/data-cycle-question/g) || []).length, 8);
assert.equal((index.match(/data-task-id=/g) || []).length, 1);
for (const [name, html] of [["index.html", index], ["part.html", part], ["play.html", play]]) {
  writeFileSync(resolve(destination, name), html);
  console.log(`${name}: ${Buffer.byteLength(html)} bytes, assets and scripts embedded`);
}
