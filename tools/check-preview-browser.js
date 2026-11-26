const results = [];
for (const lang of ["en", "pt-BR"]) {
  results.push(await page.eval(async () => {
    const frame = document.querySelector("iframe");
    const d = frame.contentDocument;
    const assert = (value, message) => { if (!value) throw new Error(message); };
    if (d.querySelector("dialog").open) d.querySelector("dialog").close();
    const advance = () => d.activeElement.dispatchEvent(new d.defaultView.KeyboardEvent("keydown", { key: " ", code: "Space", bubbles: true, cancelable: true }));
    const reducedMotion = d.defaultView.matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const id of ["welding", "tools", "parts"]) {
      const button = d.querySelector(`[data-action="${id}"]`);
      button.focus(); button.click();
      const line = d.querySelector(`[data-transcript="${id}"] p`).textContent;
      assert(d.querySelector("dialog").open, `${id} opens from the directory`);
      assert(d.querySelector("#speech-readable").textContent === line, `${id} has a complete accessible line`);
      if (reducedMotion) assert(d.querySelector("#speech-typed").textContent === line, `${id} appears immediately with reduced motion`);
      else advance();
      assert(d.querySelector("#speech-typed").textContent === line, `${id} can reveal its complete line`);
      advance();
      await new Promise((resolve) => setTimeout(resolve, 30));
      assert(!d.querySelector("dialog").open && d.activeElement === button, `${id} closes and restores keyboard focus`);
    }
    if (!d.querySelector("#enter").hidden) d.querySelector("#enter").click();
    for (let i = 0; i < 100 && !d.querySelector("#enter").hidden; i++) await new Promise((resolve) => setTimeout(resolve, 50));
    assert(d.querySelector("#enter").hidden && d.querySelector("canvas"), "standalone entry loads the engine");
    for (const area of ["plaza", "outside", "study"]) {
      d.querySelector(`[data-travel="${area}"]`).click();
      assert(d.querySelector("#location").textContent === d.querySelector(`[data-travel="${area}"]`).textContent, `standalone travel to ${area}`);
    }
    for (const id of ["board", "robot"]) {
      d.querySelector(`[data-action="${id}"]`).click();
      for (let i = 0; i < 4; i++) d.querySelector("#interact").click();
      assert(!d.querySelector("#experiment").hidden, `${id} challenge starts`);
      if (id === "board") {
        for (let i = 0; i < 3; i++) d.querySelector("#board-choices button:nth-child(2)").click();
        assert(d.querySelector("#board-equation").textContent.endsWith("9"), "finished board shows its answer");
      } else {
        d.querySelector("#challenge-action").click();
        d.querySelector('[data-adjust="right"]').click();
        d.querySelector('[data-adjust="right"]').click();
        d.querySelector("#challenge-action").click();
      }
      assert(!d.querySelector("#challenge-again").hidden, `${id} finishes`);
      d.querySelector("#challenge-again").click();
      assert(d.querySelector("#challenge-again").hidden, `${id} replays`);
      if (id === "board") assert(d.querySelector("#board-equation").textContent.endsWith("?"), "replaying board resets the answer");
      d.querySelector("#challenge-leave").click();
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    const external = d.defaultView.performance.getEntriesByType("resource").filter((r) => /^https?:/.test(r.name));
    assert(external.length === 0, "no external requests");
    return { language: d.documentElement.lang, entry: true, areas: 3, challenges: 2, workshopLines: 3, reducedMotion, externalRequests: external.length };
  }));
  if (lang === "en") {
    await page.eval(() => document.querySelector("iframe").contentDocument.querySelector("[hreflang]").click());
    const changed = await page.eval(async () => {
      for (let i = 0; i < 100; i++) {
        if (document.querySelector("iframe").contentDocument?.documentElement.lang === "pt-BR") return true;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      return false;
    });
    if (!changed) throw new Error("standalone language switch failed");
  }
}
console.log(JSON.stringify({ passed: true, results }, null, 2));
