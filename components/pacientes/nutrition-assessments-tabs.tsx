"use client";

import type { ReactNode } from "react";

import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

type AssessmentTab = {
  value: string;
  label: string;
  content: ReactNode;
};

/**
 * Abas de avaliação especializada (infantil/adulto/idoso).
 * Com uma única aba visível, o conteúdo é exibido direto — sem tablist.
 */
export function NutritionAssessmentsTabs({
  generalTab,
  adultTab,
  geriatricTab,
  childTab,
  showGeneral = true,
  showAdult = true,
  showGeriatric = true,
  showChild = false,
}: {
  generalTab?: ReactNode;
  adultTab: ReactNode;
  geriatricTab: ReactNode;
  childTab?: ReactNode;
  showGeneral?: boolean;
  showAdult?: boolean;
  showGeriatric?: boolean;
  showChild?: boolean;
}) {
  const tabs: AssessmentTab[] = [];

  if (showGeneral && generalTab != null) {
    tabs.push({
      value: "general",
      label: "Informações complementares",
      content: generalTab,
    });
  }
  if (showChild && childTab != null) {
    tabs.push({
      value: "child",
      label: "Avaliação Infantil",
      content: childTab,
    });
  }
  if (showAdult && adultTab != null) {
    tabs.push({
      value: "adult",
      label: "Avaliação Adultos",
      content: adultTab,
    });
  }
  if (showGeriatric && geriatricTab != null) {
    tabs.push({
      value: "geriatric",
      label: "Avaliação para Idosos",
      content: geriatricTab,
    });
  }

  if (tabs.length === 0) return null;
  if (tabs.length === 1) return <>{tabs[0].content}</>;

  return (
    <Tabs defaultValue={tabs[0].value} className="space-y-5">
      <div className="rounded-2xl border border-border/60 bg-card/90 p-1.5 shadow-sm sm:p-2">
        <TabsList className="flex h-auto min-h-10 w-full flex-wrap gap-1 bg-transparent p-0">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {tabs.map((tab) => (
        <TabsContent key={tab.value} value={tab.value} className="mt-0">
          {tab.content}
        </TabsContent>
      ))}
    </Tabs>
  );
}
