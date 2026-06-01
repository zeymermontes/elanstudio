import { MercadoPagoConfig } from "mercadopago";

export const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN ?? "";

export function isMercadoPagoConfigured(): boolean {
  return Boolean(MP_ACCESS_TOKEN);
}

/** Mercado Pago SDK client, or null when not configured. */
export function mpClient() {
  if (!isMercadoPagoConfigured()) return null;
  return new MercadoPagoConfig({ accessToken: MP_ACCESS_TOKEN });
}

/** Public base URL for back URLs and the webhook. */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
