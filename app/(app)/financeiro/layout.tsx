import { requireModulePathAccess } from "@/lib/modules/require-module-path";

export default async function FinanceiroModuleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePathAccess("/financeiro");
  return children;
}
