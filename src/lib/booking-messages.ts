/**
 * Booking result codes → Spanish messages. Kept in a plain module (NOT the
 * "use server" actions file, which may only export async functions) so both
 * server actions and client components can import it.
 */
import { CANCEL_WINDOW_NOTE, EMPTY_CLASS_CUTOFF_HOURS } from "./booking-rules";

const MESSAGES: Record<string, string> = {
  ok: "¡Reserva confirmada!",
  full: "Esta clase ya está llena.",
  no_credits: "No tienes clases disponibles. Compra un paquete.",
  already: "Ya tienes una reserva para esta clase.",
  closed: "Esta clase ya no está disponible.",
  too_late: `Ya pasó el tiempo para cancelar esta clase. ${CANCEL_WINDOW_NOTE}`,
  started: "Esta clase está por comenzar y las reservas ya cerraron. ¡Te esperamos en la siguiente!",
  empty_closed: `Nadie reservó esta clase, así que la cerramos ${EMPTY_CLASS_CUTOFF_HOURS} horas antes. Elige otro horario y ahí nos vemos.`,
  auth: "Inicia sesión para reservar.",
  not_configured: "El backend aún no está configurado.",
  error: "Ocurrió un error. Intenta de nuevo.",
};

export function bookingMessage(code: string): string {
  return MESSAGES[code] ?? MESSAGES.error;
}
