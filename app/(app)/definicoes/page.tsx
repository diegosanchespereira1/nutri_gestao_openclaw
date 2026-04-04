import Link from "next/link";

export default function DefinicoesPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-foreground text-2xl font-semibold tracking-tight">
        Definições
      </h1>
      <ul className="text-foreground max-w-md space-y-3 text-sm">
        <li>
          <Link
            href="/perfil"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Perfil profissional e CRN
          </Link>
        </li>
        <li>
          <Link
            href="/definicoes/regiao"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Região e fuso horário
          </Link>
        </li>
        <li>
          <Link
            href="/definicoes/seguranca"
            className="text-primary font-medium underline-offset-4 hover:underline"
          >
            Segurança e 2FA
          </Link>
        </li>
      </ul>
    </div>
  );
}
