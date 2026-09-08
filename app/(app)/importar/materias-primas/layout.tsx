import { requireModulePathAccess } from "@/lib/modules/require-module-path";

export default async function ImportarMateriasPrimasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePathAccess("/importar/materias-primas");
  return children;
}
