import { ImageResponse } from "next/og";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Shared renderer for the Open Graph / Twitter share image: the brand logo
 * centered on the bone background at 1200×630. The route-segment config
 * (runtime/size/contentType/alt) must live as literals in each route file —
 * Next can't statically parse them when re-exported — so only this render
 * function is shared.
 */
export function renderOgImage() {
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
    { width: 1200, height: 630 },
  );
}
