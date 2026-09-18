/**
 * Compact binary (de)serialization for network packets. `ByteWriter` grows its
 * buffer as needed; `ByteReader` walks a byte view. Little-endian throughout.
 * Varints use unsigned LEB128 — cheap for the small integers that dominate game
 * traffic (ids, sequence numbers, counts).
 */
export class ByteWriter {
  private buf: ArrayBuffer;
  private view: DataView;
  private off = 0;

  constructor(initialBytes = 64) {
    this.buf = new ArrayBuffer(initialBytes);
    this.view = new DataView(this.buf);
  }

  private ensure(n: number): void {
    if (this.off + n <= this.buf.byteLength) return;
    let size = this.buf.byteLength * 2;
    while (size < this.off + n) size *= 2;
    const next = new ArrayBuffer(size);
    new Uint8Array(next).set(new Uint8Array(this.buf, 0, this.off));
    this.buf = next;
    this.view = new DataView(next);
  }

  u8(v: number): this { this.ensure(1); this.view.setUint8(this.off, v); this.off += 1; return this; }
  u16(v: number): this { this.ensure(2); this.view.setUint16(this.off, v, true); this.off += 2; return this; }
  u32(v: number): this { this.ensure(4); this.view.setUint32(this.off, v, true); this.off += 4; return this; }
  i32(v: number): this { this.ensure(4); this.view.setInt32(this.off, v, true); this.off += 4; return this; }
  f32(v: number): this { this.ensure(4); this.view.setFloat32(this.off, v, true); this.off += 4; return this; }
  f64(v: number): this { this.ensure(8); this.view.setFloat64(this.off, v, true); this.off += 8; return this; }

  /** Unsigned LEB128 varint. */
  varint(v: number): this {
    if (v < 0 || !Number.isInteger(v)) throw new RangeError("varint needs a non-negative integer");
    let n = v;
    do {
      let byte = n & 0x7f;
      n = Math.floor(n / 128);
      if (n > 0) byte |= 0x80;
      this.u8(byte);
    } while (n > 0);
    return this;
  }

  /** Length-prefixed UTF-8 string. */
  string(s: string): this {
    const bytes = new TextEncoder().encode(s);
    this.varint(bytes.length);
    this.ensure(bytes.length);
    new Uint8Array(this.buf).set(bytes, this.off);
    this.off += bytes.length;
    return this;
  }

  /** Three float32s (accepts any {x,y,z}, no math dependency). */
  vec3(v: { x: number; y: number; z: number }): this {
    return this.f32(v.x).f32(v.y).f32(v.z);
  }

  /** The written bytes (a copy of the used region). */
  bytes(): Uint8Array {
    return new Uint8Array(this.buf.slice(0, this.off));
  }

  get length(): number {
    return this.off;
  }
}

export class ByteReader {
  private view: DataView;
  private off = 0;
  private readonly bytes: Uint8Array;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
    this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  }

  u8(): number { const v = this.view.getUint8(this.off); this.off += 1; return v; }
  u16(): number { const v = this.view.getUint16(this.off, true); this.off += 2; return v; }
  u32(): number { const v = this.view.getUint32(this.off, true); this.off += 4; return v; }
  i32(): number { const v = this.view.getInt32(this.off, true); this.off += 4; return v; }
  f32(): number { const v = this.view.getFloat32(this.off, true); this.off += 4; return v; }
  f64(): number { const v = this.view.getFloat64(this.off, true); this.off += 8; return v; }

  varint(): number {
    let result = 0;
    let shift = 1;
    for (;;) {
      const byte = this.u8();
      result += (byte & 0x7f) * shift;
      if ((byte & 0x80) === 0) break;
      shift *= 128;
    }
    return result;
  }

  string(): string {
    const len = this.varint();
    const slice = this.bytes.subarray(this.off, this.off + len);
    this.off += len;
    return new TextDecoder().decode(slice);
  }

  vec3(): { x: number; y: number; z: number } {
    return { x: this.f32(), y: this.f32(), z: this.f32() };
  }

  get remaining(): number {
    return this.bytes.byteLength - this.off;
  }
}
