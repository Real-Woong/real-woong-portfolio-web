/**
 * One-shot migration: lift the inline PROJECTS/META objects out of
 * public/portfolio.html into content/projects/*.json.
 *
 * Run once. After this, content/ is the source and build-projects.mjs
 * regenerates the HTML from it. Kept in the repo so the migration is
 * reproducible and reviewable rather than a pile of hand-typed files.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

const html = readFileSync("public/portfolio.html", "utf8");

function evalBlock(name) {
  const src = html.match(new RegExp(`var ${name} = (\\{[\\s\\S]*?\\n  \\});`));
  if (!src) throw new Error(`${name} not found`);
  return new Function(`return ${src[1]};`)();
}

const PROJECTS = evalBlock("PROJECTS");
const META = evalBlock("META");

mkdirSync("content/projects", { recursive: true });

/** Korean strings become {ko}; English gets filled in later. */
const t = (s) => ({ ko: s });
const tList = (a) => ({ ko: a });

let count = 0;
for (const [slug, p] of Object.entries(PROJECTS)) {
  const meta = META[slug];
  if (!meta) throw new Error(`${slug} has no META entry`);

  const doc = {
    slug,
    no: p.no,
    cat: p.cat,
    year: p.year,
    title: p.title,
    status: { kind: meta[0], label: t(meta[1]) },
    tagline: t(p.tagline),
    github: p.github,
    demo: p.demo,
    stack: p.stack,
    sections: p.sections.map((s) => {
      const out = { h: t(s.h) };
      if (s.type) out.type = s.type;
      if (s.collapsed) out.collapsed = true;
      if (s.note) out.note = t(s.note);
      if (s.body) out.body = tList(s.body);
      if (s.groups) {
        out.groups = s.groups.map((g) => {
          const grp = { h: t(g.h) };
          if (g.note) grp.note = tList(g.note);
          if (g.entries) {
            grp.entries = g.entries.map((e) => {
              const row = { d: e.d, w: t(e.w), l: t(e.l) };
              if (e.k) row.k = true;
              return row;
            });
          }
          return grp;
        });
      }
      return out;
    }),
  };

  writeFileSync(`content/projects/${slug}.json`, JSON.stringify(doc, null, 2) + "\n");
  count++;
}

console.log(`extracted ${count} projects to content/projects/`);
