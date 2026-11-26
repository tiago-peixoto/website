const results = [];
for (const lang of ["en", "pt-BR"]) {
  results.push(await page.eval(async () => {
    const frame = document.querySelector("iframe");
    const d = frame.contentDocument;
    const assert = (value, message) => { if (!value) throw new Error(message); };
    if (d.querySelector("dialog").open) d.querySelector("dialog").close();
    if (!d.querySelector("#enter").hidden) d.querySelector("#enter").click();
    for (let i = 0; i < 100 && !d.querySelector("#enter").hidden; i++) await new Promise((resolve) => setTimeout(resolve, 50));
    assert(d.querySelector("#enter").hidden && d.querySelector("canvas"), "standalone entry loads the engine");
    for (const area of ["plaza", "outside", "study"]) {
      d.querySelector(`[data-travel="${area}"]`).click();
      assert(d.querySelector("#location").textContent === d.querySelector(`[data-travel="${area}"]`).textContent, `standalone travel to ${area}`);
    }
    for (const id of ["board", "robot"]) {
      d.querySelector(`[data-action="${id}"]`).click();
      for (let i = 0; i < 4; i++) d.querySelector("#speech-next").click();
      assert(!d.querySelector("#challenge").hidden, `${id} challenge starts`);
      if (id === "board") {
        for (let i = 0; i < 3; i++) d.querySelector("#board-choices button:nth-child(2)").click();
        assert(d.querySelector("#board-answer").textContent === "9", "finished board shows its answer");
      } else for (const action of ["approach", "grip", "carry", "release"]) d.querySelector(`[data-choice="${action}"]`).click();
      assert(!d.querySelector("#challenge-again").hidden, `${id} finishes`);
      d.querySelector("#challenge-again").click();
      assert(d.querySelector("#challenge-again").hidden, `${id} replays`);
      if (id === "board") assert(d.querySelector("#board-answer").textContent === "?", "replaying board resets the answer");
      d.querySelector("dialog").close();
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    const external = d.defaultView.performance.getEntriesByType("resource").filter((r) => /^https?:/.test(r.name));
    assert(external.length === 0, "no external requests");
    return { language: d.documentElement.lang, entry: true, areas: 3, challenges: 2, externalRequests: external.length };
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
