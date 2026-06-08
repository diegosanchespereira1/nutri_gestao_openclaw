"use client";

import dynamic from "next/dynamic";

import type { ComponentProps } from "react";
import type { ClientForm } from "@/components/clientes/client-form";

function FormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" aria-hidden>
      <div className="h-10 rounded-lg bg-muted" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-10 rounded-lg bg-muted" />
        <div className="h-10 rounded-lg bg-muted" />
      </div>
      <div className="h-10 rounded-lg bg-muted" />
      <div className="h-24 rounded-lg bg-muted" />
      <div className="h-10 w-32 rounded-lg bg-muted" />
    </div>
  );
}

const ClientFormImpl = dynamic(
  () => import("@/components/clientes/client-form").then((m) => m.ClientForm),
  { loading: () => <FormSkeleton /> },
);

export function ClientFormLazy(props: ComponentProps<typeof ClientForm>) {
  return <ClientFormImpl {...props} />;
}
