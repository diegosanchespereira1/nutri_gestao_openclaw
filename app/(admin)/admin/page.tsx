// Epic 10 — Administração da plataforma — hub de navegação
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const adminSections = [
  {
    href: "/admin/tenants",
    title: "Gestão de tenants",
    description: "Listar, suspender, cockpit e alterar plano de profissionais.",
    emoji: "🏢",
  },
  {
    href: "/admin/tenants/novo",
    title: "Criar tenant",
    description: "Criar conta de profissional directamente pelo admin.",
    emoji: "➕",
  },
  {
    href: "/admin/degustacao",
    title: "Features de degustação",
    description: "Configurar features activas para novos utilizadores self-service.",
    emoji: "🧪",
  },
  {
    href: "/admin/planos",
    title: "Planos e limites",
    description: "Configuração de planos, limites e feature flags.",
    emoji: "💳",
  },
  {
    href: "/admin/metricas",
    title: "Métricas da plataforma",
    description: "MRR, tenants, conversão e dados agregados.",
    emoji: "📊",
  },
  {
    href: "/admin/catalogo-taco",
    title: "Catálogo TACO",
    description: "Gerir alimentos da tabela TACO compartilhada.",
    emoji: "🥦",
  },
  {
    href: "/admin/checklists",
    title: "Checklists regulatórios",
    description: "CRUD e versionamento de checklists de portaria.",
    emoji: "📋",
  },
];

export default function AdminHomePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Área de administração
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Acessível apenas a contas com papel{" "}
          <strong className="text-foreground">admin</strong> ou{" "}
          <strong className="text-foreground">super_admin</strong>.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {adminSections.map((s) => (
          <Link key={s.href} href={s.href} className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
            <Card className="h-full hover:bg-muted/40 transition-colors cursor-pointer">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <span aria-hidden>{s.emoji}</span>
                  {s.title}
                </CardTitle>
                <CardDescription className="text-xs">
                  {s.description}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      <div className="border-border rounded-lg border p-4 text-sm">
        <p className="text-muted-foreground text-xs">
          Para promover um utilizador a admin, use o Supabase SQL Editor:
        </p>
        <code className="bg-muted mt-1 block break-all rounded px-2 py-1.5 text-xs">
          update public.profiles set role = &apos;super_admin&apos; where id = &apos;USER_UUID&apos;;
        </code>
      </div>

      <Link
        href="/inicio"
        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
      >
        ← Voltar à aplicação
      </Link>
    </div>
  );
}
