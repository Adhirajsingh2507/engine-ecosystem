import { RigidBody } from "./rigidbody.ts";
import type { Contact } from "./narrowphase.ts";

const CORRECTION_PERCENT = 0.8; // fraction of penetration fixed per resolve
const SLOP = 0.01; // penetration left unfixed, to avoid jitter at rest

/**
 * Resolve a contact between a and b with a linear impulse (with restitution),
 * Coulomb friction along the tangent, plus positional correction.
 * `contact.normal` must point from a → b.
 *
 * restitution 0 = perfectly inelastic, 1 = perfectly elastic (energy-preserving).
 * friction 0 = frictionless; ~0.5 is a typical solid-on-solid coefficient.
 *
 * ponytail: friction is **linear-only** — no torque from off-centre hits (that
 * needs the contact point applied through the world inertia tensor). The contact
 * carries `point`; add angular contact response as the next rung.
 */
export function resolveContact(
  a: RigidBody,
  b: RigidBody,
  contact: Contact,
  restitution = 0,
  friction = 0,
): void {
  const invMassSum = a.inverseMass + b.inverseMass;
  if (invMassSum === 0) return; // two static bodies — nothing to move

  const n = contact.normal;
  const relVelAlongN = b.velocity.sub(a.velocity).dot(n);

  // impulse only if the bodies are approaching along the normal
  if (relVelAlongN < 0) {
    const jn = (-(1 + restitution) * relVelAlongN) / invMassSum;
    const impulse = n.scale(jn);
    a.velocity = a.velocity.sub(impulse.scale(a.inverseMass));
    b.velocity = b.velocity.add(impulse.scale(b.inverseMass));

    // Coulomb friction: tangential impulse clamped to μ·jn (pyramid, not cone)
    if (friction > 0) {
      const relVel = b.velocity.sub(a.velocity);
      const tangent = relVel.sub(n.scale(relVel.dot(n)));
      const tLen = tangent.length();
      if (tLen > 1e-9) {
        const t = tangent.scale(1 / tLen);
        let jt = -relVel.dot(t) / invMassSum;
        const maxF = friction * jn;
        jt = jt < -maxF ? -maxF : jt > maxF ? maxF : jt;
        const fImpulse = t.scale(jt);
        a.velocity = a.velocity.sub(fImpulse.scale(a.inverseMass));
        b.velocity = b.velocity.add(fImpulse.scale(b.inverseMass));
      }
    }
  }

  // positional correction: shove the bodies apart along the normal
  const corr = (Math.max(contact.depth - SLOP, 0) / invMassSum) * CORRECTION_PERCENT;
  if (corr > 0) {
    const correction = n.scale(corr);
    a.position = a.position.sub(correction.scale(a.inverseMass));
    b.position = b.position.add(correction.scale(b.inverseMass));
  }
}
