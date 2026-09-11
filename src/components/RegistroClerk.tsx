"use client";

import { SignUp } from "@clerk/nextjs";

export default function RegistroClerk() {
  return <SignUp routing="hash" fallbackRedirectUrl="/interno" signInUrl="/ingresar" />;
}
