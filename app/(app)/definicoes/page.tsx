import Link from "next/link";
import { Building2, ChevronRight, Globe, Lock, UserCircle } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";

const settingsItems = [
  {
    href: "/perfil",
    icon: UserCircle,
    label: "Perfil profissional e CRN",
    description: "Nome, CRN e dados de identificação usados em documentos.",
  },
  {
    href: "/definicoes/empresa",
    icon: Building2,
    label: "Empresa e logotipo",
    description:
      "Logotipo usado nos PDFs, e-mails e comunicações da sua empresa.",
  },
  {
    href: "/definicoes/regiao",
    icon: Globe,
    label: "Região e fuso horário",
    description: "Configure o fuso horário para visitas e calendário.",
  },
  {
    href: "/definicoes/seguranca",
    icon: Lock,
    label: "Segurança e 2FA",
    description: "Autenticação em dois fatores e gestão de senha.",
  },
];

export default function DefinicoesPage() {
  return (
    <PageLayout variant="form">
      <PageHeader
        title="Definições"
        description="Configure o seu perfil, região e preferências de segurança."
      />

      <ul className="divide-border divide-y overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        {settingsItems.map(({ href, icon: Icon, label, description }) => (
          <li key={href}>
            <Link
              href={href}
              className="hover:bg-muted/50 focus-visible:ring-ring flex items-center gap-4 px-5 py-4 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <div className="bg-primary/10 flex size-10 shrink-0 items-center justify-center rounded-lg">
                <Icon className="text-primary size-5" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-foreground text-sm font-medium">{label}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {description}
                </p>
              </div>
              <ChevronRight
                className="text-muted-foreground size-4 shrink-0"
                aria-hidden
              />
            </Link>
          </li>
        ))}
      </ul>
    </PageLayout>
  );
}
