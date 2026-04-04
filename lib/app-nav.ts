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
} from "lucide-react";

export type AppNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

/** Navegação principal da área logada (MVP — rotas placeholder até módulos existirem). */
export const appNavItems: AppNavItem[] = [
  { href: "/inicio", label: "Início", icon: LayoutDashboard },
  { href: "/clientes", label: "Clientes", icon: UserCircle2 },
  { href: "/pacientes", label: "Pacientes", icon: HeartPulse },
  { href: "/visitas", label: "Visitas", icon: ClipboardList },
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/checklists", label: "Checklists", icon: ClipboardCheck },
  { href: "/ficha-tecnica", label: "Ficha técnica", icon: UtensilsCrossed },
  { href: "/pops", label: "POPs", icon: Soup },
  { href: "/importar", label: "Importar", icon: Upload },
  { href: "/perfil", label: "Perfil", icon: CircleUserRound },
  { href: "/definicoes", label: "Definições", icon: Settings },
];

/** Só para utilizadores com papel admin ou super_admin. */
export const adminNavItem: AppNavItem = {
  href: "/admin",
  label: "Administração",
  icon: Shield,
};
