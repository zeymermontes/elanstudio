import Link from "next/link";
import { AtSign, MessageCircle, Mail } from "lucide-react";
import {
  navLinks,
  defaultSettings,
  whatsappUrl,
  type SiteSettings,
} from "@/lib/site";
import { APP_VERSION } from "@/lib/version";

export function SiteFooter({
  settings = defaultSettings,
}: {
  settings?: SiteSettings;
}) {
  const s = settings;
  const waUrl = whatsappUrl(s.whatsapp);
  return (
    <footer className="mt-24 border-t border-line/70 bg-cream/50">
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-x-6 gap-y-10 px-5 py-12 md:grid-cols-4 md:gap-10 md:py-14">
        <div className="col-span-2 md:col-span-1">
          <p className="font-serif text-xl font-semibold tracking-[0.2em] text-pink-strong">
            {s.studioName}
          </p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
            Estudio boutique de fitness. Un espacio sereno, diseñado para ti.
          </p>
        </div>

        <div>
          <p className="mb-4 text-[0.7rem] uppercase tracking-luxe text-gold">
            Explorar
          </p>
          <ul className="space-y-2">
            {navLinks.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  className="text-sm text-ink-soft transition-colors hover:text-pink-strong"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="mb-4 text-[0.7rem] uppercase tracking-luxe text-gold">
            Cuenta
          </p>
          <ul className="space-y-2 text-sm text-ink-soft">
            <li><Link href="/ingresar" className="hover:text-pink-strong">Ingresar</Link></li>
            <li><Link href="/registro" className="hover:text-pink-strong">Crear cuenta</Link></li>
            <li><Link href="/cuenta" className="hover:text-pink-strong">Mi cuenta</Link></li>
          </ul>
        </div>

        <div className="col-span-2 md:col-span-1">
          <p className="mb-4 text-[0.7rem] uppercase tracking-luxe text-gold">
            Contacto
          </p>
          <ul className="space-y-3 text-sm text-ink-soft">
            <li>
              {waUrl ? (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Escríbenos por WhatsApp al ${s.whatsapp}`}
                  className="flex items-center gap-2 transition-colors hover:text-pink-strong"
                >
                  <MessageCircle size={15} strokeWidth={1.5} /> {s.whatsapp}
                </a>
              ) : (
                <span className="flex items-center gap-2">
                  <MessageCircle size={15} strokeWidth={1.5} /> {s.whatsapp}
                </span>
              )}
            </li>
            <li className="flex items-center gap-2">
              <Mail size={15} strokeWidth={1.5} /> {s.email}
            </li>
            <li className="flex items-center gap-2">
              <AtSign size={15} strokeWidth={1.5} /> @{s.instagram}
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line/70">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-5 py-6 text-center text-xs text-ink-soft sm:flex-row sm:justify-between sm:gap-2 sm:py-5 sm:text-left">
          {/* On phones the tagline leads, with the © and the credit stacked
              under it; from sm the © and credit share one line on the left. */}
          <p className="flex flex-col gap-1 sm:block">
            <span>
              © {new Date().getFullYear()} {s.studioName}. Todos los derechos
              reservados.
            </span>
            <span className="mx-2 hidden text-ink-soft/40 sm:inline">·</span>
            <span>
              Powered by{" "}
              <a
                href="https://hiratalabs.com"
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-pink-strong"
              >
                hiratalabs
              </a>
            </span>
          </p>
          <p className="order-first uppercase tracking-luxe sm:order-none">
            {s.tagline}
          </p>
        </div>
        <p className="mx-auto max-w-6xl px-5 pb-4 text-center text-[0.65rem] text-ink-soft/50 sm:text-right">
          v{APP_VERSION}
        </p>
      </div>
    </footer>
  );
}
