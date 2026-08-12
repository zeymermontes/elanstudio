/**
 * Turning a Mercado Pago decline into something the member can act on.
 *
 * A declined charge comes back as `status: "rejected"` plus a `status_detail`
 * that says why. Only the detail is actionable — on `status` alone a mistyped
 * security code, a card without funds and a bank's anti-fraud block all read
 * the same, so nobody knows what to correct and all three get reported to us as
 * the same problem.
 *
 * Anything not on this list falls back to the generic message, so a code Mercado
 * Pago adds later degrades to what we used to say instead of showing nothing.
 */

const REJECTION_MESSAGES: Record<string, string> = {
  // Something on the form doesn't match the card.
  cc_rejected_bad_filled_security_code:
    "El código de seguridad no coincide. Revísalo e intenta de nuevo.",
  cc_rejected_bad_filled_date:
    "La fecha de vencimiento no coincide. Revísala e intenta de nuevo.",
  cc_rejected_bad_filled_card_number:
    "El número de tarjeta no coincide. Revísalo e intenta de nuevo.",
  cc_rejected_bad_filled_other:
    "Alguno de los datos de la tarjeta no coincide. Revísalos e intenta de nuevo.",

  // The card is fine; the bank said no.
  cc_rejected_insufficient_amount:
    "Tu tarjeta no tiene fondos suficientes para este paquete.",
  cc_rejected_call_for_authorize:
    "Tu banco necesita autorizar este monto. Llámalos y vuelve a intentar.",
  cc_rejected_card_disabled:
    "Tu tarjeta está inactiva. Llama a tu banco o prueba con otra.",
  cc_rejected_high_risk:
    "Tu banco no autorizó el cargo. Prueba con otra tarjeta o contáctalos.",
  cc_rejected_card_error:
    "Tu banco no pudo procesar la tarjeta. Intenta de nuevo o usa otra.",
  cc_rejected_other_reason:
    "Tu banco no procesó el pago. Intenta de nuevo o usa otra tarjeta.",

  // Limits and repeats.
  cc_rejected_max_attempts:
    "Esta tarjeta llegó a su límite de intentos. Prueba con otra.",
  cc_rejected_duplicated_payment:
    "Ya recibimos un pago igual. Revisa tu cuenta antes de intentar otra vez.",
  cc_rejected_invalid_installments:
    "Tu tarjeta no acepta ese número de mensualidades. Elige otro.",
  cc_rejected_blacklist: "No pudimos procesar esta tarjeta. Prueba con otra.",
};

const GENERIC_REJECTION =
  "No pudimos procesar el pago. Revisa los datos de tu tarjeta e intenta de nuevo.";

/** What to tell the member about a declined charge. */
export function paymentRejectionMessage(statusDetail?: string | null): string {
  if (!statusDetail) return GENERIC_REJECTION;
  return REJECTION_MESSAGES[statusDetail] ?? GENERIC_REJECTION;
}
