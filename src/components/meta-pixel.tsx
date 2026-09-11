"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
  }
}

/**
 * Pixel de Meta (Facebook / Instagram).
 *
 * El id llega como prop desde el layout: primero el que se guardó en Marca &
 * Ajustes (site_settings.meta_pixel_id) y, si está vacío, META_PIXEL_ID del
 * entorno como respaldo. A propósito no es NEXT_PUBLIC_: esas se congelan al
 * compilar. Sin id esto no pinta nada.
 *
 * No se carga en /admin: son las visitas del estudio a su propio panel y solo
 * ensucian las audiencias.
 */
export function MetaPixel({ pixelId }: { pixelId: string }) {
  const pathname = usePathname();
  const yaVistaLaPrimera = useRef(false);

  useEffect(() => {
    // El snippet de abajo ya manda el PageView de la primera carga. Este efecto
    // cubre las siguientes: Next navega sin recargar y Meta no se entera solo.
    if (!yaVistaLaPrimera.current) {
      yaVistaLaPrimera.current = true;
      return;
    }
    window.fbq?.("track", "PageView");
  }, [pathname]);

  if (!pixelId || pathname.startsWith("/admin")) return null;

  return (
    <>
      <Script
        id="meta-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window,document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', ${JSON.stringify(pixelId)});
fbq('track', 'PageView');`,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          alt=""
          src={`https://www.facebook.com/tr?id=${encodeURIComponent(
            pixelId,
          )}&ev=PageView&noscript=1`}
        />
      </noscript>
    </>
  );
}
