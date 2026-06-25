import { requireModulePathAccess } from "@/lib/modules/require-module-path";

export default async function ChecklistsModuleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireModulePathAccess("/checklists");
  return children;
}
