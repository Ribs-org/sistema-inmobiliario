import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import ProveedorAuth from "@/components/ProveedorAuth";

// Tipografías de Broker Capital: Playfair Display para títulos e Inter para la interfaz.
const bricolage = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plex = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Pyxis · Proyectos y Metro de Santiago",
  description:
    "Mapa de proyectos inmobiliarios en Santiago con la red de Metro actual y futura, y simulador de crédito hipotecario en UF y pesos.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${bricolage.variable} ${plex.variable} h-full antialiased`}>
      <body className="h-full">
        <ProveedorAuth>{children}</ProveedorAuth>
      </body>
    </html>
  );
}
