import Link from "next/link";

import { MfaSettings } from "@/components/mfa-settings";

export default function SegurancaPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">
          <Link
            href="/definicoes"
            className="text-primary underline-offset-4 hover:underline"
          >
            ← Definições
          </Link>
        </p>
        <h1 className="text-foreground mt-2 text-2xl font-semibold tracking-tight">
          Segurança
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gestão de autenticação em dois fatores (TOTP).
        </p>
      </div>
      <MfaSettings />
    </div>
  );
}
