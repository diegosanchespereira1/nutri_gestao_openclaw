import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

function LoginFallback() {
  return <p className="text-muted-foreground text-sm">A carregar…</p>;
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
