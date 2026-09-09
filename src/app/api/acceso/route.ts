import { NextResponse, type NextRequest } from "next/server";
import {
  claveCorrecta,
  COOKIE_SESION,
  DIAS_SESION,
  sesionValida,
  tokenSesion,
  usaClavePorDefecto,
} from "@/lib/acceso";

export async function GET(req: NextRequest) {
  return NextResponse.json({
    autorizado: sesionValida(req.cookies.get(COOKIE_SESION)?.value),
    clavePorDefecto: usaClavePorDefecto(),
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { clave?: string };
  if (!body.clave || !claveCorrecta(body.clave)) {
    return NextResponse.json({ autorizado: false, error: "Clave incorrecta" }, { status: 401 });
  }
  const res = NextResponse.json({ autorizado: true });
  res.cookies.set(COOKIE_SESION, tokenSesion(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DIAS_SESION * 24 * 60 * 60,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ autorizado: false });
  res.cookies.set(COOKIE_SESION, "", { path: "/", maxAge: 0 });
  return res;
}
