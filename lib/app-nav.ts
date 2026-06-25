import type { LucideIcon } from "lucide-react";
import {
  CircleUserRound,
  ClipboardCheck,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  Settings,
  Shield,
  Soup,
  Upload,
  UserCircle2,
  Users,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";

import type { EnabledModuleKey, ModuleContext } from "@/lib/types/modules";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Item só aparece quando a chave em `enabled_modules` estiver ativa. */
  moduleItemGate?: EnabledModuleKey;
};

export type AppNavGroup = {
  /** Label do grupo exibido na sidebar como separador. */
  label: string;
  /** Se definido, o grupo só aparece quando o módulo estiver habilitado. */
  moduleGate?: ModuleContext;
  items: AppNavItem[];
};

/** Grupos de navegação principais (área logada). */
export const appNavGroups: AppNavGroup[] = [
  {
    label: "Geral",
    items: [
      { href: "/inicio",     label: "Início",      icon: LayoutDashboard },
      { href: "/clientes",   label: "Clientes",    icon: UserCircle2 },
      { href: "/equipe",     label: "Equipe",       icon: Users },
      {
        href: "/visitas",
        label: "Visitas",
        icon: ClipboardList,
        moduleItemGate: "visitas",
      },
      {
        href: "/financeiro",
        label: "Financeiro",
        icon: Wallet,
        moduleItemGate: "financeiro",
      },
    ],
  },
  {
    label: "Atendimento Nutricional",
    moduleGate: "atendimento_nutricional",
    items: [
      { href: "/pacientes", label: "Pacientes", icon: HeartPulse },
    ],
  },
  {
    label: "Assessoria Alimentar",
    moduleGate: "assessoria_alimentacao",
    items: [
      { href: "/checklists",    label: "Checklists",    icon: ClipboardCheck },
      { href: "/pops",          label: "POPs",           icon: Soup },
      { href: "/ficha-tecnica", label: "Ficha técnica", icon: UtensilsCrossed },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/perfil",     label: "Perfil",      icon: CircleUserRound },
      { href: "/definicoes", label: "Definições",  icon: Settings },
      { href: "/importar",   label: "Importar",    icon: Upload },
    ],
  },
];

/** Item de admin — adicionado no final quando o utilizador tem papel admin/super_admin. */
export const adminNavItem: AppNavItem = {
  href: "/admin",
  label: "Administração",
  icon: Shield,
};

/**
 * Lista plana de todos os itens (sem admin) — mantida para retrocompatibilidade
 * com código que importa appNavItems diretamente.
 * @deprecated Prefira appNavGroups para renderização agrupada.
 */
export const appNavItems: AppNavItem[] = appNavGroups.flatMap((g) => g.items);
