"use client";

import type { ReactNode } from "react";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

/**
 * Abas de avaliação. Cada avaliação especializada (infantil/adulto/idoso) é
 * exibida conforme a faixa etária do paciente — não se mostra a aba de adulto
 * para uma criança/idoso e vice-versa. A "Avaliação Geral" é sempre exibida.
 */
export function NutritionAssessmentsTabs({
  generalTab,
  adultTab,
  geriatricTab,
  childTab,
  showAdult = true,
  showGeriatric = true,
  showChild = false,
}: {
  generalTab: ReactNode;
  adultTab: ReactNode;
  geriatricTab: ReactNode;
  childTab?: ReactNode;
  showAdult?: boolean;
  showGeriatric?: boolean;
  showChild?: boolean;
}) {
  const childVisible = showChild && childTab != null;
  const adultVisible = showAdult && adultTab != null;
  const geriatricVisible = showGeriatric && geriatricTab != null;

  const defaultValue = childVisible
    ? "child"
    : adultVisible
      ? "adult"
      : geriatricVisible
        ? "geriatric"
        : "general";

  return (
    <Tabs defaultValue={defaultValue}>
      <TabsList className="flex h-auto min-h-10 w-full flex-wrap gap-1">
        <TabsTrigger value="general">Avaliação Geral</TabsTrigger>
        {childVisible && <TabsTrigger value="child">Avaliação Infantil</TabsTrigger>}
        {adultVisible && <TabsTrigger value="adult">Avaliação Adultos</TabsTrigger>}
        {geriatricVisible && (
          <TabsTrigger value="geriatric">Avaliação para Idosos</TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="general">{generalTab}</TabsContent>
      {childVisible && <TabsContent value="child">{childTab}</TabsContent>}
      {adultVisible && <TabsContent value="adult">{adultTab}</TabsContent>}
      {geriatricVisible && (
        <TabsContent value="geriatric">{geriatricTab}</TabsContent>
      )}
    </Tabs>
  );
}
