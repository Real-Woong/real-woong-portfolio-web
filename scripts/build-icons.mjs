/**
 * img-source/_icons/*  ->  public/projects/<slug>/icon.png + icon-line.png
 *
 * The original logos are all different shapes, sizes and backgrounds, so they
 * are never shown raw. Two derived versions per project:
 *
 *   icon.png       the real logo inside a uniform rounded tile (archive
 *                  thumbnails, modal head). Same size, same radius, same
 *                  padding for all of them.
 *   icon-line.png  the same logo redrawn as thin cream lines on near-black
 *                  (hero reel only). Edge detection per colour channel, so
 *                  gradients and colour differences become plain lines.
 *
 * img-source/ is gitignored; only the outputs are committed. Run after adding
 * or replacing a logo:  node scripts/build-icons.mjs [slug ...]
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = "img-source/_icons/";
const OUT = "public/projects/";
const TILE = 512, LINE = 192;
const LIGHT = "#f6f4ee";          // tile colour for logos without their own background
const INK = "#0d0d0c", PAPER = [241, 238, 230];

// slug -> source (relative to SRC). `cover`: the source already is a full
// square tile, so it fills the frame instead of being inset. `lineSrc`: use a
// different file for the line version. `crop`: keep only this centre fraction
// for the line version (drops a tile's own outline). `lineScale`: how much of
// the reel square the drawing may fill (default 0.78); lower for marks whose
// outer strokes touch the edge of their source and would look cut off. `shave`: trim this
// fraction off every edge of a cover tile (anti-aliased fringe from a source
// with transparent rounded corners). `whiten`: the source has a faint off-white
// frame or rule; push near-white to pure white.
const MAP = {
  "agora":                 { f: "Agora.png", cover: true, crop: 0.84, shave: 0.05, lineScale: 0.62 },
  "aispoc":                { f: "AI-Spoc.png" },
  "birthrate-bm":          { f: "birthrate-bm.webp" },
  "blockthon2026":         { f: "blockthon-1.png" },
  "blocktroll":            { f: "BlockTroll.png" },
  "bubblebreak":           { f: "BubbleBreak.png", whiten: true },
  "buildtrace":            { f: "buildtrace/buildtrace-icon-dark.svg", cover: true, lineScale: 0.62 },
  "cryptofunding":         { f: "CyptoFunding.png" },
  "cvprojects":            { f: "cvprojects/opencv-landmarks-icon-v2.png", shave: 0.1, crop: 0.82 },
  "daedongje2023":         { f: "daedongje2023_logo.webp" },
  "gongppung":             { f: "gongppung_logo.jpg", whiten: true, shave: 0.07 },
  "harang":                { f: "harang_logo.webp" },
  "healeat":               { f: "HealEat.png" },
  "ilque":                 { f: "ilque/ilque-thumb.png", cover: true, lineSrc: "ilque/ilque-logo-src.png" },
  "marvis":                { f: "marvis/marvis-mj.svg", cover: true, crop: 0.8 },
  "sogonzip":              { f: "sogon-logo-mark.svg" },
  "tapioca":               { f: "TAPIoca .png" },
  "tapioca-ver2":          { f: "Tapioca_ver2-icon.png" },
  "textro":                { f: "Textro.png" },
  "unimade":               { f: "UNI-MADE.png" },
  "yonsei-korea-exchange": { f: "yonsei-korea-exchange_logo.webp", cover: true, crop: 0.95, lineScale: 0.6 },
};

// SVGs are rasterised at ~1100px wide whatever their own size.
const svgDensity = {};
async function prep() {
  for (const c of Object.values(MAP)) for (const f of [c.f, c.lineSrc]) {
    if (f && f.endsWith(".svg") && !svgDensity[f]) svgDensity[f] = 72 * Math.max(1, 1100 / (await sharp(SRC + f).metadata()).width);
  }
}
const open = (f) => sharp(SRC + f, svgDensity[f] ? { density: svgDensity[f] } : {});
const rounded = (r) => Buffer.from(`<svg width="${TILE}" height="${TILE}"><rect width="${TILE}" height="${TILE}" rx="${r}" fill="#fff"/></svg>`);

async function cornerBg(f) {
  // Colour of the logo's own background, or null when the corner is transparent.
  const { data, info } = await open(f).resize(64, 64, { fit: "fill" }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const i = (3 * info.width + 3) * 4;
  return data[i + 3] < 200 ? null : { r: data[i], g: data[i + 1], b: data[i + 2] };
}

async function tile(f, cover, shave, whiten) {
  const bg = await cornerBg(f);
  const bgc = whiten ? { r: 255, g: 255, b: 255 } : (bg || LIGHT);
  const inner = cover ? TILE : Math.round(TILE * 0.7);
  let src = open(f);
  if (shave) {
    const m = await open(f).metadata(), d = Math.round(Math.min(m.width, m.height) * shave);
    src = sharp(await open(f).toBuffer()).extract({ left: d, top: d, width: m.width - 2 * d, height: m.height - 2 * d });
  }
  let pipe = src.resize(inner, inner, { fit: cover ? "cover" : "inside", kernel: "lanczos3" });
  let logo;
  if (whiten) {
    // Only pixels that are already near-white become white; colours are untouched.
    const { data, info } = await pipe.flatten({ background: "#ffffff" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    for (let i = 0; i < data.length; i += 3) if (data[i] > 205 && data[i + 1] > 205 && data[i + 2] > 205) data[i] = data[i + 1] = data[i + 2] = 255;
    logo = await sharp(data, { raw: info }).png().toBuffer();
  } else logo = await pipe.toBuffer();
  const out = await sharp({ create: { width: TILE, height: TILE, channels: 4, background: bgc } })
    .composite([{ input: logo, gravity: "center" }]).png().toBuffer();
  return sharp(out).composite([{ input: rounded(Math.round(TILE * 0.18)), blend: "dest-in" }])
    .png({ palette: true, quality: 90, effort: 9 }).toBuffer();
}

async function line(f, crop, scale = 0.78) {
  const N = LINE, inner = Math.round(N * scale);
  let img = open(f);
  if (crop) {
    const m = await open(f).metadata();
    const w = Math.round(m.width * crop), h = Math.round(m.height * crop);
    img = sharp(await open(f).toBuffer()).extract({ left: Math.round((m.width - w) / 2), top: Math.round((m.height - h) / 2), width: w, height: h });
  }
  // Work at 2x so thin lines stay crisp, near-white forced to pure white so a
  // faint off-white backdrop doesn't draw a border.
  const W = inner * 2;
  const { data, info } = await img.resize(W, W, { fit: "contain", background: "#ffffff", kernel: "lanczos3" })
    .flatten({ background: "#ffffff" }).linear(255 / 238, 0).blur(1.1).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, mag = new Float32Array(w * h);
  const g = (x, y, c) => data[(Math.min(h - 1, Math.max(0, y)) * w + Math.min(w - 1, Math.max(0, x))) * 3 + c];
  let mx = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    let m = 0;
    for (let c = 0; c < 3; c++) {
      const gx = -g(x-1,y-1,c) - 2*g(x-1,y,c) - g(x-1,y+1,c) + g(x+1,y-1,c) + 2*g(x+1,y,c) + g(x+1,y+1,c);
      const gy = -g(x-1,y-1,c) - 2*g(x,y-1,c) - g(x+1,y-1,c) + g(x-1,y+1,c) + 2*g(x,y+1,c) + g(x+1,y+1,c);
      m = Math.max(m, Math.hypot(gx, gy));
    }
    mag[y * w + x] = m; if (m > mx) mx = m;
  }
  const a = Buffer.alloc(w * h);
  for (let i = 0; i < w * h; i++) a[i] = Math.round(Math.pow(Math.min(1, mag[i] / (mx * 0.35)), 0.8) * 255);
  const mask = await sharp(a, { raw: { width: w, height: h, channels: 1 } }).blur(0.6).linear(1.5, -35).extractChannel(0).raw().toBuffer();
  const rgba = Buffer.alloc(w * h * 4);
  for (let i = 0; i < w * h; i++) { rgba[i*4] = PAPER[0]; rgba[i*4+1] = PAPER[1]; rgba[i*4+2] = PAPER[2]; rgba[i*4+3] = mask[i]; }
  const lines = await sharp(rgba, { raw: { width: w, height: h, channels: 4 } }).resize(inner, inner).png().toBuffer();
  return sharp({ create: { width: N, height: N, channels: 3, background: INK } })
    .composite([{ input: lines, gravity: "center" }]).png({ palette: true, quality: 90, effort: 9 }).toBuffer();
}

await prep();
const only = process.argv.slice(2);
for (const [slug, c] of Object.entries(MAP)) {
  if (only.length && !only.includes(slug)) continue;
  mkdirSync(OUT + slug, { recursive: true });
  const [t, l] = await Promise.all([tile(c.f, c.cover, c.shave, c.whiten), line(c.lineSrc || c.f, c.crop, c.lineScale)]);
  await sharp(t).toFile(`${OUT}${slug}/icon.png`);
  await sharp(l).toFile(`${OUT}${slug}/icon-line.png`);
  console.log(slug.padEnd(24), `icon ${(t.length / 1024).toFixed(0)}KB  line ${(l.length / 1024).toFixed(0)}KB`);
}
