// Builds the story section of alex.html from tools/alex-posts.json (an export of the family blog).
// Run: node tools/gen-alex.js
const fs = require("fs");
const posts = JSON.parse(fs.readFileSync(__dirname + "/alex-posts.json", "utf8"))
  .sort((a, b) => a.d.localeCompare(b.d));
const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");

function clean(html) {
  let h = html.replace(/\r/g, "");
  const media = [];
  // images: keep only Blogger-hosted ones, at a sensible size
  h = h.replace(/<img\b[^>]*>/gi, tag => {
    const m = tag.match(/src="([^"]+)"/);
    if (!m || !/blogger\.googleusercontent\.com/.test(m[1])) return "";
    const src = m[1].replace(/\/(s|w|h)\d+[^/]*\//, "/s800/");
    media.push(`<img src="${esc(src)}" alt="" loading="lazy">`);
    return `\u0001${media.length - 1}\u0001`;
  });
  // youtube embeds become links; other embeds/flash are dropped
  h = h.replace(/<iframe\b[^>]*src="([^"]+)"[^>]*>[\s\S]*?<\/iframe>/gi, (_, s) =>
    /youtube/.test(s) ? `<a href="${esc(s.replace("/embed/", "/watch?v=").replace(/^\/\//, "https://"))}" target="_blank" rel="noopener">Watch the video</a>` : "");
  h = h.replace(/<object[\s\S]*?<\/object>/gi, "").replace(/<(script|style)[\s\S]*?<\/\1>/gi, "");
  // links to full-size images just wrap the photo; unwrap them
  h = h.replace(/<a\b[^>]*href="[^"]*(?:googleusercontent|bp\.blogspot)[^"]*"[^>]*>([\s\S]*?)<\/a>/gi, "$1");
  // keep only simple tags; links keep href only
  h = h.replace(/<a\b[^>]*?href="([^"]+)"[^>]*>/gi, (_, u) => `<a href="${esc(u)}" target="_blank" rel="noopener">`);
  h = h.replace(/<(\/?)(b|strong|i|em|u|a|ul|ol|li|br|sup)\b(?![^>]*href)[^>]*>/gi, (_, s, t) => `<${s}${t.toLowerCase()}>`);
  h = h.replace(/<\/?(?!(?:b|strong|i|em|u|a|ul|ol|li|br|sup)\b)[a-z][^>]*>/gi, "\n");
  h = h.replace(/&nbsp;/g, " ");
  // remove email addresses (and mailto links) so they are not published
  h = h.replace(/<a\b[^>]*href="mailto:[^"]*"[^>]*>[\s\S]*?<\/a>/gi, "[email removed]").replace(/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g, "[email removed]");
  // paragraphs from runs of line breaks
  const paras = h.split(/(?:\s*<br\s*\/?>\s*){2,}|\n{2,}/).map(p => p.replace(/<br>/g, " ").replace(/\s+/g, " ").trim()).filter(p => p.replace(/<[^>]+>/g, "").trim() || /\u0001/.test(p));
  const out = [], figs = [];
  for (let p of paras) {
    const ims = [...p.matchAll(/\u0001(\d+)\u0001/g)].map(m => media[m[1]]);
    p = p.replace(/\u0001\d+\u0001/g, "").trim();
    ims.forEach(i => figs.push(i));
    if (/account number|Wachovia/i.test(p)) continue; // old donation account details
    if (p.replace(/<[^>]+>/g, "").trim()) out.push(`<p>${p}</p>`);
  }
  const gal = figs.length ? `<div class="post-photos">${figs.join("")}</div>` : "";
  return out.join("\n") + gal;
}

const fmt = d => new Date(d.slice(0, 10) + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
const years = {};
posts.forEach(p => (years[p.d.slice(0, 4)] ||= []).push(p));
let html = `<nav class="years" aria-label="Jump to a year">${Object.keys(years).map(y => `<a href="#y${y}">${y}</a>`).join("")}</nav>\n`;
for (const [y, ps] of Object.entries(years)) {
  html += `<h3 class="year" id="y${y}">${y}</h3>\n`;
  for (const p of ps) {
    html += `<article class="post">\n<h4>${esc(p.t.trim() || "Update")}</h4>\n<p class="meta">${fmt(p.d)}</p>\n${clean(p.c)}\n</article>\n`;
  }
}
const f = __dirname + "/../alex.html";
let page = fs.readFileSync(f, "utf8");
page = page.replace(/(<!-- posts:start -->)[\s\S]*(<!-- posts:end -->)/, (_, a, b) => a + "\n" + html + b);
fs.writeFileSync(f, page);
console.log(posts.length, "posts written");
