"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";

import { ChecklistInProgressItemLink } from "@/components/dashboard/checklist-in-progress-item";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PaginationControls } from "@/components/ui/pagination-controls";
import { filterInProgressItems } from "@/lib/dashboard/checklists-in-progress";
import type { ChecklistInProgressItem } from "@/lib/dashboard/checklists-in-progress";
import { CHECKLISTS_EM_ANDAMENTO_PATH } from "@/lib/routes";

type Props = {
  items: ChecklistInProgressItem[];
  timeZone: string;
  showProfessional: boolean;
};

const ITEMS_PER_COLUMN = 10;

function useGridColumnCount(): number {
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const update = () => setColumnCount(mq.matches ? 2 : 1);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return columnCount;
}

export function ChecklistInProgressList({
  items,
  timeZone,
  showProfessional,
}: Props) {
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const columnCount = useGridColumnCount();
  const pageSize = ITEMS_PER_COLUMN * columnCount;

  const filtered = useMemo(
    () => filterInProgressItems(items, searchTerm),
    [items, searchTerm],
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="in-progress-search">Buscar</Label>
        <div className="relative">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            id="in-progress-search"
            type="search"
            value={searchTerm}
            autoComplete="off"
            onChange={(event) => {
              setSearchTerm(event.target.value);
              setPage(1);
            }}
            placeholder="Cliente, checklist ou estabelecimento"
            className="min-h-11 pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="text-muted-foreground text-sm" role="status">
          Nenhum checklist em andamento corresponde à busca.
        </p>
      ) : (
        <>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {pageItems.map((item) => (
              <li key={item.sessionId}>
                <ChecklistInProgressItemLink
                  item={item}
                  timeZone={timeZone}
                  showProfessional={showProfessional}
                  returnTo={CHECKLISTS_EM_ANDAMENTO_PATH}
                />
              </li>
            ))}
          </ul>
          <PaginationControls
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </>
      )}
    </div>
  );
}
