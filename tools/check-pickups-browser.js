// Run on a fresh standalone preview through chrome-devtools-axi run.
console.log(JSON.stringify(await page.eval(async () => {
  const w = document.querySelector('iframe').contentWindow, d = w.document;
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const wait = () => new Promise(resolve => setTimeout(resolve, 60));
  const action = () => d.querySelector('#interact').click();
  const finish = () => {
    for (let i = 0; i < 20 && d.querySelector('dialog').open; i++) action();
    assert(!d.querySelector('dialog').open, 'pickup conversation finishes');
  };
  assert(!d.querySelector('canvas'), 'engine remains behind the enter gate');
  d.querySelector('#enter').click();
  for (let i = 0; i < 100 && !d.querySelector('#enter').hidden; i++) await wait();
  assert(d.querySelector('#enter').hidden, 'engine loads');
  let scene;
  const proto = w.Phaser.GameObjects.Sprite.prototype, original = proto.preUpdate;
  try {
    proto.preUpdate = function(...args) { scene = this.scene; return original.apply(this, args); };
    for (let i = 0; i < 50 && !scene; i++) await wait();
  } finally { proto.preUpdate = original; }
  assert(scene, 'scene starts');
  const frame = () => new Promise(resolve => scene.game.events.once('postrender', resolve));
  const travel = id => d.querySelector(`[data-travel="${id}"]`).click();
  const assets = w.eval('previewAssets');
  const map = await (await w.fetch(assets['plaza-art/interior.tmj'])).json();
  const rules = w.eval('navigation')(map);
  const items = map.layers.find(layer => layer.name === 'items').objects.map(item => item.name);
  const queue = [{ x: 192, y: 222, route: [] }], seen = new Set(['192,222']), routes = {};
  for (const pos of queue) for (const direction of ['up', 'down', 'left', 'right']) {
    const next = rules.move(pos, direction, 4), route = [...pos.route, direction];
    if (rules.exit(next)) continue;
    const target = rules.nearby(next);
    if (target) routes[target.name] ??= route;
    const key = `${next.x},${next.y}`;
    if (!seen.has(key)) { seen.add(key); queue.push({ ...next, route }); }
  }
  const approach = async id => {
    travel('study');
    assert(routes[id], `${id}: reachable`);
    for (const direction of routes[id]) d.querySelector(`[data-direction="${direction}"]`).click();
    await frame();
    assert(d.querySelector('#interact').textContent === d.querySelector(`[data-action="${id}"]`).textContent, `${id}: approach selects pickup`);
  };
  const results = [];
  for (const id of items) {
    await approach(id);
    const sprite = scene.children.getByName(id), render = sprite.renderCanvas;
    let draws = 0;
    sprite.renderCanvas = function(...args) { draws++; return render.apply(this, args); };
    try {
      await frame();
      assert(draws > 0, `${id}: drawn before pickup`);
      action();
      await frame();
      assert(sprite.visible, `${id}: opening speech does not collect`);
      d.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      await frame();
      assert(sprite.visible, `${id}: cancelling preserves item`);
      const walker = scene.children.getByName('walker'), position = [walker.x, walker.y];
      action();
      finish();
      draws = 0;
      await frame();
      assert(draws === 0, `${id}: collected item is still drawn on the first frame after speech closes`);
      assert(walker.x === position[0] && walker.y === position[1], `${id}: disappears without walking`);
      assert(!sprite.visible, `${id}: collected sprite is hidden`);
      const count = d.querySelector('#inventory-count').textContent;
      action();
      finish();
      assert(d.querySelector('#inventory-count').textContent === count, `${id}: repeated pickup stays unique`);
      travel('plaza'); travel('outside');
      await approach(id);
      draws = 0;
      await frame();
      assert(draws === 0 && !sprite.visible, `${id}: travel does not redraw collected item`);
      results.push({ id, drawnAfterPickup: draws });
    } finally { sprite.renderCanvas = render; }
  }
  assert(Number(d.querySelector('#inventory-count').textContent) === items.length, 'every pickable item collected');
  return { passed: true, viewport: [w.innerWidth, w.innerHeight], items: results };
}), null, 2));
