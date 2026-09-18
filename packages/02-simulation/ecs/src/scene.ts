import { Transform, Mat4 } from "@engine/math";
import type { Entity } from "./registry.ts";

/**
 * A scene-graph node: a local TRS transform plus a parent/child hierarchy. The
 * world matrix is the product of local matrices from the root down. Optionally
 * links to an ECS `Entity` so systems can find the node's components.
 *
 * ponytail: `worldMatrix()` recomputes by walking to the root each call — O(depth),
 * fine for shallow scenes. Add a dirty-flag cache when deep hierarchies or many
 * per-frame reads show up in a profile.
 */
export class SceneNode {
  local: Transform;
  parent: SceneNode | null = null;
  readonly children: SceneNode[] = [];
  entity?: Entity;

  constructor(local: Transform = Transform.identity, entity?: Entity) {
    this.local = local;
    this.entity = entity;
  }

  /** Attach `child` under this node (detaching it from any previous parent). */
  add(child: SceneNode): SceneNode {
    child.parent?.remove(child);
    child.parent = this;
    this.children.push(child);
    return child;
  }

  remove(child: SceneNode): void {
    const i = this.children.indexOf(child);
    if (i >= 0) {
      this.children.splice(i, 1);
      child.parent = null;
    }
  }

  localMatrix(): Mat4 {
    return this.local.toMatrix();
  }

  /** Local-to-world matrix: parentWorld · local, or local at the root. */
  worldMatrix(): Mat4 {
    return this.parent ? this.parent.worldMatrix().multiply(this.localMatrix()) : this.localMatrix();
  }

  /** Depth-first iterator over every descendant (excludes this node). */
  *descendants(): IterableIterator<SceneNode> {
    for (const child of this.children) {
      yield child;
      yield* child.descendants();
    }
  }
}
