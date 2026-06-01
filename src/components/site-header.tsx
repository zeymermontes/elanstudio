"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, User, LayoutDashboard } from "lucide-react";
import { Logo } from "@/components/logo";
import { navLinks, defaultSettings } from "@/lib/site";

export function SiteHeader({
  studioName = defaultSettings.studioName,
  isAdmin = false,
}: {
  studioName?: string;
  isAdmin?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Admin has its own chrome — hide the public header there.
  if (pathname?.startsWith("/admin")) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-line/70 bg-cream">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4">
        <Logo name={studioName} />

        <nav className="hidden items-center gap-8 md:flex">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-[0.8rem] uppercase tracking-[0.18em] transition-colors hover:text-pink-strong ${
                  active ? "text-pink-strong" : "text-ink-soft"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isAdmin ? (
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 rounded-full border border-gold/50 px-4 py-2 text-[0.8rem] uppercase tracking-[0.18em] text-gold transition-colors hover:border-gold hover:bg-gold-soft/30"
            >
              <LayoutDashboard size={15} strokeWidth={1.5} />
              Admin
            </Link>
          ) : null}
          <Link
            href="/cuenta"
            className="inline-flex items-center gap-2 text-[0.8rem] uppercase tracking-[0.18em] text-ink-soft transition-colors hover:text-pink-strong"
          >
            <User size={15} strokeWidth={1.5} />
            Mi cuenta
          </Link>
          <Link
            href="/horarios"
            className="rounded-full bg-pink px-5 py-2 text-[0.8rem] uppercase tracking-[0.18em] text-white shadow-soft transition-colors hover:bg-pink-strong"
          >
            Reservar
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-ink md:hidden"
          aria-label="Menú"
        >
          {open ? <X size={24} strokeWidth={1.5} /> : <Menu size={24} strokeWidth={1.5} />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-line bg-cream/95 px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="text-sm uppercase tracking-[0.18em] text-ink-soft"
              >
                {link.label}
              </Link>
            ))}
            {isAdmin ? (
              <Link
                href="/admin"
                onClick={() => setOpen(false)}
                className="inline-flex items-center gap-2 text-sm uppercase tracking-[0.18em] text-gold"
              >
                <LayoutDashboard size={15} strokeWidth={1.5} />
                Admin
              </Link>
            ) : null}
            <Link
              href="/cuenta"
              onClick={() => setOpen(false)}
              className="text-sm uppercase tracking-[0.18em] text-ink-soft"
            >
              Mi cuenta
            </Link>
            <Link
              href="/horarios"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-pink px-5 py-2 text-center text-sm uppercase tracking-[0.18em] text-white"
            >
              Reservar
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
