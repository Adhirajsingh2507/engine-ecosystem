import { Vec3, Mat4, Transform, Aabb, Sphere } from "@engine/math";
import {
  RigidBody, World, SpatialHash,
  sphereSphereContact, sphereAabbContact, resolveContact,
} from "@engine/physics";
import { uvSphere } from "./sphere.ts";
import { Renderer, type Instance, type DirLight } from "./renderer.ts";

// ---------------------------------------------------------------- setup
const canvas = document.getElementById("c") as HTMLCanvasElement;
const gl = canvas.getContext("webgl2", { antialias: true });
if (!gl) {
  const err = document.getElementById("err")!;
  err.style.display = "grid";
  err.textContent = "WebGL2 is not available in this browser.";
  throw new Error("webgl2 unavailable");
}
const renderer = new Renderer(gl);

// ---------------------------------------------------------------- geometry
const mesh = uvSphere(32, 24);
const sphereVao = gl.createVertexArray()!;
gl.bindVertexArray(sphereVao);
for (const [loc, data] of [[0, mesh.positions], [1, mesh.normals]] as const) {
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0);
}
const sphereIb = gl.createBuffer()!;
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sphereIb);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
gl.bindVertexArray(null);
const sphere = { vao: sphereVao, count: mesh.indices.length };

const FLOOR_HALF = 80;
const floorVao = gl.createVertexArray()!;
gl.bindVertexArray(floorVao);
const floorBuf = gl.createBuffer()!;
gl.bindBuffer(gl.ARRAY_BUFFER, floorBuf);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -FLOOR_HALF, 0, -FLOOR_HALF, FLOOR_HALF, 0, -FLOOR_HALF, FLOOR_HALF, 0, FLOOR_HALF,
  -FLOOR_HALF, 0, -FLOOR_HALF, FLOOR_HALF, 0, FLOOR_HALF, -FLOOR_HALF, 0, FLOOR_HALF,
]), gl.STATIC_DRAW);
gl.enableVertexAttribArray(0);
gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
gl.bindVertexArray(null);

// ---------------------------------------------------------------- physics
const GRAVITY = new Vec3(0, -22, 0);
const FLOOR = new Aabb(new Vec3(-FLOOR_HALF, -1, -FLOOR_HALF), new Vec3(FLOOR_HALF, 0, FLOOR_HALF));
const FLOOR_BODY = new RigidBody({ mass: 0 }); // static; reused for all static contacts
const hash = new SpatialHash(3);
const DAMPING = 0.992; // per-step drag so frictionless sliding settles in view

// invisible pen so the sandbox keeps its contents on-screen
const PEN = 12, WALL_H = 12;
const WALLS = [
  new Aabb(new Vec3(-PEN - 2, 0, -PEN - 2), new Vec3(-PEN, WALL_H, PEN + 2)),
  new Aabb(new Vec3(PEN, 0, -PEN - 2), new Vec3(PEN + 2, WALL_H, PEN + 2)),
  new Aabb(new Vec3(-PEN - 2, 0, -PEN - 2), new Vec3(PEN + 2, WALL_H, -PEN)),
  new Aabb(new Vec3(-PEN - 2, 0, PEN), new Vec3(PEN + 2, WALL_H, PEN + 2)),
];

const DIELECTRIC = [
  new Vec3(0.30, 0.45, 0.95), new Vec3(0.95, 0.55, 0.28), new Vec3(0.35, 0.8, 0.62),
  new Vec3(0.85, 0.32, 0.5), new Vec3(0.6, 0.5, 0.95), new Vec3(0.55, 0.85, 0.5),
];
const METAL = [new Vec3(0.95, 0.96, 0.98), new Vec3(1.0, 0.78, 0.34), new Vec3(0.96, 0.64, 0.54)];
const pick = <T>(a: T[]): T => a[(Math.random() * a.length) | 0];

interface Ball { body: RigidBody; radius: number; albedo: Vec3; roughness: number; metalness: number; }
let balls: Ball[] = [];
let world = new World(GRAVITY);
const MAX = 90;

function spawn(y = 14): void {
  if (balls.length >= MAX) {
    const old = balls.shift()!;
    world.bodies.splice(world.bodies.indexOf(old.body), 1);
  }
  const radius = 0.5 + Math.random() * 0.6;
  const body = new RigidBody({
    mass: radius * radius * radius,
    position: new Vec3((Math.random() - 0.5) * 12, y, (Math.random() - 0.5) * 12),
    velocity: new Vec3((Math.random() - 0.5) * 3, 0, (Math.random() - 0.5) * 3),
  });
  world.add(body);
  const metal = Math.random() < 0.35;
  balls.push({
    body, radius,
    albedo: metal ? pick(METAL) : pick(DIELECTRIC),
    roughness: metal ? 0.05 + Math.random() * 0.25 : 0.35 + Math.random() * 0.5,
    metalness: metal ? 1 : 0,
  });
}

function reset(): void {
  balls = [];
  world = new World(GRAVITY);
  for (let i = 0; i < 18; i++) spawn(3 + Math.random() * 12);
}
reset();

let lastPairs = 0;
function simulate(dt: number): void {
  world.step(dt);
  const aabbs = balls.map((b) => Aabb.fromCenter(b.body.position, new Vec3(b.radius, b.radius, b.radius)));
  for (let iter = 0; iter < 2; iter++) {
    for (const b of balls) {
      const s = new Sphere(b.body.position, b.radius);
      const fc = sphereAabbContact(s, FLOOR);
      if (fc) resolveContact(b.body, FLOOR_BODY, fc, 0.4);
      for (const wall of WALLS) {
        const wc = sphereAabbContact(new Sphere(b.body.position, b.radius), wall);
        if (wc) resolveContact(b.body, FLOOR_BODY, wc, 0.3);
      }
    }
    const pairs = hash.pairs(aabbs);
    if (iter === 0) lastPairs = pairs.length;
    for (const [i, j] of pairs) {
      const a = balls[i], b = balls[j];
      const c = sphereSphereContact(new Sphere(a.body.position, a.radius), new Sphere(b.body.position, b.radius));
      if (c) resolveContact(a.body, b.body, c, 0.5);
    }
  }
  for (const b of balls) b.body.velocity = b.body.velocity.scale(DAMPING);
}

// ---------------------------------------------------------------- light (with shadow matrix)
const LIGHT_DIR = new Vec3(0.5, 1.15, 0.42).normalize();
const lightView = Mat4.lookAt(LIGHT_DIR.scale(42), new Vec3(0, 1, 0), new Vec3(0, 1, 0));
const lightVP = Mat4.orthographic(-24, 24, -24, 24, 1, 90).multiply(lightView);
const light: DirLight = { dir: LIGHT_DIR, color: new Vec3(1.0, 0.95, 0.85).scale(3.6), viewProj: lightVP };

// ---------------------------------------------------------------- loop
function resize(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.floor(canvas.clientWidth * dpr);
  const h = Math.floor(canvas.clientHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  renderer.resize(w, h);
}

const hud = document.getElementById("hud")!;
let fps = 60;
let last = performance.now();
let acc = 0;
const STEP = 1 / 120;

function frame(now: number): void {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  fps += (1 / Math.max(dt, 1e-4) - fps) * 0.1;
  acc += dt;
  while (acc >= STEP) { simulate(STEP); acc -= STEP; }

  resize();
  const aspect = canvas.width / Math.max(canvas.height, 1);
  const angle = (now / 1000) * 0.13;
  const camPos = new Vec3(Math.cos(angle) * 27, 17, Math.sin(angle) * 27);
  const viewProj = Mat4.perspective(Math.PI / 4.2, aspect, 0.1, 240)
    .multiply(Mat4.lookAt(camPos, new Vec3(0, 2.5, 0), new Vec3(0, 1, 0)));

  const instances: Instance[] = balls.map((b) => ({
    model: new Transform(b.body.position, b.body.orientation, new Vec3(b.radius, b.radius, b.radius)).toMatrix(),
    albedo: b.albedo,
    roughness: b.roughness,
    metalness: b.metalness,
  }));

  renderer.render({ sphere, floorVao, instances, camPos, viewProj, light });

  hud.innerHTML =
    `<span class="n">${fps.toFixed(0)}</span> fps · ` +
    `<span class="n">${balls.length}</span> bodies · ` +
    `<span class="n">${lastPairs}</span> broadphase pairs`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

canvas.addEventListener("click", () => spawn());
window.addEventListener("keydown", (e) => { if (e.key === "r" || e.key === "R") reset(); });
