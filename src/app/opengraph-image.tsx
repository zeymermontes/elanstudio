import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Link-sharing preview image (Open Graph / Twitter): the brand logo centered
// on the bone background, at the standard 1200×630.
export const runtime = "nodejs";
export const alt = "ÉLANSTUDIO — Estudio boutique";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const logo = readFileSync(join(process.cwd(), "public/logo.png"));
  const logoSrc = `data:image/png;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8f4ef",
        }}
      >
        <img src={logoSrc} width={500} height={402} alt="" />
      </div>
    ),
    { ...size },
  );
}
