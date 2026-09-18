import { deflateSync, crc32 } from "node:zlib";

/** Minimal 8-bit RGB PNG encoder — no dependencies, just Node's zlib. */
export function encodePng(width: number, height: number, rgb: Uint8Array): Buffer {
  const chunk = (type: string, data: Buffer): Buffer => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body) >>> 0, 0);
    return Buffer.concat([len, body, crc]);
  };

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor RGB
  // 10..12 = compression / filter / interlace = 0

  // raw scanlines, each prefixed with filter byte 0 (none)
  const rowBytes = width * 3;
  const raw = Buffer.alloc(height * (rowBytes + 1));
  for (let y = 0; y < height; y++) {
    const dst = y * (rowBytes + 1);
    raw[dst] = 0;
    Buffer.from(rgb.buffer, rgb.byteOffset + y * rowBytes, rowBytes).copy(raw, dst + 1);
  }

  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
