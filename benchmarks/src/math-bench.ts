import { Vec3, Mat4, Quaternion } from "@engine/math";
import { bench, report } from "./bench.ts";

const a = new Vec3(1, 2, 3);
const b = new Vec3(4, 5, 6);
const m = Mat4.perspective(1, 1.5, 0.1, 100).multiply(Mat4.translation(a));
const q = Quaternion.fromAxisAngle(new Vec3(0, 1, 0), 0.7);

console.log("math");
report([
  bench("Vec3.add", () => void a.add(b)),
  bench("Vec3.cross", () => void a.cross(b)),
  bench("Vec3.normalize", () => void a.normalize()),
  bench("Mat4.multiply", () => void m.multiply(m)),
  bench("Mat4.inverse", () => void m.inverse()),
  bench("Quaternion.slerp", () => void Quaternion.identity.slerp(q, 0.3)),
]);
