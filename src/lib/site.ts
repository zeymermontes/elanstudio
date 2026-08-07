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

/**
 * Message prefilled when someone taps the WhatsApp link. Written as a person
 * would type it, so the conversation starts warm rather than like a form.
 */
export const WHATSAPP_ENQUIRY =
  "Hola, me gustaría recibir información sobre las clases y los paquetes.";

/**
 * Builds a wa.me link from the free-text number the admin typed in Ajustes —
 * anything from "+52 55 1234 5678" to "5512345678". wa.me accepts digits only,
 * with the country code and no leading "+".
 *
 * Returns null when the number can't be made dialable (empty, still the seeded
 * placeholder, or an implausible length) so the caller can render plain text
 * instead of a link that opens WhatsApp on a number that doesn't exist.
 */
export function whatsappUrl(
  raw: string,
  message: string = WHATSAPP_ENQUIRY,
): string | null {
  let digits = raw.replace(/\D/g, "");
  // Some people write the international prefix as "00" instead of "+".
  if (digits.startsWith("00")) digits = digits.slice(2);
  // A bare 10-digit number is a local Mexican one — wa.me needs the country
  // code. Safe to assume MX: the studio bills MXN and is based in México.
  if (digits.length === 10) digits = `52${digits}`;
  if (digits.length < 8 || digits.length > 15) return null;
  // The seeded placeholder ("+52 000 000 0000") is not a real number.
  if (/^0+$/.test(digits.slice(2))) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** Public navigation (Spanish). */
export const navLinks = [
  { href: "/clases", label: "Clases" },
  { href: "/horarios", label: "Horarios" },
  { href: "/paquetes", label: "Paquetes" },
  { href: "/coaches", label: "Coaches" },
  { href: "/ubicaciones", label: "Ubicaciones" },
];
