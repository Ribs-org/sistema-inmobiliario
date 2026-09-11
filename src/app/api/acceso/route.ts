import { NextResponse, type NextRequest } from "next/server";
import { claveCorrecta, COOKIE_SESION, DIAS_SESION, tokenSesion, usaClavePorDefecto } from "@/lib/acceso";
import { clerkActivo, obtenerSesion } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const s = await obtenerSesion(req);
  return NextResponse.json({
    autorizado: !!s,
    sesion: s,
    clerk: clerkActivo(),
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
