const dialog = document.querySelector("dialog");
const enter = document.querySelector("#enter");
const loading = document.querySelector("#loading");
let returnFocus;

function openPanel(opener = document.activeElement) {
  if (dialog.open) return;
  returnFocus = opener;
  dialog.showModal();
  document.querySelector("#university-title").focus();
}

function loadPhaser() {
  if (window.Phaser) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    const timer = setTimeout(() => failed(), 20000);
    function failed() {
      clearTimeout(timer);
      script.remove();
      reject(new Error("Phaser failed to load"));
    }
    script.src = new URL("./phaser.min.js", import.meta.url).href;
    script.onload = () => { clearTimeout(timer); resolve(); };
    script.onerror = failed;
    document.head.append(script);
  });
}

if (typeof dialog.showModal === "function") {
  enter.hidden = false;
  const university = document.querySelector("#university-link");
  university.hidden = false;
  university.addEventListener("click", (event) => openPanel(event.currentTarget));
  dialog.addEventListener("close", () => returnFocus?.focus());
  enter.addEventListener("click", async () => {
    enter.disabled = true;
    loading.textContent = loading.dataset.loading;
    try {
      const [{ startPlaza }] = await Promise.all([import("./plaza.js"), loadPhaser()]);
      await startPlaza({
        asset: (name) => new URL(`./${name}`, import.meta.url).href,
        dialog,
        openPanel,
      });
      loading.textContent = "";
      enter.hidden = true;
      document.querySelector("#fallback").hidden = true;
      document.querySelector("#how").hidden = false;
      document.body.classList.add("playing");
      if (!dialog.open) {
        document.querySelector(".menu").open = false;
        document.querySelector("#plaza canvas").focus();
      }
    } catch (error) {
      console.error(error);
      loading.textContent = loading.dataset.error;
      document.querySelector("#playable").hidden = true;
      document.querySelector("#controls").hidden = true;
      enter.disabled = false;
    }
  });
}
