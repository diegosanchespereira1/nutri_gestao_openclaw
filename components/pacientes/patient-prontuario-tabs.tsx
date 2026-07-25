"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Activity, ClipboardList, UserCircle } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export type PatientPageTab = "indicadores" | "dados" | "avaliacao";

function resolveDefaultTab(raw: string | null): PatientPageTab {
  if (raw === "dados" || raw === "avaliacao" || raw === "indicadores") return raw;
  return "indicadores";
}

export function PatientProntuarioTabs({
  indicadoresTab,
  dadosTab,
  avaliacaoTab,
}: {
  indicadoresTab: ReactNode;
  dadosTab: ReactNode;
  avaliacaoTab: ReactNode;
}) {
  const searchParams = useSearchParams();
  const defaultTab = resolveDefaultTab(searchParams.get("tab"));

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList
        className="flex h-auto min-h-10 w-full flex-wrap gap-1 sm:w-auto"
        aria-label="Seções do prontuário"
      >
        <TabsTrigger value="indicadores" className="shrink-0">
          <Activity className="size-4 opacity-70" aria-hidden />
          Indicadores
        </TabsTrigger>
        <TabsTrigger value="dados" className="shrink-0">
          <UserCircle className="size-4 opacity-70" aria-hidden />
          Dados do paciente
        </TabsTrigger>
        <TabsTrigger value="avaliacao" className="shrink-0">
          <ClipboardList className="size-4 opacity-70" aria-hidden />
          Avaliação
        </TabsTrigger>
      </TabsList>

      <TabsContent value="indicadores" className="space-y-4">
        {indicadoresTab}
      </TabsContent>
      <TabsContent value="dados" className="space-y-4">
        {dadosTab}
      </TabsContent>
      <TabsContent value="avaliacao" className="space-y-4">
        {avaliacaoTab}
      </TabsContent>
    </Tabs>
  );
}
