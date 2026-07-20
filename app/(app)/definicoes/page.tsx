import Link from "next/link";
import {
  Building2,
  CalendarClock,
  Camera,
  Globe,
  Lock,
  Store,
  Tag,
  UserCircle,
} from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { PageLayout } from "@/components/layout/page-layout";
import {
  buildCurrentUrl,
  withReturnTo,
} from "@/lib/navigation/return-to";
import { cn } from "@/lib/utils";

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
    href: "/definicoes/agenda",
    icon: CalendarClock,
    label: "Agenda",
    description: "Hora de início da grelha semanal de visitas.",
  },
  {
    href: "/definicoes/checklist-fotos",
    icon: Camera,
    label: "Checklist e fotos",
    description:
      "Localização opcional nas fotos de evidência (guardado neste dispositivo).",
  },
  {
    href: "/definicoes/categorias",
    icon: Tag,
    label: "Categorias de negócio",
    description: "Edite ou elimine categorias personalizadas criadas pela sua equipa.",
  },
  {
    href: "/definicoes/tipos-estabelecimento",
    icon: Store,
    label: "Tipos de estabelecimento",
    description:
      "Crie tipos personalizados por categoria (Atendimento ou Assessoria).",
  },
  {
    href: "/definicoes/seguranca",
    icon: Lock,
    label: "Segurança e 2FA",
    description: "Autenticação em dois fatores e gestão de senha.",
  },
] as const;

export default async function DefinicoesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const returnToOrigin = buildCurrentUrl("/definicoes", sp);

  return (
    <PageLayout>
      <PageHeader
        title="Definições"
        description="Configure o seu perfil, região e preferências de segurança."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {settingsItems.map(({ href, icon: Icon, label, description }) => (
          <Link
            key={href}
            href={withReturnTo(href, returnToOrigin)}
            className={cn(
              "bg-card flex flex-col rounded-xl border border-border p-5 shadow-sm",
              "transition-colors hover:bg-muted/40",
              "focus-visible:ring-ring focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
            )}
          >
            <div className="bg-primary/10 mb-4 flex size-10 shrink-0 items-center justify-center rounded-lg">
              <Icon className="text-primary size-5" aria-hidden />
            </div>
            <h2 className="text-foreground mb-1 text-sm font-semibold">
              {label}
            </h2>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {description}
            </p>
          </Link>
        ))}
      </div>
    </PageLayout>
  );
}
