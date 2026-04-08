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
  geriatricTab,
}: {
  generalTab: ReactNode;
  geriatricTab: ReactNode;
}) {
  return (
    <Tabs defaultValue="general">
      <TabsList>
        <TabsTrigger value="general">Avaliação Geral</TabsTrigger>
        <TabsTrigger value="geriatric">Avaliação para Idosos</TabsTrigger>
      </TabsList>

      <TabsContent value="general">{generalTab}</TabsContent>
      <TabsContent value="geriatric">{geriatricTab}</TabsContent>
    </Tabs>
  );
}
