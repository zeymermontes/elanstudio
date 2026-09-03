import pkg from "../../package.json";

/**
 * Qué versión del sitio está viendo esta persona.
 *
 * Cuando alguien reporta que ve una hora vieja o un texto que ya arreglamos, lo
 * primero que hay que saber es si su navegador está sirviendo el build nuevo o
 * uno anterior. Sin esto solo se puede adivinar: se le pide que mire el pie de
 * página y se compara con el número publicado.
 *
 * Para que ese número sirva tiene que subir en cada publicación, así que no se
 * toca a mano: lo sube `npm run publicar` (scripts/publicar.sh) justo antes de
 * empujar a main, que es lo que dispara el deploy en Render.
 */
export const APP_VERSION = pkg.version;
