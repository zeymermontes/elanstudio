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
  UserCircle,
  MapPin,
  ClipboardList,
  ClipboardCheck,
  CreditCard,
  Tag,
} from "lucide-react";
import type { Role } from "@/lib/auth";

type Item = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: Role[];
  exact?: boolean;
};

const ADMIN: Role[] = ["admin"];
const STAFF: Role[] = ["admin", "coach"];

const items: Item[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: STAFF, exact: true },
  { href: "/admin/mis-clases", label: "Mis clases", icon: ClipboardCheck, roles: ["coach"] },
  { href: "/admin/vender", label: "Vender", icon: Tag, roles: STAFF },
  { href: "/admin/ajustes", label: "Marca", icon: Palette, roles: ADMIN },
  { href: "/admin/clases", label: "Clases", icon: Dumbbell, roles: ADMIN },
  { href: "/admin/horario", label: "Horario", icon: CalendarDays, roles: ADMIN },
  { href: "/admin/paquetes", label: "Paquetes", icon: Package, roles: ADMIN },
  { href: "/admin/usuarios", label: "Usuarios", icon: UserCircle, roles: ADMIN },
  { href: "/admin/coaches", label: "Coaches", icon: Users, roles: ADMIN },
  { href: "/admin/ubicaciones", label: "Ubicaciones", icon: MapPin, roles: ADMIN },
  { href: "/admin/reservas", label: "Reservas", icon: ClipboardList, roles: ADMIN },
  { href: "/admin/pagos", label: "Pagos", icon: CreditCard, roles: ADMIN },
];

export function AdminNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const visible = items.filter((it) => it.roles.includes(role));

  return (
    <nav className="space-y-1">
      {visible.map((it) => {
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
