// Run through chrome-devtools-axi on index.html.
console.log(JSON.stringify(await page.eval(async () => {
  const root = document.querySelector('#walker-review');
  const check = (ok, message) => { if (!ok) throw Error(message); };
  check(root.dataset.ready === 'true', 'all embedded images loaded');
  check(root.querySelectorAll('[data-frame]').length === 192, 'every round-2, round-3 and new frame appears');
  check(root.querySelectorAll('[data-animated]').length === 48, 'native and enlarged animations');
  check(document.documentElement.scrollWidth <= innerWidth, 'no page overflow');
  check(root.querySelectorAll('[data-cycle-question]').length === 8, 'one question per cycle');
  check(document.querySelectorAll('[data-task-id]').length === 1, 'one consolidated decision');
  const play = document.querySelector('#combined-game').contentWindow;
  const game = play.document.querySelector('iframe').contentWindow;
  for (const w of [play, game]) {
    check(w.document.documentElement.scrollWidth <= w.innerWidth, 'embedded game has no overflow');
    check(!w.performance.getEntriesByType('resource').some(r => /^https?:/.test(r.name)), 'embedded game makes no external requests');
  }
  const pause = root.querySelector('#walker-pause');
  if (pause.getAttribute('aria-pressed') !== 'true') pause.click();
  const frames = [];
  for (let i = 0; i < 8; i++) {
    root.querySelector('#walker-step').click();
    await new Promise(resolve => requestAnimationFrame(resolve));
    frames.push(root.querySelector('[data-animated]').dataset.rendered);
  }
  check(new Set(frames).size === 8, 'manual stepping visits all eight frames');
  for (const strip of root.querySelectorAll('.walker-strip')) {
    strip.scrollLeft = strip.scrollWidth;
    const end = strip.querySelector('figure:last-child').getBoundingClientRect();
    const bounds = strip.getBoundingClientRect();
    check(end.right <= bounds.right + 1, 'last frame is reachable');
    strip.scrollLeft = 0;
  }
  check(!performance.getEntriesByType('resource').some(r => /^https?:/.test(r.name)), 'no external requests');
  check(!document.querySelector('script[type=module]'), 'no module scripts');
  scrollTo(0, 0);
  return { passed: true, width: innerWidth, frames, numbered: 192, animated: 48, externalRequests: 0 };
})));
