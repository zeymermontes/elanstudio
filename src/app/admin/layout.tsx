import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { signOutAction } from "@/lib/actions/auth";
import { AdminNav } from "@/components/admin/admin-nav";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireStaff();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-8 px-5 py-10 lg:flex-row">
      {/* Mobile: top bar + slide-in drawer */}
      <AdminMobileNav name={profile.full_name} role={profile.role} />

      {/* Desktop: sticky sidebar */}
      <aside className="hidden lg:block lg:w-60 lg:shrink-0">
        <div className="lg:sticky lg:top-24">
          <Link href="/admin" className="block">
            <p className="font-serif text-2xl font-semibold tracking-[0.15em] text-pink-strong">
              ÉLAN
            </p>
            <p className="text-[0.6rem] uppercase tracking-luxe text-gold">
              Panel de administración
            </p>
          </Link>

          <div className="my-6">
            <AdminNav role={profile.role} />
          </div>

          <div className="mt-6 border-t border-line pt-4">
            <p className="px-4 text-xs text-ink-soft">{profile.full_name}</p>
            <div className="mt-2 flex items-center gap-3 px-4">
              <Link
                href="/"
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
      </aside>

      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
