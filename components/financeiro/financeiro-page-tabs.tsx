"use client";

import type { FinanceiroTabValue } from "@/lib/financeiro/financeiro-tab";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Props = {
  defaultTab: FinanceiroTabValue;
  resumo: React.ReactNode;
  operacoes: React.ReactNode;
};

export function FinanceiroPageTabs({ defaultTab, resumo, operacoes }: Props) {
  return (
    <Tabs
      key={defaultTab}
      defaultValue={defaultTab}
      className="w-full gap-4"
    >
      <TabsList aria-label="Secções do módulo financeiro">
        <TabsTrigger value="resumo">Resumo e análise</TabsTrigger>
        <TabsTrigger value="operacoes">Cobranças e registos</TabsTrigger>
      </TabsList>
      <TabsContent value="resumo" className="mt-0 border-0 bg-transparent p-0 shadow-none">
        {resumo}
      </TabsContent>
      <TabsContent
        value="operacoes"
        className="mt-0 border-0 bg-transparent p-0 shadow-none"
      >
        {operacoes}
      </TabsContent>
    </Tabs>
  );
}
