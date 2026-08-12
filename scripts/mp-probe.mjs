#!/usr/bin/env node
/**
 * Validates the shape of our /v1/payments payload without charging anything.
 *
 * Mercado Pago validates the request structure BEFORE it touches the card, so
 * sending a deliberately invalid token gets the payload checked end to end and
 * stops right there. Nothing is created, nothing is charged.
 *
 * Reading it:
 *   "Invalid card_token_id" (cause 3003)      → the payload is good. That is as
 *                                               far as a fake token can go.
 *   "The name of the following parameters is  → the payload is wrong. The
 *    wrong: [...]"                              offending field is named.
 *
 * The classic failure this catches is `currency_id` inside
 * `additional_info.items`: a *preference* item takes it, a *payment* item does
 * not, and sending it kills the whole charge with an HTTP 400 before the card is
 * ever seen. The SDK's TypeScript types share `Items` between the two, so the
 * compiler will not catch it — only this will.
 *
 * Run it after any change to the payment payload, before deploying:
 *   node scripts/mp-probe.mjs
 */

import { readFileSync } from "node:fs";

function loadToken() {
  if (process.env.MP_ACCESS_TOKEN) return process.env.MP_ACCESS_TOKEN;
  try {
    const line = readFileSync(new URL("../.env", import.meta.url), "utf8")
      .split("\n")
      .find((l) => l.trim().startsWith("MP_ACCESS_TOKEN="));
    if (!line) return null;
    return line.slice(line.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "");
  } catch {
    return null;
  }
}

const token = loadToken();
if (!token) {
  console.error("No MP_ACCESS_TOKEN (env or .env). Nothing to probe.");
  process.exit(1);
}

// Mirrors the body built in src/app/api/mp/process/route.ts. Keep them in sync —
// a probe of a payload we don't actually send proves nothing.
const body = {
  transaction_amount: 1,
  token: "token_invalido_a_proposito",
  installments: 1,
  payment_method_id: "visa",
  description: "Paquete de prueba · ÉLANSTUDIO",
  payer: { email: "probe@example.com" },
  external_reference: "probe",
  metadata: { purchase_id: "probe", user_id: "probe" },
  additional_info: {
    items: [
      {
        id: "probe-package",
        title: "Paquete de prueba",
        description: "Paquete de clases · ÉLANSTUDIO",
        category_id: "services",
        quantity: 1,
        unit_price: 1,
      },
    ],
    payer: {
      first_name: "Prueba",
      last_name: "Élan",
      phone: { number: "5555555555" },
    },
  },
};

const res = await fetch("https://api.mercadopago.com/v1/payments", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Idempotency-Key": `probe-${process.pid}-${Date.now()}`,
  },
  body: JSON.stringify(body),
});

const json = await res.json().catch(() => ({}));
const message = json.message ?? "";
console.log(`HTTP ${res.status}`);
console.log(JSON.stringify(json, null, 2));

if (/invalid card_token_id/i.test(message) || json.cause?.[0]?.code === 3003) {
  console.log("\n✅ Payload OK — passed full validation, stopped at the token.");
  process.exit(0);
}
if (/name of the following parameters is wrong/i.test(message)) {
  console.log("\n❌ Payload malformed — the offending field is named above.");
  process.exit(1);
}
console.log("\n⚠️  Unexpected response. Read it before deploying.");
process.exit(1);
