(function () {
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function setCtx(ctx, w, h) {
    ctx.clearRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = false;
  }

  function bg(ctx, w, h) {
    // simple space background for menus
    ctx.fillStyle = "#070a12";
    ctx.fillRect(0, 0, w, h);

    // tiny stars (deterministic-ish with screen size)
    const count = Math.floor((w * h) / 28000);
    for (let i = 0; i < count; i++) {
      const x = (i * 9973) % w;
      const y = (i * 7919) % h;
      const s = 1 + ((i * 13) % 2);
      ctx.fillStyle = (i % 6 === 0) ? "#cbd6ff" : "#8aa0ff";
      ctx.fillRect(x, y, s, s);
    }
  }

  function title(ctx, w, y, text) {
    ctx.fillStyle = "#d7e3ff";
    ctx.font = "700 28px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, y);
  }

  function subtitle(ctx, w, y, text) {
    ctx.fillStyle = "#9fb3d6";
    ctx.font = "14px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, w / 2, y);
  }

  function panel(ctx, x, y, w, h) {
    ctx.fillStyle = "rgba(8, 12, 22, 0.75)";
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = "rgba(170, 200, 255, 0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  }

  function button(ctx, b) {
    const hovered = !!b.hovered;
    const disabled = !!b.disabled;

    ctx.fillStyle = disabled ? "rgba(70,80,110,0.25)" : (hovered ? "rgba(120,160,255,0.25)" : "rgba(120,160,255,0.14)");
    ctx.fillRect(b.x, b.y, b.w, b.h);

    ctx.strokeStyle = disabled ? "rgba(140,160,200,0.25)" : (hovered ? "rgba(190,220,255,0.7)" : "rgba(190,220,255,0.35)");
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);

    ctx.fillStyle = disabled ? "rgba(210,220,255,0.35)" : "#eaf1ff";
    ctx.font = "700 16px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(b.label, b.x + b.w / 2, b.y + b.h / 2);
  }

  function smallLabel(ctx, x, y, text, align) {
    ctx.fillStyle = "#9fb3d6";
    ctx.font = "12px monospace";
    ctx.textAlign = align || "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y);
  }

  function bigValue(ctx, x, y, text, align) {
    ctx.fillStyle = "#eaf1ff";
    ctx.font = "700 16px monospace";
    ctx.textAlign = align || "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y);
  }

  function listItem(ctx, it) {
    const hovered = !!it.hovered;
    const locked = !!it.locked;
    const selected = !!it.selected;

    ctx.fillStyle = locked ? "rgba(70,80,110,0.18)" : (hovered ? "rgba(120,160,255,0.18)" : "rgba(120,160,255,0.10)");
    ctx.fillRect(it.x, it.y, it.w, it.h);

    ctx.strokeStyle = selected ? "rgba(210,235,255,0.85)" : "rgba(190,220,255,0.25)";
    ctx.lineWidth = selected ? 3 : 2;
    ctx.strokeRect(it.x + 1, it.y + 1, it.w - 2, it.h - 2);

    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.font = "700 15px monospace";
    ctx.fillStyle = locked ? "rgba(220,230,255,0.35)" : "#eaf1ff";
    ctx.fillText(it.title, it.x + 12, it.y + it.h / 2 - 8);

    ctx.font = "12px monospace";
    ctx.fillStyle = "#9fb3d6";
    ctx.fillText(it.meta, it.x + 12, it.y + it.h / 2 + 10);

    if (locked) {
      ctx.textAlign = "right";
      ctx.font = "700 12px monospace";
      ctx.fillStyle = "rgba(255,220,120,0.85)";
      ctx.fillText("LOCKED", it.x + it.w - 12, it.y + it.h / 2 - 2);
    }
  }

  function toast(ctx, w, h, msg, t01) {
    const alpha = Math.sin(Math.PI * clamp(t01, 0, 1));
    if (alpha <= 0) return;

    const tw = Math.min(w * 0.86, 460);
    const th = 46;
    const x = (w - tw) / 2;
    const y = h - th - 22;

    ctx.fillStyle = `rgba(10,14,26,${0.85 * alpha})`;
    ctx.fillRect(x, y, tw, th);
    ctx.strokeStyle = `rgba(190,220,255,${0.35 * alpha})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1, y + 1, tw - 2, th - 2);

    ctx.fillStyle = `rgba(234,241,255,${0.95 * alpha})`;
    ctx.font = "700 14px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(msg, x + tw / 2, y + th / 2);
  }

  // Pixel sprites
  function ship(ctx, x, y, dir) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    const angle = Math.atan2(dir.y, dir.x) + Math.PI / 2;
    ctx.rotate(angle);
    ctx.fillStyle = "#d7e3ff";
    ctx.fillRect(-4, -6, 8, 12);
    ctx.fillStyle = "#8aa0ff";
    ctx.fillRect(-6, -2, 12, 4);
    ctx.fillStyle = "#6ef4ff";
    ctx.fillRect(-2, 4, 4, 4);
    ctx.restore();
  }

  function enemy(ctx, x, y, type) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    const color = type.color || "#ff6b6b";
    ctx.fillStyle = color;
    ctx.fillRect(-5, -5, 10, 10);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(-2, -2, 4, 4);
    ctx.restore();
  }

  function orb(ctx, x, y, size) {
    ctx.fillStyle = "#6ef4ff";
    ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
  }

  function projectile(ctx, x, y, size, color) {
    ctx.fillStyle = color || "#ffd166";
    ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size);
  }

  function ring(ctx, x, y, r, color) {
    ctx.strokeStyle = color || "rgba(180,220,255,0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  function joystick(ctx, joy) {
    if (!joy.active) return;
    ctx.fillStyle = "rgba(120,160,255,0.2)";
    ctx.beginPath();
    ctx.arc(joy.anchorX, joy.anchorY, joy.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(200,220,255,0.5)";
    ctx.beginPath();
    ctx.arc(joy.x, joy.y, joy.radius * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }

  function hudText(ctx, x, y, text, align) {
    ctx.fillStyle = "#eaf1ff";
    ctx.font = "12px monospace";
    ctx.textAlign = align || "left";
    ctx.textBaseline = "top";
    ctx.fillText(text, x, y);
  }

  // Public API
  window.Draw = {
    setCtx,
    bg,
    title,
    subtitle,
    panel,
    button,
    smallLabel,
    bigValue,
    listItem,
    toast,
    ship,
    enemy,
    orb,
    projectile,
    ring,
    joystick,
    hudText,
  };
})();
