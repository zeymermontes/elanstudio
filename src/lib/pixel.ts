/**
 * Eventos del Pixel de Meta que manda el sitio, aparte del PageView que ya
 * dispara el snippet (src/components/meta-pixel.tsx).
 *
 *   ViewContent          la alumna abre un paquete (/comprar/[id])
 *   InitiateCheckout     empieza a pagar: manda la tarjeta, sube su
 *                        comprobante o toca "Suscribirme"
 *   Purchase             la compra se cobró (tarjeta aprobada, transferencia
 *                        registrada, suscripción autorizada)
 *   Subscribe            además de Purchase, cuando lo que autorizó es el plan
 *                        mensual
 *   CompleteRegistration creó su cuenta
 *   Schedule             reservó una clase
 *   Contact              tocó un enlace de WhatsApp
 *
 * Los importes van en MXN y los content_ids son los ids de paquete, para que
 * cuadren con un catálogo si algún día se sube uno. El eventID es el id de la
 * compra: si más adelante se manda lo mismo por la Conversions API, Meta
 * deduplica con él.
 *
 * Sin pixel (id vacío) window.fbq nunca existe y todo esto no hace nada.
 */

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

export type PixelEvent =
  | "ViewContent"
  | "InitiateCheckout"
  | "Purchase"
  | "Subscribe"
  | "CompleteRegistration"
  | "Schedule"
  | "Contact";

export type PixelParams = Record<string, string | number | string[]>;

/** Parámetros de un paquete tal como los espera Meta. */
export function packageParams(pkg: {
  id: string;
  name?: string;
  /** Lo que se cobra, ya con descuento. */
  valueMxn: number;
}): PixelParams {
  return {
    content_ids: [pkg.id],
    ...(pkg.name ? { content_name: pkg.name } : {}),
    content_type: "product",
    value: pkg.valueMxn,
    currency: "MXN",
    num_items: 1,
  };
}

// El snippet se carga afterInteractive, así que un evento disparado nada más
// hidratar puede llegar antes de que exista fbq. Se reintenta unos segundos en
// vez de perderlo; si nunca aparece (pixel apagado) se descarta en silencio.
const RETRY_MS = 250;
const MAX_TRIES = 20;

export function trackPixel(
  event: PixelEvent,
  params: PixelParams = {},
  eventId?: string,
): void {
  if (typeof window === "undefined") return;
  let tries = 0;
  const attempt = () => {
    if (window.fbq) {
      const args: unknown[] = ["track", event, params];
      if (eventId) args.push({ eventID: eventId });
      window.fbq(...args);
      return;
    }
    if (++tries < MAX_TRIES) setTimeout(attempt, RETRY_MS);
  };
  attempt();
}
