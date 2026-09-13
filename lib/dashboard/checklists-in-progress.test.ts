import { describe, expect, it } from "vitest";

import {
  buildInProgressAriaLabel,
  buildInProgressContinueHref,
  buildInProgressKpiHint,
  calendarDayUtcRange,
  clampInProgressLimit,
  CHECKLISTS_IN_PROGRESS_LIST_LIMIT,
  clientDisplayName,
  filterInProgressItems,
  inProgressOwnerFilter,
  isChecklistInProgress,
  isChecklistSessionId,
  isTouchedOnCalendarDay,
  matchesInProgressSearch,
  summarizeChecklistsInProgress,
  type ChecklistInProgressItem,
} from "@/lib/dashboard/checklists-in-progress";

const TZ = "America/Sao_Paulo";
const REF = new Date("2026-09-07T15:00:00Z");

function item(
  overrides: Partial<ChecklistInProgressItem> = {},
): ChecklistInProgressItem {
  return {
    sessionId: "11111111-1111-4111-8111-111111111111",
    checklistName: "POP Cozinha",
    clientName: "Colégio Jardim das Flores",
    establishmentName: "Refeitório",
    professionalLabel: "Ana Souza",
    updatedAt: "2026-09-07T14:00:00Z",
    createdAt: "2026-09-07T12:00:00Z",
    touchedToday: true,
    ...overrides,
  };
}

describe("isChecklistInProgress", () => {
  it("considera aberto quando o dossiê ainda não foi aprovado", () => {
    expect(isChecklistInProgress(null)).toBe(true);
    expect(isChecklistInProgress("")).toBe(true);
    expect(isChecklistInProgress("   ")).toBe(true);
  });

  it("exclui dossiê já aprovado", () => {
    expect(isChecklistInProgress("2026-09-07T12:00:00Z")).toBe(false);
  });
});

describe("isTouchedOnCalendarDay", () => {
  it("conta movimento no dia civil do fuso, não em UTC", () => {
    // 00:30 em Brasília = 03:30 UTC no mesmo dia civil.
    expect(isTouchedOnCalendarDay("2026-09-07T03:30:00Z", TZ, REF)).toBe(true);
  });

  it("não conta o dia anterior no fuso mesmo quando o instante é 7/09 em UTC", () => {
    // 23:00 de 6/09 em Brasília = 02:00 UTC de 7/09.
    expect(isTouchedOnCalendarDay("2026-09-07T02:00:00Z", TZ, REF)).toBe(false);
  });
});

describe("summarizeChecklistsInProgress", () => {
  it("só conta sessões abertas e separa o movimento de hoje", () => {
    const summary = summarizeChecklistsInProgress(
      [
        { dossierApprovedAt: null, updatedAt: "2026-09-07T14:00:00Z" },
        { dossierApprovedAt: null, updatedAt: "2026-09-06T14:00:00Z" },
        { dossierApprovedAt: "2026-09-07T14:00:00Z", updatedAt: "2026-09-07T14:00:00Z" },
      ],
      TZ,
      REF,
    );

    expect(summary.inProgressCount).toBe(2);
    expect(summary.todayCount).toBe(1);
  });

  it("hoje nunca ultrapassa o total em andamento", () => {
    const summary = summarizeChecklistsInProgress(
      [
        { dossierApprovedAt: null, updatedAt: "2026-09-07T18:00:00Z" },
        { dossierApprovedAt: null, updatedAt: "2026-09-07T19:00:00Z" },
      ],
      TZ,
      REF,
    );
    expect(summary.todayCount).toBe(summary.inProgressCount);
  });
});

describe("calendarDayUtcRange", () => {
  it("rejeita chave inválida", () => {
    expect(calendarDayUtcRange("07/09/2026", TZ)).toBeNull();
    expect(calendarDayUtcRange("2026-9-7", TZ)).toBeNull();
  });

  it("devolve meia-noite de Brasília em UTC (sem horário de verão)", () => {
    const range = calendarDayUtcRange("2026-09-07", TZ);
    expect(range).toEqual({
      startIso: "2026-09-07T03:00:00.000Z",
      endExclusiveIso: "2026-09-08T03:00:00.000Z",
    });
  });
});

describe("buildInProgressKpiHint", () => {
  it("pluraliza em português", () => {
    expect(buildInProgressKpiHint(0)).toBe("nenhum movimento hoje · ver lista");
    expect(buildInProgressKpiHint(1)).toBe("1 com movimento hoje · ver lista");
    expect(buildInProgressKpiHint(3)).toBe("3 com movimento hoje · ver lista");
  });
});

describe("buildInProgressAriaLabel", () => {
  it("anuncia o total em andamento e o de hoje", () => {
    expect(
      buildInProgressAriaLabel({ inProgressCount: 1, todayCount: 1 }),
    ).toBe("Ver 1 checklist em andamento. 1 com movimento hoje.");
    expect(
      buildInProgressAriaLabel({ inProgressCount: 4, todayCount: 2 }),
    ).toBe("Ver 4 checklists em andamento. 2 com movimento hoje.");
  });
});

describe("matchesInProgressSearch", () => {
  it("busca em cliente, modelo, estabelecimento e profissional", () => {
    const row = item();
    expect(matchesInProgressSearch(row, "jardim")).toBe(true);
    expect(matchesInProgressSearch(row, "POP")).toBe(true);
    expect(matchesInProgressSearch(row, "refeitório")).toBe(true);
    expect(matchesInProgressSearch(row, "ana")).toBe(true);
    expect(matchesInProgressSearch(row, "hospital")).toBe(false);
  });

  it("não interpreta a busca como regex (ReDoS)", () => {
    const row = item();
    expect(matchesInProgressSearch(row, "(.*)+")).toBe(false);
    expect(matchesInProgressSearch(row, "")).toBe(true);
    expect(matchesInProgressSearch(row, "   ")).toBe(true);
  });
});

describe("filterInProgressItems", () => {
  it("não devolve sessões que não batem com a busca", () => {
    const rows = [
      item({ clientName: "Escola A", checklistName: "RDC 216" }),
      item({
        sessionId: "22222222-2222-4222-8222-222222222222",
        clientName: "Hospital B",
        checklistName: "POP Cozinha",
      }),
    ];
    expect(filterInProgressItems(rows, "hospital")).toHaveLength(1);
    expect(filterInProgressItems(rows, "hospital")[0]?.clientName).toBe("Hospital B");
  });
});

describe("inProgressOwnerFilter", () => {
  it("gestor vê o workspace; campo só o próprio user_id", () => {
    expect(inProgressOwnerFilter(true, "user-campo")).toBeNull();
    expect(inProgressOwnerFilter(false, "user-campo")).toEqual({
      onlyUserId: "user-campo",
    });
  });
});

describe("clampInProgressLimit", () => {
  it("impede lista ilimitada e valores inválidos", () => {
    expect(clampInProgressLimit(Number.POSITIVE_INFINITY)).toBe(
      CHECKLISTS_IN_PROGRESS_LIST_LIMIT,
    );
    expect(clampInProgressLimit(0)).toBe(1);
    expect(clampInProgressLimit(-8)).toBe(1);
    expect(clampInProgressLimit(10_000)).toBe(CHECKLISTS_IN_PROGRESS_LIST_LIMIT);
    expect(clampInProgressLimit(12.9)).toBe(12);
  });
});

describe("clientDisplayName", () => {
  it("prefere nome fantasia e cai para razão social", () => {
    expect(clientDisplayName("Flores", "Colégio Jardim das Flores Ltda")).toBe(
      "Flores",
    );
    expect(clientDisplayName("  ", "Colégio Jardim das Flores Ltda")).toBe(
      "Colégio Jardim das Flores Ltda",
    );
    expect(clientDisplayName(null, null)).toBe("Cliente");
  });
});

describe("isChecklistSessionId", () => {
  it("aceita UUID e rejeita path injection", () => {
    expect(isChecklistSessionId("11111111-1111-4111-8111-111111111111")).toBe(
      true,
    );
    expect(isChecklistSessionId("../admin")).toBe(false);
    expect(isChecklistSessionId("javascript:alert(1)")).toBe(false);
    expect(isChecklistSessionId("11111111-1111-4111-8111-111111111111/../x")).toBe(
      false,
    );
  });
});

describe("buildInProgressContinueHref", () => {
  it("monta o href interno com UUID válido", () => {
    expect(
      buildInProgressContinueHref(
        "11111111-1111-4111-8111-111111111111",
        "/checklists/em-andamento",
      ),
    ).toBe(
      "/checklists/preencher/11111111-1111-4111-8111-111111111111?returnTo=%2Fchecklists%2Fem-andamento",
    );
  });

  it("bloqueia open redirect e path injection", () => {
    expect(
      buildInProgressContinueHref("../admin", "/checklists/em-andamento"),
    ).toBeNull();
    expect(
      buildInProgressContinueHref(
        "11111111-1111-4111-8111-111111111111",
        "https://evil.example/phish",
      ),
    ).toBe(
      "/checklists/preencher/11111111-1111-4111-8111-111111111111?returnTo=%2Fdashboard",
    );
    expect(
      buildInProgressContinueHref(
        "11111111-1111-4111-8111-111111111111",
        "javascript:alert(1)",
      ),
    ).toBe(
      "/checklists/preencher/11111111-1111-4111-8111-111111111111?returnTo=%2Fdashboard",
    );
  });
});
