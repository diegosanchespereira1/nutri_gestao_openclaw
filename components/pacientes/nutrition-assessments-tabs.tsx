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
  childTab,
  showAdultTabs = true,
  showChildTab = false,
}: {
  generalTab: ReactNode;
  adultTab: ReactNode;
  geriatricTab: ReactNode;
  childTab?: ReactNode;
  showAdultTabs?: boolean;
  showChildTab?: boolean;
}) {
  const showChild = showChildTab && childTab != null;

  return (
    <Tabs defaultValue={showChild ? "child" : "general"}>
      <TabsList className="flex h-auto min-h-10 w-full flex-wrap gap-1">
        <TabsTrigger value="general">Avaliação Geral</TabsTrigger>
        {showChild && <TabsTrigger value="child">Avaliação Infantil</TabsTrigger>}
        {showAdultTabs && (
          <TabsTrigger value="adult">Avaliação Adultos</TabsTrigger>
        )}
        {showAdultTabs && (
          <TabsTrigger value="geriatric">Avaliação para Idosos</TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="general">{generalTab}</TabsContent>
      {showChild && <TabsContent value="child">{childTab}</TabsContent>}
      {showAdultTabs && <TabsContent value="adult">{adultTab}</TabsContent>}
      {showAdultTabs && <TabsContent value="geriatric">{geriatricTab}</TabsContent>}
    </Tabs>
  );
}
