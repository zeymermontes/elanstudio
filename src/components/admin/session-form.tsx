"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import {
  saveSessionAction,
  deleteSessionAction,
  cancelEventAction,
  type FormState,
} from "@/lib/actions/admin";
import type { ClassType, Coach, Location, ScheduleSlot } from "@/lib/types";
import { toDateTimeLocal } from "@/lib/format";
import { Field, StatusBanner, SaveButton, inputClass } from "./form-ui";
import { DeleteButton } from "./delete-button";

/**
 * Alta y edición de un evento único (fuera del horario semanal). Sin `event`
 * es el formulario de alta; con `event` edita ese evento, incluida la fecha y
 * la sede — que antes solo se podían corregir borrando y volviendo a crear.
 */
export function SessionForm({
  event,
  classTypes,
  coaches,
  locations,
}: {
  event?: ScheduleSlot;
  classTypes: ClassType[];
  coaches: Coach[];
  locations: Location[];
}) {
  const [state, action] = useActionState<FormState, FormData>(
    saveSessionAction,
    null,
  );

  const sessionId =
    event && event.ref.kind === "session" ? event.ref.sessionId : null;

  // Título y descripción del evento (0031). Al elegir la clase se prellenan
  // con los suyos; si el admin ya escribió algo, no se le pisa. Al editar
  // llegan ya resueltos en event.classType.
  const [title, setTitle] = useState(event?.classType.name ?? "");
  const [description, setDescription] = useState(
    event?.classType.description ?? "",
  );
  const [touched, setTouched] = useState({
    title: !!event,
    description: !!event,
  });

  function onClassChange(id: string) {
    const ct = classTypes.find((c) => c.id === id);
    if (!ct) return;
    if (!touched.title) setTitle(ct.name);
    if (!touched.description) setDescription(ct.description);
  }

  return (
    <form
      action={action}
      className="surface-card rounded-2xl px-6 py-6 shadow-soft"
    >
      {sessionId ? <input type="hidden" name="id" value={sessionId} /> : null}
      <div className="space-y-4">
        <StatusBanner state={state} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Clase">
            <select
              name="class_type_id"
              defaultValue={event?.classType.id ?? ""}
              onChange={(e) => onClassChange(e.target.value)}
              required
              className={inputClass}
            >
              <option value="">Selecciona…</option>
              {classTypes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Fecha y hora">
            <input
              type="datetime-local"
              name="starts_at"
              /* Se lee en el huso de la sede del evento, para que el admin vea
                 de vuelta la misma hora de pared que escribió. */
              defaultValue={
                event ? toDateTimeLocal(event.startsAt, event.utcOffsetMin) : ""
              }
              required
              className={inputClass}
            />
          </Field>
          <Field label="Coach">
            <select
              name="coach_id"
              defaultValue={event?.coach?.id ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              {coaches.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Ubicación">
            <select
              name="location_id"
              defaultValue={event?.location?.id ?? ""}
              className={inputClass}
            >
              <option value="">—</option>
              {locations.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label={event ? "Capacidad" : "Capacidad (opcional)"}>
            <input
              type="number"
              name="capacity"
              min={1}
              defaultValue={event?.capacity ?? ""}
              placeholder="Por defecto de la clase"
              className={inputClass}
            />
          </Field>
        </div>

        <div className="grid gap-4">
          <Field label="Título del evento">
            <input
              name="title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTouched((t) => ({ ...t, title: true }));
              }}
              placeholder="Se toma de la clase"
              className={inputClass}
            />
          </Field>
          <Field label="Descripción">
            <textarea
              name="description"
              rows={3}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                setTouched((t) => ({ ...t, description: true }));
              }}
              placeholder="Se toma de la clase"
              className={inputClass}
            />
          </Field>
          <p className="-mt-2 text-xs text-ink-soft/80">
            Se llenan con los de la clase al elegirla; cámbialos si el evento
            merece su propio nombre. Si los dejas iguales, siguen a la clase.
          </p>
        </div>

        {/* Costo. Una clase normal vale 1 clase y la cubre la mensualidad;
            un taller o una masterclass puede valer más, venderse aparte o
            quedar fuera del plan. */}
        <fieldset className="rounded-2xl border border-line px-5 py-4">
          <legend className="px-2 text-[0.7rem] uppercase tracking-luxe text-gold">
            Costo de la clase
          </legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Clases que descuenta (0 = solo pago aparte)">
              <input
                type="number"
                name="credit_cost"
                min={0}
                step={1}
                defaultValue={event?.pricing.creditCost ?? 1}
                required
                className={inputClass}
              />
            </Field>
            <Field label="Precio para pagarla aparte (MXN, opcional)">
              <input
                type="number"
                name="price_mxn"
                min={1}
                step="0.01"
                defaultValue={event?.pricing.priceMxn ?? ""}
                placeholder="Solo con clases"
                className={inputClass}
              />
            </Field>
          </div>
          <p className="mt-2 text-xs text-ink-soft/80">
            Con precio, la alumna elige: gasta sus clases o la paga aparte con
            tarjeta o transferencia. Con 0 clases el pago es forzoso: solo entra
            pagando el precio, ni con paquete ni con mensualidad.
          </p>
          <label className="mt-4 flex items-start gap-2.5 text-sm text-ink-soft">
            <input
              type="checkbox"
              name="plan_included"
              defaultChecked={event ? event.pricing.planIncluded : true}
              className="mt-0.5 accent-pink"
            />
            <span>
              La mensualidad ilimitada la incluye
              <span className="mt-0.5 block text-xs text-ink-soft/80">
                Sin marcar, a quien tiene mensualidad se le avisa que no se
                incluye en su plan y la paga aparte o con clases de un paquete.
              </span>
            </span>
          </label>
        </fieldset>

        <label className="flex items-start gap-2.5 text-sm text-ink-soft">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={event?.featured}
            className="mt-0.5 accent-pink"
          />
          <span>
            Anunciarlo en la portada
            <span className="mt-0.5 block text-xs text-ink-soft/80">
              Aparece en &laquo;Próximos eventos especiales&raquo; en el inicio.
              Sin marcar, el evento igual se ve en Horarios.
            </span>
          </span>
        </label>

        <div className="flex flex-wrap items-center justify-end gap-4">
          {sessionId ? (
            <>
              <Link
                href={`/admin/horario/${sessionId}`}
                className="mr-auto inline-flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.12em] text-pink-strong transition-colors hover:text-ink"
              >
                <ClipboardCheck size={13} strokeWidth={1.5} /> Lista
              </Link>
              {/*
                Con gente dentro la única salida segura es cancelar: la reserva
                cuelga del evento con borrado en cascada, así que eliminarlo se
                llevaría sus reservas sin devolverles la clase.
              */}
              {event && event.booked > 0 ? (
                <DeleteButton
                  id={sessionId}
                  onDelete={cancelEventAction}
                  label="Cancelar"
                  confirmText={`Se cancelará el evento y se devolverá su clase a las ${event.booked} personas que ya reservaron.`}
                />
              ) : (
                <DeleteButton
                  id={sessionId}
                  onDelete={deleteSessionAction}
                  confirmText="¿Eliminar este evento? Nadie ha reservado todavía."
                />
              )}
            </>
          ) : null}
          <SaveButton label={event ? "Guardar" : "Agendar clase"} />
        </div>
      </div>
    </form>
  );
}
