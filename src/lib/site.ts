/**
 * Brand & site configuration.
 *
 * These are the DEFAULTS. In production they are overridden by the
 * `site_settings` row in Supabase (editable from the admin "Marca / Ajustes"
 * screen) — see src/lib/settings.ts. Keep this as the single source of truth
 * for copy and brand tokens so nothing is hardcoded in components.
 */
export type SiteSettings = {
  studioName: string;
  tagline: string;
  primaryColor: string; // brand pink
  accentColor: string; // gold
  bgColor: string; // bone/marble base
  whatsapp: string;
  email: string;
  instagram: string;
  address: string;
};

export const defaultSettings: SiteSettings = {
  studioName: "ÉLANSTUDIO",
  tagline: "Built by two · Designed for all",
  primaryColor: "#e29aaa",
  accentColor: "#c7a86a",
  bgColor: "#f8f4ef",
  whatsapp: "+52 000 000 0000",
  email: "hola@elanstudio.com",
  instagram: "elanstudio",
  address: "Ciudad de México",
};

/** Public navigation (Spanish). */
export const navLinks = [
  { href: "/clases", label: "Clases" },
  { href: "/horarios", label: "Horarios" },
  { href: "/paquetes", label: "Paquetes" },
  { href: "/coaches", label: "Coaches" },
  { href: "/ubicaciones", label: "Ubicaciones" },
];
