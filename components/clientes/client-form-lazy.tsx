"use client";

import dynamic from "next/dynamic";

import type { ComponentProps } from "react";
import type { ClientForm } from "@/components/clientes/client-form";

const ClientFormImpl = dynamic(
  () => import("@/components/clientes/client-form").then((m) => m.ClientForm),
  {
    loading: () => (
      <div
        className="border-border bg-card max-w-3xl animate-pulse rounded-xl border p-6"
        aria-hidden
      >
        <div className="bg-muted mb-4 h-8 w-48 rounded-md" />
        <div className="space-y-3">
          <div className="bg-muted h-10 rounded-md" />
          <div className="bg-muted h-10 rounded-md" />
          <div className="bg-muted h-24 rounded-md" />
        </div>
      </div>
    ),
  },
);

export function ClientFormLazy(props: ComponentProps<typeof ClientForm>) {
  return <ClientFormImpl {...props} />;
}
