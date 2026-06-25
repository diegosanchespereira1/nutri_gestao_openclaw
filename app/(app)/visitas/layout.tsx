import { requireModulePathAccess } from "@/lib/modules/require-module-path";

export default async function VisitasModuleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePathAccess("/visitas");
  return children;
}
