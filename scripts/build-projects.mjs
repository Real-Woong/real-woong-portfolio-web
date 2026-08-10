/**
 * content/projects/*.json  ->  the PROJECTS and META blocks in
 * public/portfolio.html.
 *
 * The page ships as one self-contained document (the worker inlines it at
 * build time), so generated data is written *into* the HTML between markers
 * rather than emitted as a separate file.
 *
 * Why this exists: the project write-ups used to be hand-copied from
 * Portfolio_info/*.md into an inline object. They drifted — TAPIoca claimed
 * 80 tests when it had 352, and 1 documented fix when it had 10. Now there
 * is one source, the HTML block is derived, and `--check` fails the build if
 * the two disagree.
 *
 *   node scripts/build-projects.mjs           # write
 *   node scripts/build-projects.mjs --check   # verify in sync, exit 1 if not
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";

const HTML = "public/portfolio.html";
const RESUME = "public/resume.html";

// Two regions, because live code (the modal refs, esc(), the uptime counter)
// sits between the two objects and must not be inside a generated span.
const REGIONS = {
  PROJECTS: {
    start: "  /* == GENERATED:PROJECTS — source content/projects, see scripts/build-projects.mjs == */",
    end: "  /* == END GENERATED:PROJECTS == */",
  },
  META: {
    start: "  /* == GENERATED:META — source content/projects, see scripts/build-projects.mjs == */",
    end: "  /* == END GENERATED:META == */",
  },
};

function replaceRegion(source, region, body) {
  const s = source.indexOf(region.start);
  const e = source.indexOf(region.end);
  if (s === -1 || e === -1 || e < s) {
    console.error(`markers not found or out of order in ${HTML}:\n${region.start}`);
    process.exit(1);
  }
  return source.slice(0, s) + region.start + "\n" + body + "\n" + region.end + source.slice(e + region.end.length);
}

const FIX_HEADINGS = ["해결한 기술적 문제", "해결한 문제"];

/** Collapse {ko, en} to {ko, en} only when a translation exists. */
function tr(v, where) {
  if (!v || typeof v !== "object" || !("ko" in v)) {
    throw new Error(`${where}: expected a {ko,...} value, got ${JSON.stringify(v)}`);
  }
  return v.en === undefined || v.en === null ? { ko: v.ko } : { ko: v.ko, en: v.en };
}

function load() {
  const files = readdirSync("content/projects").filter((f) => f.endsWith(".json")).sort();
  const docs = files.map((f) => JSON.parse(readFileSync(`content/projects/${f}`, "utf8")));
  // Archive order is the numbering shown on the page, not filename order.
  docs.sort((a, b) => Number(a.no) - Number(b.no));
  return docs;
}

function buildProject(doc) {
  const out = {
    no: doc.no,
    cat: doc.cat,
    year: doc.year,
    title: doc.title,
    tagline: tr(doc.tagline, `${doc.slug}.tagline`),
    github: doc.github ?? null,
    demo: doc.demo ?? null,
    stack: doc.stack ?? [],
    sections: doc.sections.map((s, i) => {
      const at = `${doc.slug}.sections[${i}]`;
      const sec = { h: tr(s.h, `${at}.h`) };
      if (s.type) sec.type = s.type;
      if (s.collapsed) sec.collapsed = true;
      if (s.note) sec.note = tr(s.note, `${at}.note`);
      if (s.body) sec.body = tr(s.body, `${at}.body`);
      if (s.groups) {
        sec.groups = s.groups.map((g, j) => {
          const grp = { h: tr(g.h, `${at}.groups[${j}].h`) };
          if (g.note) grp.note = tr(g.note, `${at}.groups[${j}].note`);
          if (g.entries) {
            grp.entries = g.entries.map((e, k) => {
              const row = { d: e.d, w: tr(e.w, `${at}.g[${j}].e[${k}].w`), l: tr(e.l, `${at}.g[${j}].e[${k}].l`) };
              if (e.k) row.k = true;
              return row;
            });
          }
          return grp;
        });
      }
      return sec;
    }),
  };
  return out;
}

/** Fix counts are counted, never typed: the badge cannot disagree with the log. */
function fixCount(doc) {
  const sec = doc.sections.find((s) => FIX_HEADINGS.includes(s.h.ko));
  return sec?.body?.ko?.length ?? 0;
}

/**
 * The portfolio sums the total from META in the browser. The resume ships as
 * static print HTML with no script, so its copy is written here instead — it
 * read 12 while the log documented 21, having been typed when TAPIoca still
 * claimed a single fix.
 */
function withFixTotal(source, total) {
  let found = 0;
  const next = source.replace(/(data-fix-total[^>]*>)\d+(<)/g, (_, open, close) => {
    found += 1;
    return `${open}${total}${close}`;
  });
  if (found === 0) {
    console.error(`no data-fix-total marker found in ${RESUME}`);
    process.exit(1);
  }
  return next;
}

const docs = load();
const PROJECTS = Object.fromEntries(docs.map((d) => [d.slug, buildProject(d)]));
const META = Object.fromEntries(
  docs.map((d) => [d.slug, [d.status.kind, tr(d.status.label, `${d.slug}.status`), fixCount(d)]]),
);

const indent = (o) => JSON.stringify(o, null, 2).replace(/\n/g, "\n  ");

const html = readFileSync(HTML, "utf8");
let next = replaceRegion(html, REGIONS.PROJECTS, `  var PROJECTS = ${indent(PROJECTS)};`);
next = replaceRegion(
  next,
  REGIONS.META,
  [
    "  // [statusKind, statusLabel, documentedFixes]. Fix counts are counted from",
    "  // the defect section, so a badge cannot drift from the log it summarises.",
    `  var META = ${indent(META)};`,
  ].join("\n"),
);

const fixTotal = Object.values(META).reduce((n, meta) => n + meta[2], 0);
const resume = readFileSync(RESUME, "utf8");
const nextResume = withFixTotal(resume, fixTotal);

if (process.argv.includes("--check")) {
  const stale = [next !== html && HTML, nextResume !== resume && RESUME].filter(Boolean);
  if (stale.length) {
    console.error(
      `${stale.join(" and ")} out of sync with content/projects.\n` +
        `Run: node scripts/build-projects.mjs`,
    );
    process.exit(1);
  }
  console.log(`in sync: ${docs.length} projects, ${fixTotal} documented fixes`);
} else {
  writeFileSync(HTML, next);
  writeFileSync(RESUME, nextResume);
  const translated = JSON.stringify(PROJECTS).match(/"en":/g)?.length ?? 0;
  console.log(
    `wrote ${docs.length} projects into ${HTML} (${translated} translated strings)\n` +
      `wrote ${fixTotal} documented fixes into ${RESUME}`,
  );
}
