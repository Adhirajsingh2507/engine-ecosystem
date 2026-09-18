/** Cinematic frontend for the DevX path-traced Garuda render. */

const canvas = document.getElementById("c") as HTMLCanvasElement;
canvas.style.display = "none";
for (const id of ["hud", "hint", "err"]) {
  const element = document.getElementById(id);
  if (element) element.style.display = "none";
}

const viewer = document.createElement("main");
viewer.id = "garuda-viewer";
viewer.innerHTML = `
  <div class="atmosphere" aria-hidden="true">
    <span class="aura aura-one"></span>
    <span class="aura aura-two"></span>
    <span class="stars"></span>
  </div>

  <header class="viewer-nav">
    <a class="brand" href="?mode=viewer" aria-label="DevX Garuda viewer home">
      <span class="brand-mark" aria-hidden="true">ॐ</span>
      <span><strong>DEVX</strong><small>SACRED RENDER LAB</small></span>
    </a>
    <nav aria-label="Experience modes">
      <a class="nav-link active" href="?mode=viewer" aria-current="page">Garuda</a>
      <a class="nav-link" href="/">Physics engine</a>
    </nav>
  </header>

  <section class="hero" aria-labelledby="garuda-title">
    <div class="copy">
      <p class="eyebrow"><span></span> DevX Ray Tracing Study 01</p>
      <h1 id="garuda-title"><span>श्री</span> गरुड़</h1>
      <p class="roman-title">Garuda · Vahana of Vishnu</p>
      <p class="intro">A procedural devotional sculpture shaped from triangles, traced through the same mathematics that powers the DevX engine.</p>
      <dl class="render-facts">
        <div><dt>Material</dt><dd>White stone · gold</dd></div>
        <div><dt>Pose</dt><dd>Celestial flight</dd></div>
        <div><dt>Engine</dt><dd>Monte Carlo path tracer</dd></div>
      </dl>
    </div>

    <figure class="render-stage" aria-describedby="render-caption">
      <div class="image-shell">
        <div class="loader" id="garuda-loader" role="status" aria-live="polite">
          <span></span> Tracing divine light…
        </div>
        <img id="garuda-img" src="/garuda.png" alt="White and gold Garuda flying with Vishnu, wings spread in a luminous celestial scene" />
        <div class="image-vignette" aria-hidden="true"></div>
      </div>
      <figcaption id="render-caption">Procedural mesh · BVH accelerated · ACES tone mapped</figcaption>
    </figure>

    <aside class="viewer-actions" aria-label="Viewer actions">
      <button id="fullscreen-button" type="button"><span aria-hidden="true">⛶</span> Fullscreen</button>
      <a href="/garuda.png" download="devx-garuda.png"><span aria-hidden="true">↓</span> Save render</a>
    </aside>
  </section>

  <p class="edition">01 <span></span> CELESTIAL SERIES</p>
`;
document.body.appendChild(viewer);

const style = document.createElement("style");
style.textContent = `
  :root {
    color-scheme: dark;
    --ink: #f8f2e5;
    --muted: #b8ad9b;
    --gold: #e7b85d;
    --gold-bright: #ffd98a;
    --night: #08090c;
    --line: rgba(231, 184, 93, 0.22);
  }

  * { box-sizing: border-box; }
  body { background: var(--night); color: var(--ink); }
  button, a { font: inherit; }

  #garuda-viewer {
    min-height: 100svh;
    position: relative;
    overflow: hidden;
    isolation: isolate;
    background:
      radial-gradient(circle at 70% 42%, rgba(105, 79, 35, 0.16), transparent 29%),
      linear-gradient(128deg, #08090c 0%, #0b0c10 52%, #101015 100%);
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .atmosphere, .stars { position: absolute; inset: 0; pointer-events: none; }
  .atmosphere { z-index: -1; overflow: hidden; }
  .stars {
    opacity: 0.27;
    background-image:
      radial-gradient(circle, rgba(255,255,255,.72) 0 1px, transparent 1.4px),
      radial-gradient(circle, rgba(231,184,93,.68) 0 1px, transparent 1.5px);
    background-position: 0 0, 51px 68px;
    background-size: 113px 113px, 167px 167px;
    mask-image: linear-gradient(to bottom, black, transparent 88%);
  }
  .aura { position: absolute; border-radius: 50%; filter: blur(2px); }
  .aura-one {
    width: min(63vw, 820px); aspect-ratio: 1; right: 6vw; top: 4vh;
    border: 1px solid rgba(231,184,93,.13);
    box-shadow: inset 0 0 120px rgba(231,184,93,.045), 0 0 120px rgba(231,184,93,.03);
  }
  .aura-two {
    width: min(49vw, 640px); aspect-ratio: 1; right: 13vw; top: 13vh;
    border: 1px solid rgba(255,217,138,.08);
  }

  .viewer-nav {
    height: 82px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 clamp(24px, 5vw, 76px);
    border-bottom: 1px solid rgba(255,255,255,.07);
    position: relative;
    z-index: 3;
  }
  .brand { display: flex; align-items: center; gap: 12px; color: inherit; text-decoration: none; }
  .brand-mark {
    width: 38px; height: 38px; display: grid; place-items: center;
    border: 1px solid var(--line); border-radius: 50%; color: var(--gold-bright); font-size: 17px;
  }
  .brand strong { display: block; font: 650 13px/1 ui-monospace, monospace; letter-spacing: .22em; }
  .brand small { display: block; margin-top: 5px; color: var(--muted); font: 500 8px/1 ui-monospace, monospace; letter-spacing: .18em; }
  nav { display: flex; gap: 8px; }
  .nav-link {
    color: var(--muted); text-decoration: none; padding: 10px 13px; border-radius: 999px;
    font-size: 12px; transition: color .2s ease, background .2s ease;
  }
  .nav-link:hover, .nav-link:focus-visible { color: var(--ink); background: rgba(255,255,255,.06); }
  .nav-link.active { color: var(--gold-bright); }

  .hero {
    min-height: calc(100svh - 82px);
    display: grid;
    grid-template-columns: minmax(260px, .72fr) minmax(420px, 1.55fr) auto;
    align-items: center;
    gap: clamp(24px, 4vw, 70px);
    padding: 46px clamp(24px, 5vw, 76px) 66px;
  }
  .copy { max-width: 430px; position: relative; z-index: 2; }
  .eyebrow { color: var(--gold); font: 600 10px/1.4 ui-monospace, monospace; letter-spacing: .20em; text-transform: uppercase; }
  .eyebrow span { display: inline-block; width: 28px; height: 1px; margin: 0 9px 3px 0; background: var(--gold); }
  h1 { margin: 26px 0 2px; font-family: Georgia, "Noto Serif Devanagari", serif; font-size: clamp(58px, 7.4vw, 120px); line-height: .86; font-weight: 500; letter-spacing: -.055em; }
  h1 span { display: block; margin: 0 0 8px 6px; color: var(--gold); font: 500 clamp(20px, 2.2vw, 34px)/1.1 Georgia, serif; letter-spacing: .05em; }
  .roman-title { margin: 19px 0 0; color: var(--gold-bright); font: 500 12px/1.4 ui-monospace, monospace; letter-spacing: .13em; text-transform: uppercase; }
  .intro { max-width: 38ch; margin: 23px 0 31px; color: var(--muted); font: 400 14px/1.75 Georgia, serif; }
  .render-facts { margin: 0; border-top: 1px solid var(--line); }
  .render-facts div { display: flex; justify-content: space-between; gap: 18px; padding: 11px 0; border-bottom: 1px solid rgba(255,255,255,.065); }
  .render-facts dt { color: #716a60; font: 600 9px/1.4 ui-monospace, monospace; letter-spacing: .12em; text-transform: uppercase; }
  .render-facts dd { margin: 0; color: #d5c9b7; font: 500 10px/1.4 ui-monospace, monospace; text-align: right; }

  .render-stage { min-width: 0; margin: 0; position: relative; z-index: 1; }
  .image-shell {
    position: relative; aspect-ratio: 16/9; overflow: hidden; border: 1px solid rgba(231,184,93,.18);
    background: #0d0f14; box-shadow: 0 35px 90px rgba(0,0,0,.55), 0 0 90px rgba(186,126,37,.07);
  }
  #garuda-img {
    width: 100%; height: 100%; display: block; object-fit: cover; opacity: 0;
    transform: scale(1.025); transition: opacity 1.1s ease, transform 1.8s cubic-bezier(.22,1,.36,1);
  }
  #garuda-viewer.loaded #garuda-img { opacity: 1; transform: scale(1); }
  .image-vignette { position: absolute; inset: 0; box-shadow: inset 0 0 90px rgba(0,0,0,.42); pointer-events: none; }
  .loader { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 14px; color: var(--muted); font: 500 10px/1 ui-monospace, monospace; letter-spacing: .14em; text-transform: uppercase; }
  .loader span { width: 42px; height: 42px; border: 1px solid rgba(231,184,93,.18); border-top-color: var(--gold); border-radius: 50%; animation: spin 1.2s linear infinite; }
  #garuda-viewer.loaded .loader { display: none; }
  #garuda-viewer.failed .loader { color: #e0a09a; }
  #garuda-viewer.failed .loader span { display: none; }
  figcaption { margin-top: 12px; color: #6f685f; font: 500 9px/1.4 ui-monospace, monospace; letter-spacing: .10em; text-transform: uppercase; text-align: right; }

  .viewer-actions { display: flex; flex-direction: column; gap: 9px; position: relative; z-index: 2; }
  .viewer-actions button, .viewer-actions a {
    min-width: 136px; min-height: 42px; display: flex; align-items: center; gap: 9px; justify-content: flex-start;
    padding: 0 15px; border: 1px solid rgba(255,255,255,.10); border-radius: 3px; background: rgba(255,255,255,.035);
    color: #cbc1b1; text-decoration: none; cursor: pointer; font: 500 10px/1 ui-monospace, monospace; letter-spacing: .07em;
    transition: border-color .2s ease, color .2s ease, background .2s ease;
  }
  .viewer-actions button:hover, .viewer-actions button:focus-visible,
  .viewer-actions a:hover, .viewer-actions a:focus-visible { border-color: var(--gold); color: var(--gold-bright); background: rgba(231,184,93,.07); outline: none; }
  .viewer-actions span { color: var(--gold); font-size: 16px; }
  .edition { position: absolute; left: clamp(24px, 5vw, 76px); bottom: 22px; margin: 0; color: #5e584f; font: 600 9px/1 ui-monospace, monospace; letter-spacing: .18em; }
  .edition span { display: inline-block; width: 35px; height: 1px; margin: 0 10px 3px; background: #514a40; }

  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 1050px) {
    .hero { grid-template-columns: minmax(240px, .75fr) minmax(380px, 1.4fr); }
    .viewer-actions { grid-column: 1 / -1; flex-direction: row; justify-content: flex-end; }
    .edition { display: none; }
  }
  @media (max-width: 740px) {
    .viewer-nav { height: 70px; padding-inline: 18px; }
    .brand small { display: none; }
    .nav-link { padding-inline: 9px; }
    .hero { display: flex; flex-direction: column; align-items: stretch; padding: 35px 18px 32px; }
    .copy { max-width: none; }
    h1 { font-size: clamp(62px, 24vw, 96px); }
    .intro { max-width: 52ch; }
    .render-stage { order: -1; }
    .viewer-actions { justify-content: stretch; }
    .viewer-actions > * { flex: 1; min-width: 0; justify-content: center; }
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
  }
`;
document.head.appendChild(style);

const image = document.getElementById("garuda-img") as HTMLImageElement;
image.addEventListener("load", () => viewer.classList.add("loaded"));
image.addEventListener("error", () => {
  viewer.classList.add("failed");
  const loader = document.getElementById("garuda-loader");
  if (loader) loader.textContent = "The ray-traced render could not be loaded.";
});
if (image.complete && image.naturalWidth > 0) viewer.classList.add("loaded");

document.getElementById("fullscreen-button")?.addEventListener("click", async () => {
  if (document.fullscreenElement) await document.exitFullscreen();
  else await viewer.requestFullscreen();
});
