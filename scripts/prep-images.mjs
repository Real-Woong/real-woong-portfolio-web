/**
 * img-source/<slug>/*  ->  public/projects/<slug>/*
 *
 * Drop raw screenshots and photos into img-source/<slug>/ (that folder stays
 * out of the build). This resizes them to at most 1600px wide and re-encodes
 * to JPEG (PNG screenshots with transparency are kept as PNG) using macOS
 * `sips`, then prints the media block to paste into content/projects/<slug>.json.
 *
 *   node scripts/prep-images.mjs              # every slug folder
 *   node scripts/prep-images.mjs marvis       # one slug
 *
 * Why a script: phone screenshots arrive at 3000+ px and several MB. The page
 * ships these to a visitor, so every file has to be web-sized first.
 */
import { readdirSync, mkdirSync, statSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, extname, basename } from "node:path";

const SRC = "img-source";
const OUT = "public/projects";
const MAX = 1600;
const only = process.argv[2];

const slugs = readdirSync(SRC).filter((n) => statSync(join(SRC, n)).isDirectory() && (!only || n === only));
if (!slugs.length) {
  console.log(`no folders in ${SRC}/ yet — put files in ${SRC}/<slug>/ first`);
  process.exit(0);
}

for (const slug of slugs) {
  const files = readdirSync(join(SRC, slug)).filter((f) => /\.(png|jpe?g|heic|webp)$/i.test(f)).sort();
  if (!files.length) continue;
  mkdirSync(join(OUT, slug), { recursive: true });
  const media = [];
  for (const f of files) {
    const base = basename(f, extname(f)).normalize("NFC").replace(/[^\p{L}\p{N}_-]+/gu, "-").toLowerCase();
    const png = /\.png$/i.test(f);
    const outName = `${base}.${png ? "png" : "jpg"}`;
    const out = join(OUT, slug, outName);
    const args = ["-Z", String(MAX), "--setProperty", "format", png ? "png" : "jpeg"];
    if (!png) args.push("--setProperty", "formatOptions", "78");
    execFileSync("sips", [...args, join(SRC, slug, f), "--out", out], { stdio: "ignore" });
    console.log(`${join(SRC, slug, f)} -> ${out} (${Math.round(statSync(out).size / 1024)} KB)`);
    media.push({ src: `/projects/${slug}/${outName}`, alt: { ko: "", en: "" } });
  }
  console.log(`\n"media": ${JSON.stringify(media, null, 2)}\n`);
}
