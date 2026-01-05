(function () {
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  let last = performance.now();
  let dpr = 1;
  let w = 0, h = 0;

  function resize() {
    dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    w = Math.floor(window.innerWidth);
    h = Math.floor(window.innerHeight);

    canvas.width = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);

    // draw in CSS pixels
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    Draw.setCtx(ctx, w, h);
    if (!Game.save) Game.init(w, h);
    else Game.resize(w, h);
  }

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left);
    const y = (e.clientY - rect.top);
    return { x, y };
  }

  function loop(t) {
    const dt = Math.min(0.05, (t - last) / 1000);
    last = t;

    Game.update(dt);
    Draw.setCtx(ctx, w, h);
    Game.render(ctx);

    requestAnimationFrame(loop);
  }

  // Pointer events
  canvas.addEventListener("pointerdown", (e) => {
    canvas.setPointerCapture(e.pointerId);
    const p = getPos(e);
    Game.onPointerDown(p.x, p.y);
  });

  canvas.addEventListener("pointermove", (e) => {
    const p = getPos(e);
    Game.onPointerMove(p.x, p.y);
  });

  canvas.addEventListener("pointerup", (e) => {
    const p = getPos(e);
    Game.onPointerUp(p.x, p.y);
  });

  window.addEventListener("resize", resize);

  resize();
  requestAnimationFrame(loop);
})();
