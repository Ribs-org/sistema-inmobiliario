// Envuelve la app con Clerk solo si está configurado; sin llaves, la app sigue con la clave de equipo.

import type { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";

// Textos propios sobre la traducción al español de Clerk.
const localizacion = {
  ...esES,
  signIn: {
    ...esES.signIn,
    start: {
      ...esES.signIn?.start,
      title: "Entrar a Pyxis",
      subtitle: "Área interna del equipo comercial",
    },
  },
  signUp: {
    ...esES.signUp,
    start: {
      ...esES.signUp?.start,
      title: "Crear tu cuenta en Pyxis",
      subtitle: "Para brokers del equipo comercial",
    },
  },
};

export default function ProveedorAuth({ children }: { children: ReactNode }) {
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) return <>{children}</>;
  return (
    <ClerkProvider
      localization={localizacion}
      // Rutas propias: sin esto los enlaces internos de Clerk apuntan a /sign-in y /sign-up,
      // que no existen, y el botón de registro parece no hacer nada.
      signInUrl="/ingresar"
      signUpUrl="/registrarse"
      appearance={{
        variables: { colorPrimary: "#b1921a", borderRadius: "0.5rem" },
        elements: { footerActionLink: "text-accent" },
      }}
    >
      {children}
    </ClerkProvider>
  );
}
