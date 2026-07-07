import { ChecklistFillSkeleton } from "@/components/checklists/checklist-skeletons";

/** Skeleton inline — ocupa só o `<main>`, sem cobrir a sidebar (≥ lg). */
export default function ChecklistPreencherLoading() {
  return <ChecklistFillSkeleton />;
}
