/**
 * The QR as a picture to keep or send: MOSAIC's mark and name, who it is from, the code, how to
 * read it and until when. Drawn on the phone (nothing is sent anywhere).
 */
export interface QrCardText {
  from: string;
  lead: string;
  how: string;
  until: string;
}

const W = 1080;
const H = 1350;

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = src;
  });
}

/** Lines no wider than max (by characters, so Japanese without spaces wraps too). */
function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const ch of Array.from(para)) {
      if (ctx.measureText(line + ch).width > max && line) {
        // Keep a word whole when the language has spaces.
        const cut = line.lastIndexOf(" ");
        if (cut > 0 && ch !== " ") {
          lines.push(line.slice(0, cut));
          line = line.slice(cut + 1) + ch;
        } else {
          lines.push(line);
          line = ch === " " ? "" : ch;
        }
      } else line += ch;
    }
    lines.push(line);
  }
  return lines;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

export async function drawQrCard(qr: string, text: QrCardText): Promise<Blob> {
  const [code, mark, word] = await Promise.all([load(qr), load("/brand/mark.png"), load("/brand/wordmark.png")]);
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const font = getComputedStyle(document.body).fontFamily || "sans-serif";

  // Background: MOSAIC's soft dawn colours, with a few loose tiles.
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#fdf6ee");
  bg.addColorStop(0.55, "#f3eefb");
  bg.addColorStop(1, "#e9f6f4");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);
  const tiles: [number, number, number, string][] = [
    [70, 90, 70, "rgba(251,191,36,0.18)"],
    [960, 150, 90, "rgba(167,139,250,0.18)"],
    [90, 1180, 110, "rgba(45,212,191,0.16)"],
    [980, 1230, 70, "rgba(251,113,133,0.16)"],
  ];
  for (const [x, y, s, c] of tiles) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 9);
    ctx.fillStyle = c;
    roundRect(ctx, -s / 2, -s / 2, s, s, s * 0.28);
    ctx.fill();
    ctx.restore();
  }

  // Brand: the mark and the wordmark.
  const mh = 96;
  const mw = (mark.width / mark.height) * mh;
  const wh = 44;
  const ww = (word.width / word.height) * wh;
  const bx = (W - (mw + 24 + ww)) / 2;
  ctx.drawImage(mark, bx, 70, mw, mh);
  ctx.drawImage(word, bx + mw + 24, 70 + (mh - wh) / 2, ww, wh);

  // Who it is from.
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = "#1c1917";
  ctx.font = `700 64px ${font}`;
  let y = 270;
  for (const l of wrap(ctx, text.from, W - 160).slice(0, 2)) {
    ctx.fillText(l, W / 2, y);
    y += 76;
  }
  ctx.fillStyle = "#57534e";
  ctx.font = `500 36px ${font}`;
  ctx.fillText(text.lead, W / 2, y + 4);

  // The code, on white.
  const q = 600;
  const qx = (W - q) / 2;
  const qy = y + 80;
  ctx.save();
  ctx.shadowColor = "rgba(87,64,40,0.18)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 12;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, qx - 30, qy - 30, q + 60, q + 60, 44);
  ctx.fill();
  ctx.restore();
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(code, qx, qy, q, q);
  ctx.imageSmoothingEnabled = true;

  // How to read it, until when, and where.
  ctx.fillStyle = "#44403c";
  ctx.font = `500 30px ${font}`;
  y = qy + q + 90;
  for (const l of wrap(ctx, text.how, W - 200).slice(0, 3)) {
    ctx.fillText(l, W / 2, y);
    y += 42;
  }
  ctx.fillStyle = "#7c3aed";
  ctx.font = `700 30px ${font}`;
  ctx.fillText(text.until, W / 2, y + 14);
  ctx.fillStyle = "#a8a29e";
  ctx.font = `500 26px ${font}`;
  ctx.fillText("mosaicdiary.app", W / 2, H - 50);

  return new Promise((ok, fail) => canvas.toBlob((b) => (b ? ok(b) : fail(new Error("no image"))), "image/png"));
}
