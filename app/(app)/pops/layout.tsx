import { requireModulePathAccess } from "@/lib/modules/require-module-path";

export default async function PopsModuleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePathAccess("/pops");
  return children;
}
