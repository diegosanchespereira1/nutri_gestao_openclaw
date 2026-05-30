import {
  BookOpen,
  Circle,
  ClipboardCheck,
  FileSearch,
  Heart,
  RotateCcw,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { VisitKind } from "@/lib/types/visits";

export const visitKindIcon: Record<VisitKind, LucideIcon> = {
  patient_care: Heart,
  technical_compliance: ClipboardCheck,
  follow_up: RotateCcw,
  audit: FileSearch,
  training: BookOpen,
  other: Circle,
};

/** Borda esquerda + fundo suave para blocos na grelha da agenda. */
export const visitKindBlockStyle: Record<VisitKind, string> = {
  patient_care: "border-l-teal-600 bg-teal-500/[0.08]",
  technical_compliance: "border-l-blue-600 bg-blue-500/[0.08]",
  follow_up: "border-l-violet-600 bg-violet-500/[0.08]",
  audit: "border-l-amber-600 bg-amber-500/[0.10]",
  training: "border-l-green-600 bg-green-500/[0.08]",
  other: "border-l-slate-500 bg-slate-500/[0.07]",
};

/** Cor do ícone dentro do bloco. */
export const visitKindIconColor: Record<VisitKind, string> = {
  patient_care: "text-teal-600 dark:text-teal-400",
  technical_compliance: "text-blue-600 dark:text-blue-400",
  follow_up: "text-violet-600 dark:text-violet-400",
  audit: "text-amber-600 dark:text-amber-400",
  training: "text-green-600 dark:text-green-400",
  other: "text-slate-500 dark:text-slate-400",
};
