// Freeze a run reached through the actual keyboard handler for screenshot inspection.
console.log(JSON.stringify(await page.eval(async () => {
  const w = document.querySelector('iframe').contentWindow, d = w.document;
  const prototype = w.Phaser.GameObjects.Sprite.prototype, original = prototype.preUpdate;
  let walker;
  prototype.preUpdate = function(time, delta) {
    original.call(this, time, delta);
    if (this.name === 'walker') walker = this;
  };
  try {
    for (let i = 0; i < 100 && !walker; i++) await new Promise(resolve => setTimeout(resolve, 20));
  } finally { prototype.preUpdate = original; }
  if (!walker) throw Error('walker did not update');
  const game = walker.scene.game;
  const canvas = d.querySelector('canvas');
  canvas.focus();
  canvas.dispatchEvent(new w.KeyboardEvent('keydown', {key: 'ArrowLeft', shiftKey: true, bubbles: true}));
  await new Promise(resolve => setTimeout(resolve, 180));
  game.loop.stop();
  w.dispatchEvent(new w.KeyboardEvent('keyup', {key: 'ArrowLeft', bubbles: true}));
  return { animation: walker.anims.currentAnim.key, frame: walker.frame.name, texture: walker.texture.key,
    width: innerWidth, pageOverflow: d.documentElement.scrollWidth > w.innerWidth };
})));
