import { describe, expect, it } from "vitest";

import {
  ALL_PROFESSIONALS,
  buildVisitProfessionalOptions,
  parseProfessionalFilter,
  userProfessionalFilterKey,
  visitMatchesProfessionalFilter,
  visitProfessionalFilterKey,
} from "@/lib/visits/visit-professional-filter";

const MEMBER_A = "11111111-1111-4111-8111-111111111111";
const MEMBER_B = "22222222-2222-4222-8222-222222222222";
const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function visit(partial: {
  assigned_team_member_id?: string | null;
  user_id?: string;
  team_members?: { full_name: string } | null;
  creator_full_name?: string | null;
}) {
  return {
    assigned_team_member_id: partial.assigned_team_member_id ?? null,
    user_id: partial.user_id ?? USER_A,
    team_members: partial.team_members ?? null,
    creator_full_name: partial.creator_full_name ?? null,
  };
}

describe("visitProfessionalFilterKey", () => {
  it("usa o membro atribuído quando existe", () => {
    expect(
      visitProfessionalFilterKey(visit({ assigned_team_member_id: MEMBER_A })),
    ).toBe(MEMBER_A);
  });

  it("cai no criador quando não há atribuição", () => {
    expect(visitProfessionalFilterKey(visit({ user_id: USER_A }))).toBe(
      userProfessionalFilterKey(USER_A),
    );
  });
});

describe("visitMatchesProfessionalFilter", () => {
  const memberUsers = new Map<string, string | null>([
    [MEMBER_A, USER_A],
    [MEMBER_B, USER_B],
  ]);

  it("Todos inclui qualquer visita", () => {
    expect(
      visitMatchesProfessionalFilter(
        visit({ assigned_team_member_id: MEMBER_B }),
        ALL_PROFESSIONALS,
        memberUsers,
      ),
    ).toBe(true);
  });

  it("filtra pelo membro atribuído", () => {
    expect(
      visitMatchesProfessionalFilter(
        visit({ assigned_team_member_id: MEMBER_A }),
        MEMBER_A,
        memberUsers,
      ),
    ).toBe(true);
    expect(
      visitMatchesProfessionalFilter(
        visit({ assigned_team_member_id: MEMBER_A }),
        MEMBER_B,
        memberUsers,
      ),
    ).toBe(false);
  });

  it("visita sem atribuição entra no membro cujo utilizador é o criador", () => {
    expect(
      visitMatchesProfessionalFilter(
        visit({ user_id: USER_A }),
        MEMBER_A,
        memberUsers,
      ),
    ).toBe(true);
    expect(
      visitMatchesProfessionalFilter(
        visit({ user_id: USER_A }),
        MEMBER_B,
        memberUsers,
      ),
    ).toBe(false);
  });
});

describe("buildVisitProfessionalOptions", () => {
  it("lista ativos e inclui criadores sem equipe", () => {
    const options = buildVisitProfessionalOptions(
      [
        visit({
          assigned_team_member_id: MEMBER_A,
          team_members: { full_name: "Ana" },
        }),
        visit({
          user_id: USER_B,
          creator_full_name: "Bruno Titular",
        }),
      ],
      [
        {
          id: MEMBER_A,
          full_name: "Ana Souza",
          is_active: true,
        },
        {
          id: MEMBER_B,
          full_name: "Inativa",
          is_active: false,
        },
      ],
    );

    expect(options[0]?.value).toBe(ALL_PROFESSIONALS);
    expect(options.map((option) => option.value)).toEqual([
      ALL_PROFESSIONALS,
      MEMBER_A,
      userProfessionalFilterKey(USER_B),
    ]);
    expect(options[2]?.label).toBe("Bruno Titular");
  });
});

describe("parseProfessionalFilter", () => {
  it("volta para todos se o valor não existe", () => {
    expect(
      parseProfessionalFilter("nope", [
        { value: ALL_PROFESSIONALS, label: "Todos os profissionais" },
      ]),
    ).toBe(ALL_PROFESSIONALS);
  });
});
