import type { Metadata } from "next";
import "./globals.css";
import { defaultSettings } from "@/lib/site";
import { getSettings } from "@/lib/data";
import { getProfile } from "@/lib/auth";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: {
    default: `${defaultSettings.studioName} · Estudio Boutique`,
    template: `%s · ${defaultSettings.studioName}`,
  },
  description:
    "Estudio boutique de fitness y pilates. Reserva tus clases, descubre nuestros paquetes, coaches y ubicaciones.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [settings, profile] = await Promise.all([getSettings(), getProfile()]);
  const isAdmin = profile?.role === "admin";

  // Admin-configurable brand colors override the CSS variable defaults.
  const themeOverride = `:root{--brand-pink:${settings.primaryColor};--brand-gold:${settings.accentColor};--bg-bone:${settings.bgColor};}`;

  return (
    <html lang="es" className="h-full antialiased">
      <head>
        {/*
          Fonts are loaded in the browser via a plain stylesheet link (not
          next/font/google), so the dev server never fetches fonts at build
          time. preconnect keeps the runtime load fast.
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=Montserrat:wght@300;400;500;600&display=swap"
        />
        <style dangerouslySetInnerHTML={{ __html: themeOverride }} />
      </head>
      <body className="min-h-full flex flex-col">
        <SiteHeader studioName={settings.studioName} isAdmin={isAdmin} />
        <main className="flex-1">{children}</main>
        <SiteFooter settings={settings} />
      </body>
    </html>
  );
}
