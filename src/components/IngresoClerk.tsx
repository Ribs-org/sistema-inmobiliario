"use client";

import { SignIn } from "@clerk/nextjs";

export default function IngresoClerk() {
  return <SignIn routing="hash" fallbackRedirectUrl="/interno" signUpUrl="/registrarse" />;
}
