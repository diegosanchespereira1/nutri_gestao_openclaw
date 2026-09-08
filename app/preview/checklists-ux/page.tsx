import type { Metadata } from "next";

import { ChecklistHubUxPreview } from "@/components/preview/checklist-hub-ux-preview";

export const metadata: Metadata = {
  title: "Preview UX — Checklists",
  robots: { index: false, follow: false },
};

export default function PreviewChecklistsUxPage() {
  return <ChecklistHubUxPreview />;
}
