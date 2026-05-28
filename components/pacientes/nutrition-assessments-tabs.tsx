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
  showAdultTabs = true,
}: {
  generalTab: ReactNode;
  adultTab: ReactNode;
  geriatricTab: ReactNode;
  showAdultTabs?: boolean;
}) {
  return (
    <Tabs defaultValue="general">
      <TabsList className="flex h-auto min-h-10 w-full flex-wrap gap-1">
        <TabsTrigger value="general">Avaliação Geral</TabsTrigger>
        {showAdultTabs && (
          <TabsTrigger value="adult">Avaliação Adultos</TabsTrigger>
        )}
        {showAdultTabs && (
          <TabsTrigger value="geriatric">Avaliação para Idosos</TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="general">{generalTab}</TabsContent>
      {showAdultTabs && <TabsContent value="adult">{adultTab}</TabsContent>}
      {showAdultTabs && <TabsContent value="geriatric">{geriatricTab}</TabsContent>}
    </Tabs>
  );
}
