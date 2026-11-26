const origin = await page.eval(() => location.origin);
const checks = [];
function assert(value, message) { if (!value) throw new Error(message); checks.push(message); }

for (const path of ["/play/", "/pt/play/"]) {
  await page.open(origin + path);
  await page.wait('#directory-actions:not([hidden])');
  assert(await page.eval(() => !performance.getEntriesByType("resource").some((r) => /phaser|\.tmj|\.png/.test(r.name))), `${path}: entry gate defers engine and art`);
  const actions = await page.eval(() => [...document.querySelectorAll("[data-action]")].map((b) => b.dataset.action));
  for (const id of actions) {
    await page.click(`[data-action="${id}"]`);
    assert(await page.eval(() => {
      const dialog = document.querySelector("dialog");
      const line = document.querySelector("#speech-readable");
      const next = document.querySelector("#speech-next");
      if (next.textContent === next.dataset.reveal) next.click();
      return dialog.open && line.textContent === document.querySelector("#speech-typed").textContent && line.textContent.length > 20;
    }), `${path}/${id}: complete readable line and reveal control`);
    await page.press("Escape");
    assert(await page.eval(() => !document.querySelector("dialog").open && document.activeElement.matches("[data-action]")), `${path}/${id}: Escape closes and restores focus`);
  }
  assert(await page.eval(() => document.querySelector("#inventory-count").textContent === "2"), `${path}: both pickups retained`);
  for (const id of ["board", "robot"]) {
    await page.click(`[data-action="${id}"]`);
    await page.eval(() => { for (let i = 0; i < 4; i++) document.querySelector("#speech-next").click(); });
    assert(await page.eval(() => !document.querySelector("#challenge").hidden), `${path}/${id}: challenge starts`);
    await page.click(id === "board" ? "#board-choices button:first-child" : '[data-choice="carry"]');
    assert(await page.eval(() => document.querySelector("#challenge-progress").textContent.includes("1") && document.querySelector("#challenge-result").textContent.length > 20), `${path}/${id}: mistake preserves progress with feedback`);
    if (id === "board") for (let i = 0; i < 3; i++) await page.click("#board-choices button:nth-child(2)");
    else for (const action of ["approach", "grip", "carry", "release"]) await page.click(`[data-choice="${action}"]`);
    assert(await page.eval(() => !document.querySelector("#challenge-again").hidden && document.querySelector("#challenge-result").textContent.length > 20), `${path}/${id}: finite ending`);
    await page.click("#challenge-again");
    assert(await page.eval(() => document.querySelector("#challenge-again").hidden && document.querySelector("#challenge-progress").textContent.includes("1")), `${path}/${id}: replay resets`);
    await page.press("Escape");
  }
  await page.click("#enter");
  await page.wait("#enter[hidden]");
  const routes = {
    left: [["right", 15], ["down", 1], ["right", 1]],
    top: [["up", 5], ["right", 18], ["down", 4]],
    bottom: [["down", 5], ["right", 18], ["up", 1]],
    right: [["down", 5], ["right", 22], ["up", 4], ["left", 1]],
  };
  for (const [side, route] of Object.entries(routes)) {
    await page.eval(() => document.querySelector('[data-travel="plaza"]').click());
    await page.eval(`() => { for (const [direction, count] of ${JSON.stringify(route)}) for (let i = 0; i < count; i++) document.querySelector('[data-direction="' + direction + '"]').click(); document.querySelector('canvas').focus(); }`);
    assert(await page.eval(() => !document.querySelector("#interact").disabled && document.querySelector("#interact").textContent === document.querySelector('[data-action="lamp"]').textContent), `${path}: lamp activates from ${side}`);
    await page.press("Enter");
    assert(await page.eval(() => document.querySelector("dialog").open && document.querySelector("dialog").classList.contains("balloon")), `${path}/${side}: keyboard opens attached balloon`);
    await page.press("Escape");
  }
  await page.eval(() => {
    document.querySelector('[data-travel="outside"]').click();
    for (let i = 0; i < 21; i++) document.querySelector('[data-direction="right"]').click();
    for (let i = 0; i < 2; i++) document.querySelector('[data-direction="up"]').click();
  });
  await page.click("#interact");
  await page.eval(() => { for (let i = 0; i < 4; i++) document.querySelector("#speech-next").click(); });
  assert(await page.eval(() => !document.querySelector("dialog").open && document.querySelector("#location").textContent === document.querySelector('[data-travel="study"]').textContent), `${path}: doorway conversation enters study`);
  assert(await page.eval(() => document.querySelector("#inventory-count").textContent === "2"), `${path}: travel preserves inventory`);
}

// A controlled MediaQueryList exercises both preference branches without changing the host OS.
await page.open(origin + "/play/");
await page.eval(async () => {
  let html = await (await fetch("/play/")).text();
  html = html.replace("<head>", `<head><script>
    window.testReducedMotion = true;
    window.testMotionQueries = [];
    const originalMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const media = originalMedia(query);
      if (query === '(prefers-reduced-motion: reduce)') {
        Object.defineProperty(media, 'matches', { get: () => window.testReducedMotion });
        window.testMotionQueries.push(media);
      }
      return media;
    };
  <\/script>`).replace("assets/plaza-entry.js", "assets/plaza-entry.js?motion-test=1");
  document.open(); document.write(html); document.close();
});
await page.wait('#directory-actions:not([hidden])');
await page.click('[data-action="pond"]');
assert(await page.eval(() => document.querySelector("#speech-typed").textContent === document.querySelector("#speech-readable").textContent), "reduced motion reveals instantly");
await page.press("Escape");
assert(await page.eval(() => {
  window.testReducedMotion = false;
  document.querySelector('[data-action="notebook"]').click();
  const typed = document.querySelector("#speech-typed");
  const startedEmpty = typed.textContent === "";
  window.testReducedMotion = true;
  for (const media of window.testMotionQueries) media.dispatchEvent(new Event("change"));
  return startedEmpty && typed.textContent === document.querySelector("#speech-readable").textContent;
}), "changing reduced motion reveals a line already typing");
console.log(JSON.stringify({ passed: checks.length, checks }, null, 2));
