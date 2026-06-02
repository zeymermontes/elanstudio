import Link from "next/link";
import { AtSign, MessageCircle, Mail } from "lucide-react";
import { navLinks, defaultSettings, type SiteSettings } from "@/lib/site";

export function SiteFooter({
  settings = defaultSettings,
}: {
  settings?: SiteSettings;
}) {
  const s = settings;
  return (
    <footer className="mt-24 border-t border-line/70 bg-cream/50">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-2 md:grid-cols-4">
        <div className="sm:col-span-2 md:col-span-1">
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

        <div>
          <p className="mb-4 text-[0.7rem] uppercase tracking-luxe text-gold">
            Contacto
          </p>
          <ul className="space-y-3 text-sm text-ink-soft">
            <li className="flex items-center gap-2">
              <MessageCircle size={15} strokeWidth={1.5} /> {s.whatsapp}
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
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-5 text-xs text-ink-soft sm:flex-row">
          <p>© {new Date().getFullYear()} {s.studioName}. Todos los derechos reservados.</p>
          <p className="uppercase tracking-luxe">{s.tagline}</p>
        </div>
      </div>
    </footer>
  );
}
