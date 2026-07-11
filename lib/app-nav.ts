import type { LucideIcon } from "lucide-react";
import {
  Calendar,
  CircleUserRound,
  ClipboardCheck,
  Ellipsis,
  HeartPulse,
  LayoutDashboard,
  Package,
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
import { APP_DASHBOARD_PATH } from "@/lib/routes";

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
      { href: APP_DASHBOARD_PATH, label: "Dashboard", icon: LayoutDashboard },
      { href: "/clientes",   label: "Clientes",    icon: UserCircle2 },
      { href: "/equipe",     label: "Equipe",       icon: Users },
      {
        href: "/visitas",
        label: "Visitas",
        icon: Calendar,
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
      { href: "/checklists",      label: "Checklists",      icon: ClipboardCheck },
      { href: "/pops",            label: "POPs",             icon: Soup },
      { href: "/ficha-tecnica",   label: "Ficha técnica",   icon: UtensilsCrossed },
      { href: "/materias-primas", label: "Matérias-primas", icon: Package },
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

/** Rotas fixas da barra inferior mobile (ordem de exibição). */
export const mobileBottomNavHrefs = [
  APP_DASHBOARD_PATH,
  "/visitas",
  "/checklists",
  "/perfil",
] as const;

export type MobileBottomNavHref = (typeof mobileBottomNavHrefs)[number];

export const mobileMoreNavItem = {
  label: "Mais",
  icon: Ellipsis,
} as const;

/** Resolve o módulo que controla um item de navegação. */
export function resolveNavItemModuleGate(
  item: AppNavItem,
  group: AppNavGroup,
): EnabledModuleKey | null {
  return item.moduleItemGate ?? group.moduleGate ?? null;
}

export function isNavItemActive(pathname: string, href: string): boolean {
  return (
    pathname === href ||
    (href !== APP_DASHBOARD_PATH && pathname.startsWith(`${href}/`))
  );
}

/** Mantém todos os grupos/itens visíveis; o gate só afeta o clique. */
export function buildVisibleNavGroups(showAdminNav: boolean): AppNavGroup[] {
  const filtered = appNavGroups.filter((group) => group.items.length > 0);

  if (showAdminNav) {
    const sistemaIdx = filtered.findIndex((g) => g.label === "Sistema");
    const adminGroup: AppNavGroup = {
      label: "Sistema",
      items: [adminNavItem],
    };
    if (sistemaIdx >= 0) {
      return filtered.map((g, i) =>
        i === sistemaIdx
          ? { ...g, items: [...g.items, adminNavItem] }
          : g,
      );
    }
    return [...filtered, adminGroup];
  }

  return filtered;
}

export type NavItemRef = {
  item: AppNavItem;
  group: AppNavGroup;
};

export function flattenNavGroups(groups: AppNavGroup[]): NavItemRef[] {
  return groups.flatMap((group) =>
    group.items.map((item) => ({ item, group })),
  );
}

export function splitMobileNavItems(groups: AppNavGroup[]): {
  primary: NavItemRef[];
  overflow: NavItemRef[];
} {
  const all = flattenNavGroups(groups);
  const primarySet = new Set<string>(mobileBottomNavHrefs);

  const primary = mobileBottomNavHrefs
    .map((href) => all.find(({ item }) => item.href === href))
    .filter((entry): entry is NavItemRef => entry != null);

  const overflow = all.filter(({ item }) => !primarySet.has(item.href));

  return { primary, overflow };
}

/**
 * Lista plana de todos os itens (sem admin) — mantida para retrocompatibilidade
 * com código que importa appNavItems diretamente.
 * @deprecated Prefira appNavGroups para renderização agrupada.
 */
export const appNavItems: AppNavItem[] = appNavGroups.flatMap((g) => g.items);
