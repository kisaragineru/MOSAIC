import { ImageResponse } from "next/og";

// The card shown when a MOSAIC link is shared (LINE, X, Facebook, Slack…).
export const alt = "MOSAIC — A lifetime, piece by piece.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TILES = ["#5eead4", "#a5b4fc", "#fda4af", "#fcd34d", "#7dd3fc", "#c4b5fd", "#fdba74", "#99f6e4", "#f9a8d4", "#bef264", "#93c5fd", "#fecaca"];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 90px",
          background: "linear-gradient(135deg, #faf8f5 0%, #f0fdfa 45%, #f5f3ff 100%)",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 112, fontWeight: 300, letterSpacing: 26, color: "#1c1917" }}>MOSAIC</div>
          <div style={{ marginTop: 18, fontSize: 40, color: "#57534e" }}>A lifetime, piece by piece.</div>
          <div style={{ marginTop: 34, display: "flex", fontSize: 26, color: "#0f766e" }}>Your records · the people you love · who you are</div>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", width: 330, gap: 14 }}>
          {TILES.map((c, i) => (
            <div key={i} style={{ width: 96, height: 96, borderRadius: 26, background: c, opacity: i % 5 === 2 ? 0.55 : 1 }} />
          ))}
        </div>
      </div>
    ),
    size,
  );
}
