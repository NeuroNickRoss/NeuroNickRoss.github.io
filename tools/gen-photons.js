// Generates photons.js: detected photon paths for the hero animation.
// 2D isotropic random walk with unit steps in a semi-infinite medium (y > 0 is tissue).
// Photons launch into the tissue at x = 0, are absorbed with probability MUA per step,
// and are kept only if they exit the surface within 1.5 steps of the detector at x = D.
// Usage: node tools/gen-photons.js [count] > photons.js
const D = 24, W = D * 2, H = D * 1.5, MUA = 0.004, KEEP_EVERY = 3;
const N = Number(process.argv[2] || 180);

function walk() {
  let x = 0, y = 0, th = Math.PI * Math.random();
  const pts = [[0, 0]];
  for (let i = 0; i < 4000; i++) {
    if (i > 0) th = Math.random() * Math.PI * 2;
    x += Math.cos(th); y += Math.sin(th); pts.push([x, y]);
    if (Math.random() < MUA || y > H || x < -(W - D) / 2 - 2 || x > D + (W - D) / 2 + 2) return null;
    if (y <= 0) return Math.abs(x - D) < 1.5 ? pts : null;
  }
  return null;
}

const paths = [];
while (paths.length < N) { const p = walk(); if (p) paths.push(p); }

// Keep every third point and quantize to half steps to keep the file small.
const enc = paths.map((p) => {
  const k = p.filter((_, i) => i % KEEP_EVERY === 0).concat([p[p.length - 1]]);
  return k.map(([x, y]) => Math.round(x * 2) + "," + Math.max(0, Math.round(y * 2))).join(" ");
});

process.stdout.write(
  "// Precomputed 2D Monte Carlo photon paths (detected only). Units: half scattering steps;\n" +
  "// source at x=0, detector at x=" + D * 2 + ", depth y>0. Regenerate with tools/gen-photons.js.\n" +
  "window.PHOTONS = " + JSON.stringify(enc) + ";\n"
);
