import { Vec3 } from "@engine/math";
import { writeFileSync } from "node:fs";
import { Camera, radiance, mulberry32, acesTonemap } from "./tracer.ts";
import { encodePng } from "./png.ts";
import { SCENE, CAMERA } from "./scene.ts";

// CLI: render.ts [width] [height] [spp] [depth] [out.png]
const a = process.argv.slice(2);
const width = Number(a[0] ?? 640);
const height = Number(a[1] ?? 360);
const spp = Number(a[2] ?? 64);
const depth = Number(a[3] ?? 6);
const out = a[4] ?? "render.png";

const scene = SCENE;
const cam = new Camera(
  CAMERA.eye, CAMERA.target, CAMERA.up, CAMERA.vfov, width / height, CAMERA.aperture,
);

const rgb = new Uint8Array(width * height * 3);
let lumaSum = 0;
const start = Date.now();

for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const rng = mulberry32((x * 1973 + y * 9277 + 26699) | 0);
    let col = new Vec3(0, 0, 0);
    for (let s = 0; s < spp; s++) {
      const u = (x + rng()) / width;
      const t = 1 - (y + rng()) / height; // row 0 = top of image
      col = col.add(radiance(scene, cam.ray(u, t, rng), depth, rng));
    }
    col = col.scale(1 / spp);
    const i = (y * width + x) * 3;
    const r = Math.pow(acesTonemap(col.x), 1 / 2.2);
    const g = Math.pow(acesTonemap(col.y), 1 / 2.2);
    const b = Math.pow(acesTonemap(col.z), 1 / 2.2);
    rgb[i] = Math.round(255 * r);
    rgb[i + 1] = Math.round(255 * g);
    rgb[i + 2] = Math.round(255 * b);
    lumaSum += 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  if (y % 20 === 0 || y === height - 1) {
    process.stderr.write(`\rrendering ${Math.round((100 * (y + 1)) / height)}%  `);
  }
}

writeFileSync(out, encodePng(width, height, rgb));
const secs = ((Date.now() - start) / 1000).toFixed(1);
process.stderr.write(
  `\ndone: ${width}x${height} @ ${spp}spp depth ${depth} in ${secs}s → ${out}` +
  `  (avg luma ${(lumaSum / (width * height)).toFixed(3)})\n`,
);
