"use client";

import dynamic from "next/dynamic";

import type { ComponentProps } from "react";
import type { ClientForm } from "@/components/clientes/client-form";
const ClientFormImpl = dynamic(
  () => import("@/components/clientes/client-form").then((m) => m.ClientForm),
  { loading: () => null },
);

export function ClientFormLazy(props: ComponentProps<typeof ClientForm>) {
  return <ClientFormImpl {...props} />;
}
