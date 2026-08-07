import { MercadoPagoConfig } from "mercadopago";

export const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN ?? "";

/**
 * Certified integrator identifier. Sent as `X-Integrator-Id` so Mercado Pago
 * attributes the integration to us — it identifies the developer, not the
 * receiving account, so it stays the same if the studio's account changes.
 */
export const MP_INTEGRATOR_ID = process.env.MP_INTEGRATOR_ID ?? "";

export function isMercadoPagoConfigured(): boolean {
  return Boolean(MP_ACCESS_TOKEN);
}

/** Mercado Pago SDK client, or null when not configured. */
export function mpClient() {
  if (!isMercadoPagoConfigured()) return null;
  return new MercadoPagoConfig({
    accessToken: MP_ACCESS_TOKEN,
    // Global request options — applied to every SDK call (payments, lookups).
    options: MP_INTEGRATOR_ID ? { integratorId: MP_INTEGRATOR_ID } : undefined,
  });
}

/**
 * Auth headers for the REST endpoints we call directly (preapproval and
 * authorized_payments have no SDK client here). Mirrors what the SDK sends.
 */
export function mpHeaders(json = false): Record<string, string> {
  return {
    Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    ...(json ? { "Content-Type": "application/json" } : {}),
    ...(MP_INTEGRATOR_ID ? { "X-Integrator-Id": MP_INTEGRATOR_ID } : {}),
  };
}

/** Public base URL for back URLs and the webhook. */
export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}
