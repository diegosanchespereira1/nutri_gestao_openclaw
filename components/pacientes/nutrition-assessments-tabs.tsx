"use client";

import type { ReactNode } from "react";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

export function NutritionAssessmentsTabs({
  generalTab,
  adultTab,
  geriatricTab,
}: {
  generalTab: ReactNode;
  adultTab: ReactNode;
  geriatricTab: ReactNode;
}) {
  return (
    <Tabs defaultValue="general">
      <TabsList className="flex h-auto min-h-10 w-full flex-wrap gap-1">
        <TabsTrigger value="general">Avaliação Geral</TabsTrigger>
        <TabsTrigger value="adult">Avaliação Adultos</TabsTrigger>
        <TabsTrigger value="geriatric">Avaliação para Idosos</TabsTrigger>
      </TabsList>

      <TabsContent value="general">{generalTab}</TabsContent>
      <TabsContent value="adult">{adultTab}</TabsContent>
      <TabsContent value="geriatric">{geriatricTab}</TabsContent>
    </Tabs>
  );
}
