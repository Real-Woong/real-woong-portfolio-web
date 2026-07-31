import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const html = readFileSync("public/portfolio.html", "utf8");
const resume = readFileSync("public/resume.html", "utf8");

const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const body = html.slice(html.indexOf("<body>"), html.indexOf("<script>"));

/** Every non-empty text node in the static body, trimmed. */
function bodyTextNodes() {
  return body
    .split(/<[^>]+>/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** The `var EN = { ... }` dictionary, evaluated as a real object. */
function translationDictionary() {
  const src = html.match(/var EN = (\{[\s\S]*?\n {2}\});/);
  assert.ok(src, "translation dictionary not found");
  return new Function(`return ${src[1]};`)();
}

/** The `var META = { ... }` status/fix map used by the project modal. */
function modalMeta() {
  const src = html.match(/var META = (\{[\s\S]*?\n {2}\});/);
  assert.ok(src, "modal META map not found");
  return new Function(`return ${src[1]};`)();
}

test("portfolio is the root document, not an iframe", () => {
  assert.equal(html.includes("<iframe"), false, "portfolio must not embed itself");

  const page = readFileSync("app/page.tsx", "utf8");
  assert.equal(page.includes("<iframe"), false, "Next shell must not iframe the portfolio");

  const worker = readFileSync("worker/index.ts", "utf8");
  assert.match(worker, /portfolio\.html\?raw/, "worker must inline the portfolio at build time");
  assert.match(worker, /url\.pathname === "\/"/, "worker must serve the portfolio at /");
});

test("social preview metadata is present in the document itself", () => {
  for (const tag of ["og:title", "og:description", "og:image", "twitter:card"]) {
    assert.match(html, new RegExp(tag), `missing ${tag}`);
  }
  assert.match(html, /application\/ld\+json/, "missing Person structured data");
  assert.ok(existsSync("public/og.jpg"), "og.jpg must exist");

  const layout = readFileSync("app/layout.tsx", "utf8");
  assert.match(layout, /og\.jpg/, "layout must reference the compressed OG image");
  assert.equal(layout.includes("og.png"), false, "stale 1.8MB og.png reference");
});

test("inline scripts parse", () => {
  assert.equal(scripts.length, 3, "expected three inline script blocks");
  for (const [i, src] of scripts.entries()) {
    assert.doesNotThrow(() => new Function(src), `script block ${i} has a syntax error`);
  }
});

test("every Korean string in the body has an English translation", () => {
  const EN = translationDictionary();
  const missing = bodyTextNodes().filter((s) => /[가-힣]/.test(s) && !(s in EN));
  assert.deepEqual(missing, [], `untranslated strings:\n  ${missing.join("\n  ")}`);
});

test("translation dictionary has no dead entries", () => {
  const EN = translationDictionary();
  const nodes = new Set(bodyTextNodes());
  const modalHeadings = new Set(
    [...html.matchAll(/"h": "([^"]+)"/g)].map((m) => m[1]).concat("기술 스택"),
  );
  const dead = Object.keys(EN).filter((k) => !nodes.has(k) && !modalHeadings.has(k));
  assert.deepEqual(dead, [], `dictionary entries matching nothing:\n  ${dead.join("\n  ")}`);
});

test("status and fix badges agree between markup and modal", () => {
  const META = modalMeta();
  const projects = [...html.matchAll(/data-project="([a-z0-9-]+)"/g)].map((m) => m[1]);

  for (const slug of new Set(projects)) {
    assert.ok(META[slug], `${slug} is missing a META entry`);
  }

  // Each card renders its status label, and a Fixed badge only when count > 0.
  for (const [slug, [, label, fixed]] of Object.entries(META)) {
    const card = body.match(
      new RegExp(`<article class="a-item reveal" data-project="${slug}"[\\s\\S]*?</article>`),
    );
    if (!card) continue;
    assert.match(card[0], new RegExp(label), `${slug} card missing status "${label}"`);
    assert.equal(
      /badge fixed/.test(card[0]),
      fixed > 0,
      `${slug} card Fixed badge does not match count ${fixed}`,
    );
  }
});

test("fix counts match the documented defect sections", () => {
  const META = modalMeta();
  const FIX_HEADINGS = ["해결한 기술적 문제", "해결한 문제"];

  for (const [slug, [, , expected]] of Object.entries(META)) {
    const block = html.match(new RegExp(`"${slug}": \\{[\\s\\S]*?\\n {2}\\}`));
    if (!block) continue;
    const heading = FIX_HEADINGS.find((h) => block[0].includes(`"h": "${h}"`));
    if (!heading) {
      assert.equal(expected, 0, `${slug} claims ${expected} fixes but documents none`);
      continue;
    }
    const section = block[0].slice(block[0].indexOf(`"h": "${heading}"`));
    const bodyArr = section.match(/"body": \[([\s\S]*?)\]/);
    const items = (bodyArr?.[1].match(/"/g)?.length ?? 0) / 2;
    assert.equal(items, expected, `${slug} documents ${items} fixes but badge says ${expected}`);
  }
});

test("hero uptime stat hides itself until a real start date is set", () => {
  const since = html.match(/var MARVIS_SINCE = ([^;]+);/);
  assert.ok(since, "MARVIS_SINCE not found");
  if (since[1].trim() === "null") {
    assert.match(html, /if\(!MARVIS_SINCE\)\{ if\(stat\) stat\.remove\(\); return; \}/,
      "unset uptime must remove the stat rather than show a placeholder");
  } else {
    assert.match(since[1], /'\d{4}-\d{2}-\d{2}'/, "MARVIS_SINCE must be an ISO date");
  }
});

test("resume is reachable and print-ready", () => {
  assert.match(html, /href="\/resume\.html"/, "portfolio must link to the resume");
  assert.match(resume, /@page\{size:A4/, "resume must define A4 print geometry");
  assert.match(resume, /window\.print\(\)/, "resume needs a print action");
  assert.equal(resume.includes("010-"), false, "resume must not expose a phone number");
});

test("no phone number or stale project descriptions ship to the public page", () => {
  assert.equal(/01[0-9]-\d{3,4}-\d{4}/.test(html), false, "phone number in public page");
  assert.equal(
    html.includes("AI 트레이딩 에이전트 마켓플레이스"),
    false,
    "Agora's abandoned marketplace description is still present",
  );
  assert.equal(html.includes("SUI-HackerThon"), false, "stale hackathon spelling");
});

test("build output inlines the portfolio", () => {
  const bundle = "dist/server/index.js";
  if (!existsSync(bundle)) return; // `npm test` runs build first; skip if invoked alone
  const out = readFileSync(bundle, "utf8");
  assert.ok(out.includes("Builder Portfolio"), "portfolio HTML missing from worker bundle");
});
