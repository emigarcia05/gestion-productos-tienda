import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  SESION_APP_BOOT_COOKIE,
  SESION_FORZAR_ROL_SIMPLE_HEADER,
  SESION_ROL_IRON_COOKIE,
} from "@/lib/sesion-arranque";

export function middleware(request: NextRequest) {
  const hasBoot = request.cookies.has(SESION_APP_BOOT_COOKIE);
  const hadRolCookie = request.cookies.has(SESION_ROL_IRON_COOKIE);

  const requestHeaders = new Headers(request.headers);
  if (!hasBoot && hadRolCookie) {
    requestHeaders.set(SESION_FORZAR_ROL_SIMPLE_HEADER, "1");
  }

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });

  if (!hasBoot) {
    res.cookies.set(SESION_APP_BOOT_COOKIE, "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    if (hadRolCookie) {
      res.cookies.delete(SESION_ROL_IRON_COOKIE);
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
