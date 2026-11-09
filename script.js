// Footer year and light/dark toggle.
document.getElementById("year").textContent = new Date().getFullYear();

const root = document.documentElement;
document.getElementById("theme").addEventListener("click", () => {
  const dark = root.dataset.theme === "dark" ||
    (!root.dataset.theme && matchMedia("(prefers-color-scheme: dark)").matches);
  root.dataset.theme = dark ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
  banana.redraw();
});

// Hero: precomputed Monte Carlo photon paths (photons.js, made by tools/gen-photons.js).
// The browser does no simulation. It draws a few paths per frame for about a second, each
// path once, then stops. Off screen it waits; with reduced motion it draws everything at once.
const banana = (() => {
  const canvas = document.getElementById("banana");
  const data = window.PHOTONS || [];
  if (!canvas || !data.length) return { redraw() {} };
  const ctx = canvas.getContext("2d");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const paths = data.map((s) => s.split(" ").map((q) => q.split(",").map(Number)));
  const DET = 48; // detector position in path units
  let w = 0, h = 0, shown = 0, drawn = 0, visible = true, running = false;

  function size() {
    const r = canvas.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
    w = r.width; h = r.height;
    canvas.width = Math.max(1, Math.round(w * d)); canvas.height = Math.max(1, Math.round(h * d));
    ctx.setTransform(d, 0, 0, d, 0, 0);
  }
  const css = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  const geom = () => { const sds = w * 0.5, sx = w / 2 - sds / 2; return { sx, dx: sx + sds, u: sds / DET }; };

  function background() {
    ctx.clearRect(0, 0, w, h);
    const g = geom();
    [[g.sx, css("--red"), "S"], [g.dx, css("--blue"), "D"]].forEach(([x, c, t]) => {
      ctx.fillStyle = c; ctx.fillRect(x - 6, 0, 12, 7);
      ctx.font = "500 11px 'IBM Plex Mono', monospace"; ctx.fillText(t, x - 3, 22);
    });
    ctx.fillStyle = css("--muted"); ctx.font = "11px 'IBM Plex Mono', monospace";
    ctx.fillText("ρ = 30 mm", w / 2 - 28, 22);
  }

  // Draw paths [drawn, shown) once each.
  function drawNew() {
    const g = geom(), a = css("--path-a"), b = css("--path-b");
    ctx.lineWidth = 1;
    for (; drawn < shown; drawn++) {
      const p = paths[drawn];
      ctx.strokeStyle = drawn % 2 ? b : a;
      ctx.beginPath(); ctx.moveTo(g.sx + p[0][0] * g.u, p[0][1] * g.u);
      for (let i = 1; i < p.length; i++) ctx.lineTo(g.sx + p[i][0] * g.u, p[i][1] * g.u);
      ctx.stroke();
    }
  }

  function tick() {
    running = false;
    if (!visible) return;
    shown = Math.min(paths.length, shown + 3);
    drawNew();
    schedule();
  }
  function schedule() { if (!running && shown < paths.length) { running = true; requestAnimationFrame(tick); } }

  function redraw() { size(); background(); drawn = 0; drawNew(); }

  size(); background();
  if (reduce) { shown = paths.length; drawNew(); }
  else {
    new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) schedule(); }).observe(canvas);
    schedule();
  }

  let t;
  addEventListener("resize", () => { clearTimeout(t); t = setTimeout(redraw, 150); });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", redraw);
  return { redraw };
})();
