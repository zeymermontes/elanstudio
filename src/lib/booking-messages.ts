/**
 * Booking result codes → Spanish messages. Kept in a plain module (NOT the
 * "use server" actions file, which may only export async functions) so both
 * server actions and client components can import it.
 */
const MESSAGES: Record<string, string> = {
  ok: "¡Reserva confirmada!",
  full: "Esta clase ya está llena.",
  no_credits: "No tienes clases disponibles. Compra un paquete.",
  already: "Ya tienes una reserva para esta clase.",
  closed: "Esta clase ya no está disponible.",
  auth: "Inicia sesión para reservar.",
  not_configured: "El backend aún no está configurado.",
  error: "Ocurrió un error. Intenta de nuevo.",
};

export function bookingMessage(code: string): string {
  return MESSAGES[code] ?? MESSAGES.error;
}
