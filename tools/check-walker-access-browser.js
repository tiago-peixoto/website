// Run on a fresh play.html. Simulate the reduced-motion media preference before game entry.
console.log(JSON.stringify(await page.eval(async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const check = (ok, message) => { if (!ok) throw Error(message); };
  const until = async condition => { for (let i = 0; i < 250; i++) { if (condition()) return; await wait(20); } throw Error('condition timed out'); };
  const select = document.querySelector('#language');
  select.value = 'pt-BR'; select.dispatchEvent(new Event('change'));
  await until(() => document.querySelector('iframe').contentDocument.documentElement.lang === 'pt-BR');
  const w = document.querySelector('iframe').contentWindow, d = w.document;
  await until(() => d.querySelector('#enter'));
  const originalMedia = w.matchMedia.bind(w);
  w.matchMedia = query => {
    const media = originalMedia(query);
    if (query === '(prefers-reduced-motion: reduce)') Object.defineProperty(media, 'matches', {value: true});
    return media;
  };
  check(!d.querySelector('canvas'), 'Portuguese enter gate');
  d.querySelector('[data-action="university"]').click();
  check(d.querySelector('dialog').open, 'Portuguese reading without walking');
  d.querySelector('dialog').close(); await wait(20);
  d.querySelector('#enter').click();
  await until(() => w.Phaser);
  const prototype = w.Phaser.GameObjects.Sprite.prototype, original = prototype.preUpdate;
  let walker;
  prototype.preUpdate = function(time, delta) { original.call(this, time, delta); if (this.name === 'walker') walker = this; };
  try { await until(() => walker); } finally { prototype.preUpdate = original; }
  const scene = walker.scene, game = scene.game, callback = game.loop.callback;
  game.loop.stop();
  const results = [];
  try {
    for (const running of [false, true]) {
      d.querySelector('[data-travel="plaza"]').click(); await wait(20);
      if (running) d.querySelector('#run').click();
      const button = d.querySelector('[data-direction="left"]');
      const start = walker.x;
      button.click();
      check(walker.x < start, 'on-screen direction button moves the walker');
      const movingStart = walker.x, canvas = d.querySelector('canvas');
      canvas.focus();
      canvas.dispatchEvent(new w.KeyboardEvent('keydown', {key:'ArrowLeft', shiftKey:running, bubbles:true}));
      for (let i = 0; i < 10; i++) { scene.update(i * 20, 20); walker.preUpdate(i * 20, 20); }
      w.dispatchEvent(new w.KeyboardEvent('keyup', {key:'ArrowLeft', bubbles:true}));
      check(Math.abs(movingStart - walker.x - (running ? 20.4 : 12)) < 0.001, 'reduced motion keeps both speeds');
      check(!walker.anims.isPlaying && Number(walker.frame.name) === 17, 'reduced motion uses left idle');
      results.push({running, moved: start - walker.x, frame: walker.frame.name, animated: walker.anims.isPlaying});
    }
    check(![...performance.getEntriesByType('resource'), ...w.performance.getEntriesByType('resource')].some(r=>/^https?:/.test(r.name)), 'offline Portuguese');
    check(d.documentElement.scrollWidth <= w.innerWidth, 'Portuguese bounds');
    return {passed:true, language:d.documentElement.lang, reducedMotion:'simulated matchMedia preference', controls:results};
  } finally { game.loop.start(callback); }
})));
