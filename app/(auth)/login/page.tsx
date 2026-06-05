import { Suspense } from "react";

import { LoginForm } from "@/components/auth/login-form";

function LoginFallback() {
  return (
    <div style={{ padding: '24px 0', textAlign: 'center' }}>
      <p style={{ fontSize: '14px', color: '#8FA8A5', margin: 0 }}>A carregar…</p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  );
}
