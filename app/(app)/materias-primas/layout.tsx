import { requireModulePathAccess } from "@/lib/modules/require-module-path";

export default async function MateriasPrimasModuleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePathAccess("/materias-primas");
  return children;
}
