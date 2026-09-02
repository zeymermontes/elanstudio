#!/usr/bin/env node
/**
 * Desbloquea a una usuaria que no puede confirmar su correo.
 *
 * El dashboard de Supabase solo ofrece "reenviar confirmación", que vuelve a
 * mandar el mail al mismo buzón inalcanzable. Esto usa la API de admin, que sí
 * puede marcar el correo como confirmado sin enviar nada — y, si hace falta,
 * cambiarlo primero por uno que la usuaria sí controle.
 *
 * Confirmar el correo actual solo la deja entrar hoy: si el buzón está perdido,
 * el día que olvide su contraseña el link de recuperación vuelve a caer ahí.
 * Por eso el modo recomendado es el que además cambia el correo.
 *
 * profiles no guarda el correo (vive solo en auth.users) y el panel lo lee en
 * vivo desde ahí, así que cambiarlo no deja nada desincronizado en la app.
 *
 * Uso:
 *   node scripts/fix-user-email.mjs <uid|correo>                  → solo consulta
 *   node scripts/fix-user-email.mjs <uid|correo> --yes            → confirma el correo actual
 *   node scripts/fix-user-email.mjs <uid|correo> <nuevo> --yes    → cambia el correo y lo confirma
 *
 * Sin --yes no escribe nada: imprime a quién apuntaría y se detiene.
 */

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function env(key) {
  if (process.env[key]) return process.env[key];
  const line = readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1).trim() : "";
}

const url = env("NEXT_PUBLIC_SUPABASE_URL");
const key = env("SUPABASE_SERVICE_ROLE_KEY");
if (!url || !key) {
  console.error("Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const args = process.argv.slice(2);
const write = args.includes("--yes");
const [target, newEmail] = args.filter((a) => a !== "--yes");
if (!target) {
  console.error("Indica el UID o el correo actual de la usuaria.");
  process.exit(1);
}

const admin = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Busca por UID, o recorre la lista buscando por correo. */
async function findUser(t) {
  if (/^[0-9a-f-]{36}$/i.test(t)) {
    const { data, error } = await admin.auth.admin.getUserById(t);
    if (error) throw error;
    return data.user;
  }
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const hit = data.users.find(
      (u) => (u.email ?? "").toLowerCase() === t.toLowerCase(),
    );
    if (hit) return hit;
    if (data.users.length < 200) break;
  }
  return null;
}

const user = await findUser(target);
if (!user) {
  console.error(`No encontré ninguna usuaria con "${target}".`);
  process.exit(1);
}

console.log("Usuaria:");
console.log("  UID           ", user.id);
console.log("  Nombre        ", user.user_metadata?.full_name || "—");
console.log("  Correo actual ", user.email);
console.log("  Confirmado    ", user.email_confirmed_at ?? "NO");
console.log("  Último acceso ", user.last_sign_in_at ?? "nunca");

const changes = { email_confirm: true };
if (newEmail) changes.email = newEmail;

console.log("");
console.log(
  newEmail
    ? `Acción: cambiar el correo a ${newEmail} y marcarlo confirmado.`
    : "Acción: marcar el correo actual como confirmado.",
);

if (!write) {
  console.log("\n(Consulta nada más — agrega --yes para aplicarlo.)");
  process.exit(0);
}

const { data, error } = await admin.auth.admin.updateUserById(user.id, changes);
if (error) {
  console.error("\nFalló:", error.message);
  process.exit(1);
}
console.log("\nListo.");
console.log("  Correo     ", data.user.email);
console.log("  Confirmado ", data.user.email_confirmed_at ?? "NO");
