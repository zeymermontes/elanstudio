"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { AdminNav } from "./admin-nav";
import { signOutAction } from "@/lib/actions/auth";

/** Mobile-only top bar + slide-in drawer for the admin navigation. */
export function AdminMobileNav({ name }: { name: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      {/* Top bar */}
      <div className="sticky top-0 z-40 -mx-5 -mt-10 mb-6 flex items-center justify-between border-b border-line bg-cream px-5 py-4">
        <Link href="/admin" className="leading-none">
          <span className="font-serif text-xl font-semibold tracking-[0.15em] text-pink-strong">
            ÉLAN
          </span>
          <span className="ml-2 text-[0.6rem] uppercase tracking-luxe text-gold">
            Admin
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Menú"
          className="text-ink"
        >
          <Menu size={24} strokeWidth={1.5} />
        </button>
      </div>

      {/* Drawer */}
      {open ? (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-ink/30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 flex h-full w-72 flex-col overflow-y-auto bg-cream px-5 py-6 shadow-soft">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-serif text-xl font-semibold tracking-[0.15em] text-pink-strong">
                ÉLAN
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="text-ink"
              >
                <X size={22} strokeWidth={1.5} />
              </button>
            </div>

            {/* Close the drawer when any link inside is tapped. */}
            <div onClick={() => setOpen(false)}>
              <AdminNav />
            </div>

            <div className="mt-6 border-t border-line pt-4">
              <p className="px-4 text-xs text-ink-soft">{name}</p>
              <div className="mt-2 flex items-center gap-3 px-4">
                <Link
                  href="/"
                  onClick={() => setOpen(false)}
                  className="text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft hover:text-pink-strong"
                >
                  Ver sitio
                </Link>
                <form action={signOutAction}>
                  <button className="text-[0.7rem] uppercase tracking-[0.12em] text-ink-soft hover:text-pink-strong">
                    Salir
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
