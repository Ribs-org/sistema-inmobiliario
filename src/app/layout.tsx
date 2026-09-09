import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, IBM_Plex_Sans } from "next/font/google";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plex = IBM_Plex_Sans({
  variable: "--font-plex",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Pyxis · Proyectos y Metro de Santiago",
  description:
    "Mapa de proyectos inmobiliarios en Santiago con la red de Metro actual y futura, y simulador de crédito hipotecario en UF y pesos.",
};

export const viewport: Viewport = {
  themeColor: "#1b2430",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${bricolage.variable} ${plex.variable} h-full antialiased`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
