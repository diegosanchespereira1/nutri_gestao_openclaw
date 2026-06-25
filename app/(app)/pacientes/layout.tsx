import { requireModulePathAccess } from "@/lib/modules/require-module-path";

export default async function PacientesModuleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePathAccess("/pacientes");
  return children;
}
