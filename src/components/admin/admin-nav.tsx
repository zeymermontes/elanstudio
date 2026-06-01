"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Palette,
  Dumbbell,
  CalendarDays,
  Package,
  Users,
  MapPin,
  ClipboardList,
  CreditCard,
} from "lucide-react";

const items = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/ajustes", label: "Marca", icon: Palette },
  { href: "/admin/clases", label: "Clases", icon: Dumbbell },
  { href: "/admin/horario", label: "Horario", icon: CalendarDays },
  { href: "/admin/paquetes", label: "Paquetes", icon: Package },
  { href: "/admin/coaches", label: "Coaches", icon: Users },
  { href: "/admin/ubicaciones", label: "Ubicaciones", icon: MapPin },
  { href: "/admin/reservas", label: "Reservas", icon: ClipboardList },
  { href: "/admin/pagos", label: "Pagos", icon: CreditCard },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {items.map((it) => {
        const active = it.exact
          ? pathname === it.href
          : pathname?.startsWith(it.href);
        return (
          <Link
            key={it.href}
            href={it.href}
            className={`flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm transition-colors ${
              active
                ? "bg-pink-soft/70 text-pink-strong"
                : "text-ink-soft hover:bg-cream hover:text-ink"
            }`}
          >
            <it.icon size={17} strokeWidth={1.5} />
            {it.label}
          </Link>
        );
      })}
    </nav>
  );
}
