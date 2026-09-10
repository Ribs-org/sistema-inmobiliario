// Subida y borrado de imágenes (fotos de proyecto y planos) en Vercel Blob. Solo con sesión interna.

import { del, put } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, sesionValida } from "@/lib/acceso";
import { urlImagen } from "@/lib/proyectos-store";

export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;
const TIPOS = ["image/jpeg", "image/png", "image/webp", "image/avif", "application/pdf"];

const autorizado = (req: NextRequest) => sesionValida(req.cookies.get(COOKIE_SESION)?.value);
const slugCarpeta = (s: string) => s.replace(/[^a-z0-9/_-]/gi, "").slice(0, 120) || "varios";

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "Necesitas la clave interna" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Almacenamiento de imágenes no configurado" }, { status: 503 });
  }
  const form = await req.formData().catch(() => null);
  const archivo = form?.get("archivo");
  const carpeta = slugCarpeta(String(form?.get("carpeta") ?? "varios"));
  if (!(archivo instanceof File)) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  if (!TIPOS.includes(archivo.type)) {
    return NextResponse.json(
      { error: "Formato no admitido: usa JPG, PNG, WebP, AVIF o PDF" },
      { status: 415 },
    );
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera los 8 MB" }, { status: 413 });
  }
  const nombre = archivo.name.replace(/[^\w.-]+/g, "-").slice(0, 80) || "archivo";
  const blob = await put(`${carpeta}/${nombre}`, archivo, {
    access: "public",
    addRandomSuffix: true,
    contentType: archivo.type,
  });
  return NextResponse.json({ url: blob.url, tipo: archivo.type });
}

export async function DELETE(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "Necesitas la clave interna" }, { status: 401 });
  const url = urlImagen(req.nextUrl.searchParams.get("url"));
  if (!url) return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  await del(url);
  return NextResponse.json({ ok: true });
}
