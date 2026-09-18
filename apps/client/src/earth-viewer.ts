import { createEarthRenderer, type EarthFrame } from "./earth/renderer.ts";

/**
 * Drives the GPU-raytraced Earth: loads the NASA GLB, then runs an animation loop
 * with drag-to-rotate and scroll-to-zoom. The camera is equatorial (yaw + zoom),
 * matching the shader's ray generator. Load at /?mode=earth.
 */
const canvas = document.getElementById("c") as HTMLCanvasElement;
const hud = document.getElementById("hud");
const hint = document.getElementById("hint");
const err = document.getElementById("err")!;
if (hint) hint.textContent = "drag — rotate · scroll — zoom";

const controller = new AbortController();
const frame: EarthFrame = { distance: 2.6, centerX: 0.5, centerY: 0.5, rotation: 0 };
const MIN_DIST = 1.4;
const MAX_DIST = 6;
let autorotate = true;

createEarthRenderer(canvas, controller.signal)
  .then((earth) => {
    if (hud) {
      hud.innerHTML =
        `<span class="n">Earth</span> · ${earth.triangleCount.toLocaleString()} triangles` +
        (earth.softwareRenderer ? " · software renderer (reduced quality)" : "");
    }
    const quality = earth.initialQuality;

    let dragging = false;
    let lastX = 0;
    canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      autorotate = false;
      lastX = e.clientX;
      canvas.setPointerCapture(e.pointerId);
    });
    const endDrag = (e: PointerEvent) => {
      dragging = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch { /* not captured */ }
    };
    canvas.addEventListener("pointerup", endDrag);
    canvas.addEventListener("pointercancel", endDrag);
    canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      frame.rotation += (e.clientX - lastX) * 0.006;
      lastX = e.clientX;
    });
    canvas.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        frame.distance = Math.min(MAX_DIST, Math.max(MIN_DIST, frame.distance + e.deltaY * 0.002));
      },
      { passive: false },
    );

    const loop = () => {
      if (autorotate) frame.rotation += 0.0015;
      earth.draw(frame, window.innerWidth, window.innerHeight, quality);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  })
  .catch((e) => {
    err.style.display = "grid";
    err.textContent = e instanceof Error ? e.message : "Failed to load the Earth viewer.";
  });
