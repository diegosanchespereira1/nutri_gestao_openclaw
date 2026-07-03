"use client";

import type { ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { ClipboardList, UserCircle } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

export function PatientProntuarioTabs({
  dadosTab,
  avaliacaoTab,
}: {
  dadosTab: ReactNode;
  avaliacaoTab: ReactNode;
}) {
  const searchParams = useSearchParams();
  const defaultTab =
    searchParams.get("tab") === "avaliacao" ? "avaliacao" : "dados";

  return (
    <Tabs defaultValue={defaultTab}>
      <TabsList
        className="flex h-auto min-h-10 w-full flex-wrap gap-1 sm:w-auto"
        aria-label="Seções do prontuário"
      >
        <TabsTrigger value="dados" className="shrink-0">
          <UserCircle className="size-4 opacity-70" aria-hidden />
          Dados do paciente
        </TabsTrigger>
        <TabsTrigger value="avaliacao" className="shrink-0">
          <ClipboardList className="size-4 opacity-70" aria-hidden />
          Avaliação
        </TabsTrigger>
      </TabsList>

      <TabsContent value="dados" className="space-y-4">
        {dadosTab}
      </TabsContent>
      <TabsContent value="avaliacao" className="space-y-4">
        {avaliacaoTab}
      </TabsContent>
    </Tabs>
  );
}
