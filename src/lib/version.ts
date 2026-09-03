import pkg from "../../package.json";

/**
 * Qué versión del sitio está viendo esta persona.
 *
 * Cuando alguien reporta que ve una hora vieja o un texto que ya arreglamos, lo
 * primero que hay que saber es si su navegador está sirviendo el build nuevo o
 * uno anterior. Sin esto solo se puede adivinar.
 *
 * Son dos datos porque cada uno sirve para algo distinto: el número de versión
 * (package.json) se sube a mano y es el que se le pide a una alumna por
 * teléfono; el commit lo pone Render solo en cada deploy, así que identifica el
 * build exacto aunque se nos olvide subir el número. En local no hay commit.
 */
export const APP_VERSION = pkg.version;

export const BUILD_COMMIT = process.env.RENDER_GIT_COMMIT?.slice(0, 7) || "local";

/** Semver con metadatos de build: "1.0.0+a1b2c3d". */
export const BUILD_VERSION = `${APP_VERSION}+${BUILD_COMMIT}`;
