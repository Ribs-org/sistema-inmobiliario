// Subida y borrado de imágenes (fotos de proyecto y planos) en Vercel Blob. Solo con sesión interna.
// Las imágenes se optimizan al subir: máximo 1600 px por lado, orientación corregida y WebP.

import { del, put } from "@vercel/blob";
import { NextResponse, type NextRequest } from "next/server";
import sharp from "sharp";
import { COOKIE_SESION, sesionValida } from "@/lib/acceso";
import { urlImagen } from "@/lib/proyectos-store";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_BYTES = 12 * 1024 * 1024;
const IMAGENES = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/heic", "image/heif"];
const LADO_MAX = 1600;
const CALIDAD = 82;

const autorizado = (req: NextRequest) => sesionValida(req.cookies.get(COOKIE_SESION)?.value);
const slugCarpeta = (s: string) => s.replace(/[^a-z0-9/_-]/gi, "").slice(0, 120) || "varios";

async function optimizar(archivo: File): Promise<{ datos: Buffer; tipo: string; ext: string }> {
  const entrada = Buffer.from(await archivo.arrayBuffer());
  try {
    const datos = await sharp(entrada, { failOn: "none" })
      .rotate()
      .resize({ width: LADO_MAX, height: LADO_MAX, fit: "inside", withoutEnlargement: true })
      .webp({ quality: CALIDAD })
      .toBuffer();
    return { datos, tipo: "image/webp", ext: "webp" };
  } catch (err) {
    console.warn("No se pudo optimizar la imagen, se guarda original:", err);
    return { datos: entrada, tipo: archivo.type, ext: archivo.name.split(".").pop()?.toLowerCase() || "jpg" };
  }
}

export async function POST(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "Necesitas la clave interna" }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Almacenamiento de imágenes no configurado" }, { status: 503 });
  }
  const form = await req.formData().catch(() => null);
  const archivo = form?.get("archivo");
  const carpeta = slugCarpeta(String(form?.get("carpeta") ?? "varios"));
  if (!(archivo instanceof File)) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  const esImagen = IMAGENES.includes(archivo.type);
  const esPdf = archivo.type === "application/pdf";
  if (!esImagen && !esPdf) {
    return NextResponse.json(
      { error: "Formato no admitido: usa JPG, PNG, WebP, HEIC o PDF" },
      { status: 415 },
    );
  }
  if (archivo.size > MAX_BYTES) {
    return NextResponse.json({ error: "El archivo supera los 12 MB" }, { status: 413 });
  }
  const base =
    archivo.name
      .replace(/\.[^.]+$/, "")
      .replace(/[^\w-]+/g, "-")
      .slice(0, 60) || "archivo";
  const { datos, tipo, ext } = esImagen
    ? await optimizar(archivo)
    : { datos: Buffer.from(await archivo.arrayBuffer()), tipo: "application/pdf", ext: "pdf" };
  const blob = await put(`${carpeta}/${base}.${ext}`, datos, {
    access: "public",
    addRandomSuffix: true,
    contentType: tipo,
  });
  return NextResponse.json({ url: blob.url, tipo, bytes: datos.length, originalBytes: archivo.size });
}

export async function DELETE(req: NextRequest) {
  if (!autorizado(req)) return NextResponse.json({ error: "Necesitas la clave interna" }, { status: 401 });
  const url = urlImagen(req.nextUrl.searchParams.get("url"));
  if (!url) return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  await del(url);
  return NextResponse.json({ ok: true });
}
