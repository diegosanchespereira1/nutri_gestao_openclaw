import { describe, expect, it } from "vitest";

import { limitsPatchFromPlan } from "@/lib/signup/limits-from-plan";

describe("limitsPatchFromPlan", () => {
  it("mapeia caps positivos", () => {
    expect(
      limitsPatchFromPlan({
        max_clients: 15,
        max_patients: 50,
        max_team_members: 1,
      }),
    ).toEqual({
      clients_limit_enabled: true,
      clients_limit: 15,
      patients_limit_enabled: true,
      patients_limit: 50,
      team_members_enabled: true,
      team_members_unlimited: false,
      team_members_limit: 1,
    });
  });

  it("enterprise ilimitado e equipe zero desligada", () => {
    expect(
      limitsPatchFromPlan({
        max_clients: -1,
        max_patients: -1,
        max_team_members: -1,
      }),
    ).toMatchObject({
      clients_limit_enabled: false,
      patients_limit_enabled: false,
      team_members_enabled: true,
      team_members_unlimited: true,
    });

    expect(
      limitsPatchFromPlan({
        max_clients: 3,
        max_patients: 10,
        max_team_members: 0,
      }).team_members_enabled,
    ).toBe(false);
  });
});
