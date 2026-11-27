// Run on the standalone preview through chrome-devtools-axi run.
console.log(JSON.stringify(await page.eval(async () => {
  const w = document.querySelector('iframe').contentWindow, d = w.document;
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const wait = () => new Promise(resolve => setTimeout(resolve, 60));
  const key = (key, target = d.activeElement, repeat = false) => target.dispatchEvent(new w.KeyboardEvent('keydown', {key, code:key === ' ' ? 'Space' : key, bubbles:true, cancelable:true, repeat}));
  const action = () => d.querySelector('#interact').click();
  const finish = async () => { for (let i = 0; i < 4 && d.querySelector('dialog').open; i++) action(); await wait(); };
  const open = id => d.querySelector(`[data-action="${id}"]`).click();
  const close = async () => { if (d.querySelector('dialog').open) key('Escape'); if (!d.querySelector('#experiment').hidden) d.querySelector('#challenge-leave').click(); await wait(); };
  assert(!d.querySelector('canvas'), 'engine remains behind enter gate');
  assert(!d.querySelector('dialog button'), 'speech has no buttons');
  open('notebook');
  assert(d.querySelector('#inventory-count').textContent === '0', 'opening does not collect');
  assert(d.querySelector('#speech-readable').textContent.length > 20, 'complete speech readable before typing finishes');
  key('Escape'); await wait();
  assert(d.querySelector('#inventory-count').textContent === '0', 'cancelling does not collect');
  open('notebook'); await finish();
  assert(d.querySelector('#inventory-count').textContent === '1', 'last action collects automatically');
  assert(d.querySelector('#pickup-status').textContent.includes(d.querySelector('[data-action="notebook"]').dataset.itemName), 'pickup is announced');
  open('notebook'); await finish();
  assert(d.querySelectorAll('#inventory li').length === 1, 'repeated speech does not duplicate inventory');
  for (const id of ['board','robot']) {
    open(id); await finish();
    assert(!d.querySelector('dialog').open && !d.querySelector('#experiment').hidden, `${id} works without entering and without a modal`);
    await close();
  }
  d.querySelector('#enter').click();
  for (let i=0;i<100&&!d.querySelector('canvas');i++) await wait();
  assert(d.querySelector('canvas'), 'enter creates engine');
  let scene;
  const proto = w.Phaser.GameObjects.Sprite.prototype, original = proto.preUpdate;
  try {
    proto.preUpdate = function(...args) { scene = this.scene; return original.apply(this,args); };
    for(let i=0;i<50&&!scene;i++) await wait();
  } finally { proto.preUpdate = original; }
  assert(scene, 'scene started');
  const walker=scene.children.getByName('walker');
  const assets = w.eval('previewAssets'), rules=w.eval('navigation')(await (await w.fetch(assets['plaza-art/interior.tmj'])).json());
  const queue=[{x:192,y:222,route:[]}], seen=new Set(['192,222']), routes={};
  for(const pos of queue) for(const direction of ['up','down','left','right']) {
    const next=rules.move(pos,direction,4),route=[...pos.route,direction];
    if(rules.exit(next)) continue;
    const target=rules.nearby(next);if(target) routes[`${target.name}/${direction}`]??=route;
    const key=`${next.x},${next.y}`;if(!seen.has(key)){seen.add(key);queue.push({...next,route});}
  }
  const travel = area => d.querySelector(`[data-travel="${area}"]`).click();
  const approach = async (id, facing) => {
    await close();travel('study');
    for(const direction of routes[`${id}/${facing}`]) d.querySelector(`[data-direction="${direction}"]`).click();
    await wait();
    assert(d.querySelector('#interact').textContent === d.querySelector(`[data-action="${id}"]`).textContent, `${id}/${facing} target reachable`);
  };
  const expected={paper:['up','down','left','right'],notebook:['up','down','left'],sensor:['up','down','right'],robot:['up','down','left','right'],computer:['up','left','right'],board:['up'],light:['left'],studyLamp:['down','right']};
  const checks=[];
  for(const [id, facings] of Object.entries(expected)) for(const facing of facings) {
    await approach(id,facing);action();
    assert(d.querySelector('dialog').open,`${id}/${facing} opens speech`);
    assert(!d.querySelector('dialog').matches(':modal'), 'action control remains usable');
    const rect=d.querySelector('dialog').getBoundingClientRect();
    assert(rect.left>=0&&rect.right<=w.innerWidth&&rect.top>=0&&rect.bottom<=w.innerHeight, `${id} speech fits`);
    const before={x:walker.x,y:walker.y};
    key('ArrowRight',d.querySelector('canvas'));await wait();
    assert(walker.x===before.x&&walker.y===before.y, 'speech freezes walking');
    await finish();checks.push(`${id}/${facing}`);
  }
  assert(d.querySelector('#inventory-count').textContent==='2','both items survive travel');
  await close();await approach('paper','up');d.querySelector('canvas').focus();key(' ');
  assert(d.querySelector('dialog').open,'Space on the canvas opens speech');
  assert(d.querySelector('#speech-typed').textContent.length<d.querySelector('#speech-readable').textContent.length,'the opening key press leaves the first line typing');
  key(' ');
  assert(d.querySelector('#speech-typed').textContent===d.querySelector('#speech-readable').textContent,'the next key press reveals the line');
  await finish();
  await close();await approach('board','up');action();await finish();
  assert(!d.querySelector('dialog').open,'board has no dialogue or modal');
  const covers=()=>scene.cameras.main.zoom*384>=scene.scale.width&&scene.cameras.main.zoom*256>=scene.scale.height;
  assert(covers(),'board view covers the canvas');
  const surface=d.querySelector('#board-surface'), r=surface.getBoundingClientRect();
  assert(r.left>=0&&r.right<=w.innerWidth&&r.top>=0&&r.bottom<=d.querySelector('#experiment').getBoundingClientRect().top, 'answers lie within scene');
  key(' ');assert(d.querySelector('#challenge-progress').textContent.includes('1'), 'wrong answer preserves progress');
  key('ArrowRight');
  for(let i=0;i<3;i++)key(' ');
  assert(!d.querySelector('#challenge-again').hidden,'keyboard solves board');
  d.querySelector('#challenge-again').click();
  for(let i=0;i<3;i++)d.querySelector('#board-choices button:nth-child(2)').click();
  assert(!d.querySelector('#challenge-again').hidden,'direct board taps solve replay');
  await close();await approach('robot','up');action();await finish();
  const before={x:walker.x,y:walker.y},arm=scene.children.getByName('robot-arm'),part=scene.children.getByName('robot-part');
  assert(arm.visible && scene.cameras.main.zoom>=3 && covers(),'robot is in the scene with a closer view that covers the canvas');
  const grip=d.querySelector('#challenge-action').textContent;
  for(const pressed of ['Enter',' ']) assert(key(pressed,d.querySelector('[data-adjust="right"]')),`${pressed} on an arrow button keeps the button's own click`);
  assert(d.querySelector('#challenge-action').textContent===grip,'a key on an arrow button does not grip');
  key('ArrowRight');key(' ');
  assert(d.querySelector('#challenge-progress').textContent.includes('1'),'cannot grip middle position');
  key('ArrowLeft');key(' ');await wait();const partStart=part.x;
  key('ArrowRight');key('ArrowRight');await wait();
  assert(part.x!==partStart && arm.scaleX<0,'keys move arm and carried part');
  assert(walker.x===before.x&&walker.y===before.y,'mini-game keys do not move walker');
  key(' ');assert(!d.querySelector('#challenge-again').hidden,'keyboard solves robot');
  d.querySelector('#challenge-again').click();
  d.querySelector('#challenge-action').click();
  d.querySelector('[data-adjust="right"]').click();d.querySelector('[data-adjust="right"]').click();
  d.querySelector('#challenge-action').click();
  assert(!d.querySelector('#challenge-again').hidden,'touch controls solve robot');
  await close();assert(!arm.visible,'leaving restores static room art');
  await approach('studyLamp','right');const glow=scene.children.getByName('study-lamp-glow');
  const lampBefore=glow.visible;action();await wait();assert(glow.visible!==lampBefore,'lamp changes light immediately');assert(scene.children.getByName('study-lamp-shade').visible!==glow.visible,'painted cone dims when the bulb is off');await finish();
  action();await wait();assert(glow.visible===lampBefore,'lamp toggles back');await finish();
  travel('plaza');travel('outside');travel('study');
  assert(d.documentElement.scrollWidth===w.innerWidth,'no horizontal overflow');
  window.interactionShot = async name => {
    await close();
    for(const id of ['light','studyLamp']) if(d.querySelector(`[data-action="${id}"]`).getAttribute('aria-pressed')==='false'){open(id);await finish();}
    if(name==='board'||name==='robot'){await approach(name,'up');action();await finish();}
    if(name==='robot-carry'){await approach('robot','up');action();await finish();key(' ');key('ArrowRight');key('ArrowRight');}
    if(name==='balloon'){await approach('notebook','left');action();action();}
    if(name==='lamp-on'||name==='lamp-off'){
      await approach('studyLamp','right');const desired=name==='lamp-on';
      if(glow.visible!==desired){action();await finish();}
    }
    await wait(); return {name,width:w.innerWidth,height:w.innerHeight};
  };
  return {passed:true, viewport:[w.innerWidth,w.innerHeight], approaches:checks, pickups:'finish, cancel, repeat, travel',games:'keyboard, direct choices, touch, mistakes, completion, replay',lamp:'toggle twice',externalRequests:performance.getEntriesByType('resource').filter(e=>/^https?:/.test(e.name)).length};
}),null,2));
