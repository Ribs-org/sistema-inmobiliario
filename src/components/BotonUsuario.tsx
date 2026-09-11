"use client";

// Avatar y menú de la cuenta (solo con Clerk activo).

import { UserButton } from "@clerk/nextjs";

export default function BotonUsuario() {
  return <UserButton appearance={{ elements: { avatarBox: "h-7 w-7" } }} />;
}
