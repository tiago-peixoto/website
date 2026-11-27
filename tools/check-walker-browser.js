// Run through chrome-devtools-axi run on a fresh play.html written by tools/plaza-preview.mjs.
console.log(JSON.stringify(await page.eval(async () => {
  const w = document.querySelector('iframe').contentWindow, d = w.document;
  const check = (value, message) => { if (!value) throw new Error(message); };
  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
  const until = async (condition) => {
    for (let i = 0; i < 250; i++) { if (condition()) return; await wait(20); }
    throw new Error('Browser condition timed out');
  };
  check(!d.querySelector('canvas'), 'enter gate must defer the game');
  d.querySelector('[data-action="university"]').click();
  check(d.querySelector('dialog').open, 'reading works before entering');
  d.querySelector('dialog').close();
  await wait(20);
  d.querySelector('#enter').click();
  await until(() => w.Phaser);
  const prototype = w.Phaser.GameObjects.Sprite.prototype, original = prototype.preUpdate;
  let walker;
  prototype.preUpdate = function (time, delta) {
    original.call(this, time, delta);
    if (this.name === 'walker') walker = this;
  };
  try { await until(() => walker); } finally { prototype.preUpdate = original; }
  const scene = walker.scene, game = scene.game, canvas = d.querySelector('canvas');
  const loopCallback = game.loop.callback;
  game.loop.stop();
  const run = d.querySelector('#run');
  const key = (type, name, shiftKey = false) => (type === 'keyup' ? w : canvas).dispatchEvent(new w.KeyboardEvent(type, { key: name, code: name, shiftKey, bubbles: true }));
  let time = 0;
  const advance = (frames = 10, delta = 20) => {
    for (let i = 0; i < frames; i++) { time += delta; scene.update(time, delta); walker.preUpdate(time, delta); }
  };
  const reset = async (area = 'plaza') => {
    d.querySelector(`[data-travel="${area}"]`).click();
    await wait(20);
    canvas.focus();
  };
  const results = [];
  try {
    for (const direction of ['Left', 'Right', 'Up', 'Down']) {
      for (const running of [false, true]) {
        await reset();
        const start = { x: walker.x, y: walker.y };
        key('keydown', `Arrow${direction}`, running);
        advance();
        const distance = Math.hypot(walker.x - start.x, walker.y - start.y);
        check(Math.abs(distance - (running ? 20.4 : 12)) < 0.001, `${direction} speed: ${distance}`);
        check(walker.anims.currentAnim.key === `${running ? 'run' : 'walk'}-${direction.toLowerCase()}`, 'gait and facing animation');
        check(walker.anims.currentAnim.frames.length === 8, 'eight animation frames');
        key('keyup', `Arrow${direction}`);
        advance(1);
        check(!walker.anims.isPlaying, 'release stops animation');
        results.push({ direction, running, distance: Number(distance.toFixed(1)) });
      }
    }
    await reset();
    run.click();
    check(run.getAttribute('aria-pressed') === 'true', 'run toggle reports its state');
    const start = walker.x;
    key('keydown', 'ArrowLeft'); advance(); key('keyup', 'ArrowLeft');
    check(Math.abs(start - walker.x - 20.4) < 0.001, 'toggle enables running');
    run.click();
    check(run.getAttribute('aria-pressed') === 'false', 'toggle returns to walking');
    key('keydown', 'Shift', true); key('keydown', 'ArrowLeft', true); advance(1);
    key('keyup', 'Shift'); advance(1);
    check(walker.anims.currentAnim.key === 'walk-left', 'releasing Shift changes gait during movement');
    w.dispatchEvent(new w.Event('blur')); const stopped = walker.x; advance();
    check(walker.x === stopped && run.getAttribute('aria-pressed') === 'false', 'window blur clears input');
    await reset(); key('keydown', 'ArrowRight', true); advance(80); key('keyup', 'ArrowRight');
    check(walker.x <= 256 && walker.x > 255, 'running stops at the lamp base');
    await reset(); key('keydown', 'ArrowDown', true); advance(10); key('keyup', 'ArrowDown');
    key('keydown', 'ArrowRight', true); advance(120); key('keyup', 'ArrowRight');
    check(d.querySelector('#location').textContent === 'University courtyard', 'running crosses the plaza edge');
    check(walker.anims.currentAnim.key === 'run-right', 'run continues after edge travel');
    await reset('outside'); key('keydown', 'ArrowLeft', true); advance(120); key('keyup', 'ArrowLeft');
    check(d.querySelector('#location').textContent === 'Plaza', 'running returns across the courtyard edge');
    await reset('study'); key('keydown', 'ArrowDown', true); advance(30); key('keyup', 'ArrowDown');
    check(d.querySelector('#location').textContent === 'University courtyard', 'running exits the study room');
    await reset(); run.click(); d.querySelector('.menu').open = true; await wait(20);
    check(run.getAttribute('aria-pressed') === 'false', 'menu clears run toggle');
    d.querySelector('[data-action="university"]').click();
    const beforeDialog = walker.x; key('keydown', 'ArrowLeft', true); advance();
    check(walker.x === beforeDialog, 'dialog stops movement');
    d.querySelector('dialog').close(); await wait(20);
    await reset();
    const resources = [...performance.getEntriesByType('resource'), ...w.performance.getEntriesByType('resource')];
    check(!resources.some(r => /^https?:/.test(r.name)), 'review performs no external requests');
    return { passed: true, speeds: results, checks: 'gate, reading, eight animations, Shift release, toggle, blur, collision, three exits, menu, dialog, offline' };
  } finally {
    const frame = game.loop.frame;
    game.loop.start(loopCallback);
    await until(() => game.loop.frame > frame);
  }
})));
