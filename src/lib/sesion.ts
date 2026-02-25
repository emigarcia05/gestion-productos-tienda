import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";
import type { Rol } from "./permisos";

export interface SesionData {
  rol: Rol;
}

// En producción SESSION_SECRET debe estar definido en .env (mín. 32 caracteres).
// En desarrollo, si no existe, se usa un valor por defecto para evitar "Missing password".
const SESSION_PASSWORD =
  process.env.SESSION_SECRET ||
  (process.env.NODE_ENV === "production"
    ? ""
    : "dev-secret-min-32-chars-para-iron-session");

if (!SESSION_PASSWORD || SESSION_PASSWORD.length < 32) {
  throw new Error(
    "SESSION_SECRET no configurado o demasiado corto. Añade SESSION_SECRET en .env con al menos 32 caracteres. " +
      "Puedes copiar .env.example a .env y editar SESSION_SECRET."
  );
}

const SESSION_OPTIONS = {
  password: SESSION_PASSWORD,
  cookieName: "gestion-rol",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8, // 8 horas
  },
};

export async function getSesion(): Promise<IronSession<SesionData>> {
  const cookieStore = await cookies();
  return getIronSession<SesionData>(cookieStore, SESSION_OPTIONS);
}

export async function getRol(): Promise<Rol> {
  const sesion = await getSesion();
  return sesion.rol ?? "simple";
}

export async function esEditor(): Promise<boolean> {
  return (await getRol()) === "editor";
}
