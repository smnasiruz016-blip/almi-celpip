// RR-418 · TEST ONLY (copied from almi-prep-v2 RR-416 fix 1, proven): a minimal WebSocket → TCP proxy, so the owner's exact client
// (Prisma + @prisma/adapter-neon + the Neon serverless driver, as built by prisma443()) can run against a LOCAL Postgres. Neon's own
// endpoint does the same job on port 443 in production. Binary frames only (the Postgres wire protocol), ping → pong, close.
import { createServer, type Server } from "node:http";
import { connect } from "node:net";
import { createHash } from "node:crypto";
import type { Duplex } from "node:stream";

const GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

function frame(payload: Buffer, opcode = 0x2): Buffer {
  const n = payload.length;
  const head = n < 126 ? Buffer.from([0x80 | opcode, n]) : n < 65536 ? Buffer.from([0x80 | opcode, 126, n >> 8, n & 255]) : Buffer.concat([Buffer.from([0x80 | opcode, 127]), (() => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(n)); return b; })()]);
  return Buffer.concat([head, payload]);
}

export function startWsTcpProxy(pgPort: number): Promise<{ port: number; server: Server }> {
  const server = createServer((_req, res) => { res.writeHead(426); res.end(); });
  server.on("upgrade", (req, socket: Duplex) => {
    const key = String(req.headers["sec-websocket-key"] ?? "");
    const accept = createHash("sha1").update(key + GUID).digest("base64");
    socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
    const pg = connect(pgPort, "127.0.0.1");
    pg.on("data", (d) => socket.write(frame(d)));
    pg.on("close", () => socket.end());
    pg.on("error", () => socket.destroy());
    let buf = Buffer.alloc(0);
    socket.on("data", (d: Buffer) => {
      buf = Buffer.concat([buf, d]);
      for (;;) {
        if (buf.length < 2) return;
        const op = buf[0] & 0x0f, masked = (buf[1] & 0x80) !== 0;
        let len = buf[1] & 0x7f, off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        const mask = masked ? buf.subarray(off, off + 4) : null;
        if (masked) off += 4;
        if (buf.length < off + len) return;
        const payload = Buffer.from(buf.subarray(off, off + len));
        if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
        buf = buf.subarray(off + len);
        if (op === 0x8) { socket.end(frame(Buffer.alloc(0), 0x8)); pg.end(); return; }
        if (op === 0x9) { socket.write(frame(payload, 0xa)); continue; }
        if (op === 0x0 || op === 0x1 || op === 0x2) pg.write(payload);
      }
    });
    socket.on("close", () => pg.end());
    socket.on("error", () => pg.destroy());
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({ port: (server.address() as { port: number }).port, server })));
}
