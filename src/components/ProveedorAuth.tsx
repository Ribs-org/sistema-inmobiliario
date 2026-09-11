// Envuelve la app con Clerk solo si está configurado; sin llaves, la app sigue con la clave de equipo.

import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";

export default function ProveedorAuth({ children }: { children: ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <>{children}</>;
  return (
    <ClerkProvider localization={{ locale: "es-ES" }} appearance={{ variables: { colorPrimary: "#d4af37" } }}>
      {children}
    </ClerkProvider>
  );
}
