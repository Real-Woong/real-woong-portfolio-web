/**
 * content/projects/*.json  <->  SECRETARY 의 _STATUS.md — *글이 늙었는가*
 *
 * sync-status.mjs 와 축이 다르다. 저쪽은 상태 *라벨* 둘(`_STATUS.md` 의 status 와
 * `status.kind`)이 서로 모순인지 본다. 그건 잘 하고 있지만, 주석에 적어 둔 대로
 * `next`·`blockers`·`## 최근 진행` 은 일부러 넘기지 않는다 — 나에게 쓴 리스크 메모지
 * 포트폴리오를 보는 사람에게 할 말이 아니기 때문이다. 맞는 판단이다. 그 결과
 * **글의 내용이 늙는 것은 아무도 안 보고 있었다.**
 *
 * 2026-09-04 에 손으로 훑었더니 셋이 나왔다. TAPIoca 는 9/1 에 실제 돈으로
 * 전환했는데 사이트는 "9월 1일 전환합니다" 라고 미래형으로 서 있었고 한도도
 * 계획값이었다. BuildTrace 는 "아직 실행 가능한 코드나 배포 환경은 없습니다" 라고
 * 적혀 있었는데 9/1 에 proof demo 와 테스트 11건이 들어와 있었다. Agora 는 8/28
 * 실행기 인증이 빠져 있었다. **그날 sync-status.mjs 는 처음부터 끝까지
 * "모순 없음" 이었다.** 라벨은 정말로 안 어긋나 있었으니까.
 *
 *   node scripts/check-drift.mjs           # 대조 결과 보고
 *   node scripts/check-drift.mjs --check   # 걸리는 게 있으면 exit 1
 *   node scripts/check-drift.mjs --links   # github·demo 링크 HTTP 확인까지 (네트워크)
 *   GITHUB_TOKEN=$(gh auth token) node scripts/check-drift.mjs --links   # 한도 60 → 5000
 *
 * 문장을 대조하지 않는 이유: `_STATUS.md` 는 나에게 쓴 한국어 메모고 프로젝트 글은
 * 남에게 보이는 한국어·영어 산문이다. 같은 사실을 다르게 쓰는 것이 정상이라 기계가
 * 옳고 그름을 못 가린다. 그래서 **날짜 하나만 본다 — 원본이 사본보다 나중에
 * 움직였는가.** 무엇이 틀렸는지는 말하지 않고 사람을 부르기만 한다.
 *
 * 한계 둘. ① 커밋 날짜를 쓰므로 워킹 트리에서 고치고 아직 커밋 안 한 것은 여전히
 * 낡은 것으로 나온다. ② `updated:` 는 날짜뿐이라 **같은 날 움직인 둘은 순서를
 * 못 가린다** — 조용히 넘기면 Agora 같은 건을 놓치므로 📎 로 띄운다(걸린 것으로는
 * 세지 않는다).
 *
 * prebuild 에 걸지 마라. sync-status.mjs 와 같은 이유다 — `_STATUS.md` 는 모든
 * 저장소에서 gitignore 되어 있어 CI/Cloudflare 빌드에는 존재하지 않는다.
 * 색인이 없으면 조용히 건너뛰고 exit 0 으로 끝난다.
 */
import { readFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, "..");
const MAP = JSON.parse(readFileSync(resolve(REPO, "content/status-map.json"), "utf8"));
const ROOT = resolve(REPO, MAP.root);

const check = process.argv.includes("--check");
const wantLinks = process.argv.includes("--links");

const findings = [];
const notes = [];
const sameDay = [];

// ── SECRETARY 색인 ────────────────────────────────────────────────────────
// render.py 가 유일한 파서다. _STATUS.md 를 여기서 다시 파싱하면 파서가 둘이 된다.
const indexPath = resolve(ROOT, "SECRETARY/_index/all_status.json");
if (!existsSync(indexPath)) {
  console.log("?  SECRETARY 색인이 없다 — CI 이거나 다른 기기인 듯하다.");
  console.log("   `python3 SECRETARY/render.py` 를 먼저 돌려라. 대조는 건너뛴다.");
  process.exit(0);
}
const byPath = new Map(
  JSON.parse(readFileSync(indexPath, "utf8")).projects.map((p) => [p.path, p]),
);

/** 그 파일을 마지막으로 건드린 커밋 날짜 (YYYY-MM-DD). */
function lastCommitted(rel) {
  try {
    const out = execFileSync("git", ["log", "-1", "--format=%cI", "--", rel], {
      cwd: REPO,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    return out ? out.slice(0, 10) : null;
  } catch {
    return null;
  }
}

// projects 는 sync-status.mjs 와 공유한다. driftExtra 는 _STATE.md 만 있어
// 저쪽 대조에는 못 들어가지만 render.py 는 updated 를 뽑아 주는 것들이다.
const pairs = { ...MAP.projects, ...(MAP.driftExtra ?? {}) };

// ── 1. 원본이 사본보다 나중에 움직였는가 ──────────────────────────────────
let compared = 0;
for (const [slug, path] of Object.entries(pairs)) {
  const jsonRel = `content/projects/${slug}.json`;
  if (!existsSync(resolve(REPO, jsonRel))) {
    findings.push({ kind: "지도", what: slug, why: `${jsonRel} 이 없다` });
    continue;
  }
  const src = byPath.get(path);
  if (!src) {
    findings.push({ kind: "지도", what: slug, why: `SECRETARY 에 \`${path}\` 가 없다 — 폴더가 옮겨졌나?` });
    continue;
  }
  if (!src.updated) continue;
  const touched = lastCommitted(jsonRel);
  if (!touched) continue;
  compared += 1;
  if (src.updated > touched) {
    findings.push({
      kind: "묵음",
      what: slug,
      why: `_STATUS.md 는 ${src.updated} 에 움직였는데 ${jsonRel} 은 ${touched} 이후로 그대로다`,
      hint: `${path} 의 "## 최근 진행" 을 읽고 글에 올릴 것이 있는지 봐라`,
    });
  } else if (src.updated === touched) {
    sameDay.push(`📎 ${slug} — 원본과 글이 같은 날(${touched}) 움직였다. 날짜로는 순서를 못 가린다`);
  }
}

// ── 2. 진행중·관찰중인데 사이트에 없는 것 ─────────────────────────────────
const featured = new Set(Object.values(pairs));
for (const [path, p] of byPath) {
  if (p.status !== "진행중" && p.status !== "관찰중") continue;
  if (featured.has(path)) continue;
  if (path in (MAP.notFeatured ?? {})) {
    notes.push(`📌 ${path} — 안 실음: ${MAP.notFeatured[path]}`);
    continue;
  }
  findings.push({
    kind: "누락",
    what: path,
    why: `SECRETARY 는 "${p.status}" 로 아는데 사이트에 항목이 없다`,
    hint: "싣든지, status-map.json 의 notFeatured 에 이유를 적든지 하나를 골라라",
  });
}

// ── 3. 링크 (--links) ─────────────────────────────────────────────────────
if (wantLinks) {
  // 인증 없는 GitHub API 는 시간당 60건이다. 한도에 걸려 오는 403 은 "저장소가
  // 없다" 가 아니라 "지금 못 세겠다" 는 뜻인데, 둘을 같이 보고하면 멀쩡한 링크를
  // 죽었다고 말하게 된다 — 이 도구가 고치려는 실수를 이 도구가 저지르는 셈이다.
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN ?? "";
  const urls = new Map();
  for (const slug of Object.keys(pairs)) {
    const doc = JSON.parse(readFileSync(resolve(REPO, `content/projects/${slug}.json`), "utf8"));
    for (const u of [doc.github, doc.demo]) if (u) urls.set(u, slug);
  }
  const results = [];
  for (const [url, slug] of urls) {
    const gh = url.match(/^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/?$/);
    try {
      const r = gh
        ? await fetch(`https://api.github.com/repos/${gh[1]}`, {
            headers: {
              accept: "application/vnd.github+json",
              ...(token ? { authorization: `Bearer ${token}` } : {}),
            },
          })
        : await fetch(url, { redirect: "follow" });
      const limited =
        gh && (r.status === 403 || r.status === 429) &&
        r.headers.get("x-ratelimit-remaining") === "0";
      results.push({ url, slug, status: r.status, limited });
    } catch (e) {
      // 연결 자체가 안 된 것과 서버가 404 를 준 것은 다르다. 앞은 이쪽 사정이고
      // 뒤는 저쪽 사정이다. 섞으면 오프라인일 때 멀쩡한 링크를 전부 죽었다고
      // 말하게 된다 — 한도 403 을 죽은 링크로 세던 것과 같은 실수다.
      results.push({ url, slug, unreachable: e.cause?.code ?? e.message });
    }
  }
  const ok = results.filter((r) => r.status >= 200 && r.status < 300);
  const limited = results.filter((r) => r.limited);
  const unreachable = results.filter((r) => r.unreachable);
  for (const r of results) {
    if (r.limited || r.unreachable || (r.status >= 200 && r.status < 300)) continue;
    findings.push({ kind: "링크", what: `${r.slug} — ${r.url}`, why: `HTTP ${r.status}` });
  }
  notes.push(`🔗 링크 ${results.length}개 중 ${ok.length}개 정상`);
  if (limited.length) {
    notes.push(
      `⏳ ${limited.length}개는 GitHub API 한도에 걸려 못 쟀다 (죽은 링크가 아니다). ` +
        "`GITHUB_TOKEN=$(gh auth token)` 를 앞에 붙이면 5000건이 된다",
    );
  }
  if (unreachable.length === results.length) {
    notes.push("⚠️  링크를 하나도 못 열었다 — 링크가 아니라 네트워크를 의심해라 (샌드박스·오프라인·프록시)");
  } else if (unreachable.length) {
    notes.push(
      `⚠️  ${unreachable.length}개는 연결 자체가 안 됐다 (404 와 다르다) — ` +
        unreachable.map((r) => `${r.slug}(${r.unreachable})`).join(" · "),
    );
  }
}

// ── 보고 ──────────────────────────────────────────────────────────────────
if (notes.length) console.log(notes.map((n) => "  " + n).join("\n") + "\n");
if (sameDay.length) console.log(sameDay.map((n) => "  " + n).join("\n") + "\n");

if (!findings.length) {
  console.log(`✅ ${compared}개 대조 완료, 걸리는 것 없음.`);
  process.exit(0);
}

console.log("걸린 것:");
for (const f of findings) {
  console.log(`  ✗ [${f.kind}] ${f.what}`);
  console.log(`      ${f.why}`);
  if (f.hint) console.log(`      → ${f.hint}`);
}
console.log(
  `\n${findings.length}건. 무엇이 틀렸는지는 이 도구가 모른다 — ` +
    "_STATUS.md 를 읽고 사람이 판단해라.",
);
if (check) process.exit(1);
