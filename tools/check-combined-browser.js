// Run after check-walker-browser.js through chrome-devtools-axi on a play.html written by tools/plaza-preview.mjs.
console.log(JSON.stringify(await page.eval(async () => {
  const w = document.querySelector('iframe').contentWindow, d = w.document;
  const assert = (value, message) => { if (!value) throw new Error(message); };
  const wait = () => new Promise(resolve => setTimeout(resolve, 30));
  const close = async () => { if (!d.querySelector('#experiment').hidden) d.querySelector('#challenge-leave').click(); if (d.querySelector('dialog').open) d.querySelector('dialog').close(); await wait(); };
  const navigation = w.eval('navigation');
  const assets = w.eval('previewAssets');
  const map = await (await w.fetch(assets['plaza-art/interior.tmj'])).json();
  const rules = navigation(map), directions = ['up', 'down', 'left', 'right'];
  const queue = [{ x: 192, y: 222, route: [] }], seen = new Set(['192,222']), routes = {};
  for (const position of queue) for (const direction of directions) {
    const next = rules.move(position, direction, 4), route = [...position.route, direction];
    if (rules.exit(next)) continue;
    const target = rules.nearby(next);
    if (target) routes[`${target.name}/${direction}`] ??= route;
    const key = `${next.x},${next.y}`;
    if (!seen.has(key)) { seen.add(key); queue.push({ ...next, route }); }
  }
  const expected = { paper: directions, notebook: ['up','down','left'], sensor: ['up','down','right'], robot: directions,
    computer: ['up','left','right'], board: ['up'], light: ['left'], studyLamp: ['down','right'],
    welding: directions, tools: directions, parts: directions };
  const travel = area => d.querySelector(`[data-travel="${area}"]`).click();
  const walk = route => { for (const direction of route) d.querySelector(`[data-direction="${direction}"]`).click(); };
  const approach = async (id, direction) => { await close(); travel('study'); walk(routes[`${id}/${direction}`]); await wait(); };
  const open = () => d.querySelector('#interact').click();
  const challenge = () => { for (let i = 0; i < 4 && d.querySelector('dialog').open; i++) d.querySelector('#interact').click(); };
  const checks = [];
  for (const [id, facings] of Object.entries(expected)) for (const direction of facings) {
    assert(routes[`${id}/${direction}`], `route exists for ${id}/${direction}`);
    await approach(id, direction);
    assert(!d.querySelector('#interact').disabled, `${id}/${direction} enables interaction`);
    assert(d.querySelector('#interact').textContent === d.querySelector(`[data-action="${id}"]`).textContent, `${id}/${direction} names the correct object`);
    open();
    assert(d.querySelector('dialog').open && d.querySelector('dialog').classList.contains('balloon'), `${id}/${direction} opens a balloon`);
    assert(d.querySelector('#speech-readable').textContent === d.querySelector(`[data-transcript="${id}"] p`).textContent, `${id}/${direction} reads its own line`);
    challenge(); await wait();
    checks.push(`${id}/${direction}`);
  }
  for (const id of ['board','robot']) {
    await approach(id, 'up'); open(); challenge();
    assert(!d.querySelector('#experiment').hidden, `${id} starts`);
    if (id === 'board') d.querySelector('#board-choices button:first-child').click();
    else { d.querySelector('[data-adjust="right"]').click(); d.querySelector('#challenge-action').click(); d.querySelector('[data-adjust="left"]').click(); }
    assert(d.querySelector('#challenge-progress').textContent.includes('1'), `${id} mistake retains progress`);
    if (id === 'board') for (let i = 0; i < 3; i++) d.querySelector('#board-choices button:nth-child(2)').click();
    else { d.querySelector('#challenge-action').click(); d.querySelector('[data-adjust="right"]').click(); d.querySelector('[data-adjust="right"]').click(); d.querySelector('#challenge-action').click(); }
    assert(!d.querySelector('#challenge-again').hidden, `${id} finishes`);
    d.querySelector('#challenge-again').click();
    assert(d.querySelector('#challenge-again').hidden, `${id} replays`);
  }
  assert(d.querySelector('#inventory-count').textContent === '2', 'both pickups persist across travel');
  await close(); travel('study'); walk([...Array(13).fill('left'),...Array(10).fill('up'),'left']);
  assert(d.querySelector('#interact').textContent === d.querySelector('[data-action="notebook"]').textContent, 'reproduced notebook approach now works');
  assert(d.documentElement.scrollWidth === w.innerWidth, 'no horizontal page overflow');
  window.integrationShot = async name => {
    await close(); w.dispatchEvent(new w.Event('blur'));
    if (d.querySelector('[data-action="light"]').getAttribute('aria-pressed') === 'false') {
      d.querySelector('[data-action="light"]').click(); await close();
    }
    if (name === 'walk' || name === 'run') {
      travel('plaza');
      const canvas = d.querySelector('canvas'); canvas.focus();
      canvas.dispatchEvent(new w.KeyboardEvent('keydown', {key:'ArrowLeft',code:'ArrowLeft',shiftKey:name === 'run',bubbles:true}));
    }
    if (name === 'study') { travel('study'); walk([...Array(13).fill('left'),...Array(10).fill('up'),'left']); }
    if (name === 'balloon') { await approach('notebook','left'); open(); d.querySelector('#interact').click(); }
    if (name === 'board' || name === 'robot') { await approach(name,'up'); open(); challenge(); }
    if (name === 'edge') { travel('study'); walk(Array(12).fill('down')); }
    await wait(); await wait();
    const dialog = d.querySelector('dialog'), r = dialog.getBoundingClientRect();
    assert(!dialog.open || (r.left >= 0 && r.right <= w.innerWidth && r.top >= 0 && r.bottom <= w.innerHeight), `${name} dialog fits viewport`);
    return { name, location: d.querySelector('#location').textContent, width: w.innerWidth, height: w.innerHeight };
  };
  return { passed: true, viewport: [w.innerWidth,w.innerHeight], studyApproaches: checks, miniGames: 'mistake, completion, replay', pickups: 2 };
}), null, 2));
