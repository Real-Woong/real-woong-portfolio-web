/**
 * The portfolio itself is served directly at `/` by the Worker
 * (see `worker/index.ts`) so that deep links, browser history and crawlers
 * operate on the real document instead of an iframe.
 *
 * This route only renders if that asset lookup fails, so it stays a plain
 * fallback rather than a second copy of the portfolio.
 */
export default function Home() {
  return (
    <main className="portfolio-shell">
      <div className="fallback">
        <h1>Kim JinWoong — Builder Portfolio</h1>
        <p>포트폴리오를 불러오지 못했습니다.</p>
        <p>
          <a href="https://github.com/Real-Woong">github.com/Real-Woong</a>
          {" · "}
          <a href="mailto:jinung344@gmail.com">jinung344@gmail.com</a>
        </p>
      </div>
    </main>
  );
}
