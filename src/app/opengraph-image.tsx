import { renderOgImage } from "@/lib/og-image";

// Link-sharing preview (Open Graph). Config must be literals in this file.
export const runtime = "nodejs";
export const alt = "ÉLANSTUDIO — Estudio boutique";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return renderOgImage();
}
