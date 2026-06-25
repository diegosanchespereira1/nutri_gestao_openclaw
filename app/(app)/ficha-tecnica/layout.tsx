import { requireModulePathAccess } from "@/lib/modules/require-module-path";

export default async function FichaTecnicaModuleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePathAccess("/ficha-tecnica");
  return children;
}
