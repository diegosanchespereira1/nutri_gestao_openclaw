/**
 * Módulos ainda em validação: visíveis no menu como "Em breve",
 * acessíveis só pela equipe interna de preview.
 */

const PREVIEW_USER_IDS = new Set([
  "633db554-b037-4e40-8c4f-575337dbfded", // Diego Sanches
  "904a0dd8-09de-44c0-b4c9-053ef0fabb37", // Carina Xavier
  "07872ebe-b388-4918-8e04-90aed160e1bf", // Vinicius Xavier
]);

const PREVIEW_EMAILS = new Set([
  "diegosanchespereira@gmail.com",
  "carinacr.xavier@gmail.com",
  "carina@sabernutrir.com.br",
  "adm@sabernutrir.com.br",
]);

const PREVIEW_HANDLES = ["diegosanchespereira", "carina", "vinicius"] as const;

export const COMING_SOON_PATH_PREFIXES = [
  "/pops",
  "/ficha-tecnica",
  "/materias-primas",
  "/importar/materias-primas",
  "/api/ficha-tecnica",
] as const;

export type ComingSoonActor = {
  userId?: string | null;
  email?: string | null;
  fullName?: string | null;
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

export function canAccessComingSoonModules(actor: ComingSoonActor): boolean {
  const userId = actor.userId?.trim();
  if (userId && PREVIEW_USER_IDS.has(userId)) return true;

  const email = actor.email ? normalize(actor.email) : "";
  if (email && PREVIEW_EMAILS.has(email)) return true;

  const localPart = email.includes("@") ? (email.split("@")[0] ?? "") : email;
  const fullName = actor.fullName ? normalize(actor.fullName) : "";

  return PREVIEW_HANDLES.some(
    (handle) => localPart.includes(handle) || fullName.includes(handle),
  );
}

export function isComingSoonPath(pathname: string): boolean {
  return COMING_SOON_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
