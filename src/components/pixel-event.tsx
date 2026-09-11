"use client";

import { useEffect, useRef } from "react";
import { trackPixel, type PixelEvent, type PixelParams } from "@/lib/pixel";

/**
 * Dispara un evento del pixel al montarse. Para páginas de servidor que
 * quieren marcar algo al cargar (ViewContent en /comprar, la vuelta de
 * Mercado Pago en /cuenta).
 *
 * `once` es una llave para no repetirlo si recargan la página: se guarda en
 * sessionStorage, así la vuelta de una suscripción cuenta una sola vez aunque
 * la alumna refresque /cuenta?suscripcion=ok.
 */
export function PixelEventOnMount({
  event,
  params,
  eventId,
  once,
}: {
  event: PixelEvent;
  params?: PixelParams;
  eventId?: string;
  once?: string;
}) {
  const propsRef = useRef({ event, params, eventId, once });

  useEffect(() => {
    const p = propsRef.current;
    if (p.once) {
      const key = `pixel:${p.once}`;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, "1");
      } catch {
        // Sin storage (modo privado estricto) se manda igual.
      }
    }
    trackPixel(p.event, p.params, p.eventId);
  }, []);

  return null;
}
