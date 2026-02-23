import { getIronSession, IronSession } from "iron-session";
import { cookies } from "next/headers";
import type { Rol } from "./permisos";

export interface SesionData {
  rol: Rol;
}

const SESSION_OPTIONS = {
  password: process.env.SESSION_SECRET as string,
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
