/**
 * SECRETARY 의 _STATUS.md  <->  content/projects/*.json 의 status 블록 대조
 *
 * build-projects.mjs 가 content/projects 에서 public/portfolio.html 을 만든다.
 * 이 스크립트는 그보다 한 단계 위, 프로젝트의 *상태* 를 각 폴더의 _STATUS.md 와
 * 맞는지 확인한다.
 *
 * 왜 필요한가: agora.json 이 "Testnet E2E는 아직 완성되지 않았습니다" 라고 적어둔
 * 채로 한 달이 지났다. _STATUS.md 에는 2026-08-15 에 완료로 기록돼 있었다.
 * 손으로 관리하는 상태 라벨은 write-up 이 그랬듯 어긋나고, 어긋나는 방향은
 * 대체로 *아래쪽* 이다 — 끝낸 일을 사이트가 스스로 깎아먹는다.
 *
 *   node scripts/sync-status.mjs           # 대조 결과 보고
 *   node scripts/sync-status.mjs --check   # 모순이 있으면 exit 1 (pre-push 용)
 *   node scripts/sync-status.mjs --fix     # 안전한 방향만 자동 수정
 *
 * 자동으로 덮어쓰지 않는 이유: 두 어휘는 축이 다르다. _STATUS.md 는 "내가 손대고
 * 있는가"(활동), status.kind 는 "배포됐는가·끝났는가"(성숙도)다. SogonZip 은
 * 진행중이면서 live 이고 둘 다 참이다. 1:1 로 옮기면 live 를 wip 으로 강등시키는
 * 식으로 오히려 사이트가 나빠진다. 그래서 서로 모순되는 조합만 잡는다.
 *
 * 경계: status.kind 와 status.label 만 다룬다. `next`, `blockers`,
 * `## 최근 진행` 은 넘어오지 않는다. 그건 나에게 쓴 리스크 메모지
 * ("Mock DEX는 신뢰 경계가 아니다", "마이그레이션 0009 미적용")
 * 포트폴리오를 보는 사람에게 할 말이 아니다.
 *
 * prebuild 에 걸지 마라. _STATUS.md 는 모든 저장소에서 gitignore 되어 있어
 * CI/Cloudflare 빌드에는 존재하지 않는다. 거기서는 매번 실패한다.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const MAP = JSON.parse(readFileSync(resolve(REPO, "content/status-map.json"), "utf8"));
const ROOT = resolve(REPO, MAP.root);

const check = process.argv.includes("--check");
const fix = process.argv.includes("--fix");

/** _STATUS.md 프론트매터에서 status / updated 를 읽는다. */
function readStatus(rel) {
  const file = resolve(ROOT, rel, "_STATUS.md");
  if (!existsSync(file)) return null;
  const fm = readFileSync(file, "utf8").match(/^---\n([\s\S]*?)\n---/);
  if (!fm) return null;
  const pick = (k) => (fm[1].match(new RegExp(`^${k}:\\s*(\\S+)`, "m")) || [])[1] ?? null;
  return { status: pick("status"), updated: pick("updated") };
}

const conflicts = [];
const fixed = [];
const skipped = [];
let checked = 0;

for (const [slug, rel] of Object.entries(MAP.projects)) {
  if (slug in MAP.pinned) {
    skipped.push(`📌 ${slug} — 고정: ${MAP.pinned[slug]}`);
    continue;
  }

  const jsonPath = resolve(REPO, `content/projects/${slug}.json`);
  if (!existsSync(jsonPath)) {
    skipped.push(`?  ${slug} — content/projects/${slug}.json 이 없다`);
    continue;
  }

  const src = readStatus(rel);
  if (!src?.status) {
    skipped.push(`?  ${slug} — ${rel}/_STATUS.md 를 못 읽었다 (폴더가 옮겨졌나?)`);
    continue;
  }

  const doc = JSON.parse(readFileSync(jsonPath, "utf8"));
  const kind = doc.status?.kind;
  checked += 1;
  const ok = MAP.compat[src.status] ?? [];
  if (ok.includes(kind)) continue;

  const want = MAP.autofix[src.status];
  const canFix = want && want !== kind;

  if (fix && canFix) {
    const label = MAP.labels[want];
    doc.status = { kind: want, label: { ko: label.ko, en: label.en } };
    writeFileSync(jsonPath, JSON.stringify(doc, null, 2) + "\n");
    fixed.push(`✔  ${slug.padEnd(18)} ${kind} ⇒ ${want} (${label.ko})`);
    continue;
  }

  conflicts.push({
    slug,
    kind,
    status: src.status,
    updated: src.updated,
    hint: canFix
      ? `--fix 로 ${want} 로 내릴 수 있다`
      : `사이트가 "${MAP.labels[kind]?.ko ?? kind}" 라고 하는데 _STATUS.md 는 "${src.status}" 다 — 어느 쪽이 맞는지 보고 손으로 고쳐라`,
  });
}

if (skipped.length) console.log(skipped.map((s) => "  " + s).join("\n") + "\n");
if (fixed.length) console.log(fixed.map((s) => "  " + s).join("\n") + "\n");

if (!conflicts.length) {
  console.log(`✅ ${checked}개 대조 완료, 모순 없음.`);
  if (fixed.length) console.log(`   ${fixed.length}개 수정됨. 이어서 \`npm run content\` 로 portfolio.html 에 반영해라.`);
  process.exit(0);
}

console.log("모순:");
for (const c of conflicts) {
  console.log(`  ✗ ${c.slug.padEnd(18)} 사이트=${c.kind}  _STATUS.md=${c.status} (${c.updated})`);
  console.log(`      ${c.hint}`);
}

if (check) {
  console.error(`\n❌ ${conflicts.length}개 모순.`);
  process.exit(1);
}
console.log(`\n${conflicts.length}개 모순. 자동으로 고칠 수 있는 건 \`--fix\`, 나머지는 손으로 판단해야 한다.`);
