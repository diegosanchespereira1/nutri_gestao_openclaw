import { beforeEach, describe, expect, it, vi } from "vitest";

import { emitPatientResponsibleActivityLog } from "@/lib/patients/responsible-audit";

const logPatientResponsibleChange = vi.fn();

vi.mock("@/lib/actions/patient-responsible-history", () => ({
  logPatientResponsibleChange: (...args: unknown[]) =>
    logPatientResponsibleChange(...args),
}));

function mockSupabase(names: Record<string, string | null>) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: null,
          }),
        }),
      }),
    }),
  } as never;
}

describe("emitPatientResponsibleActivityLog", () => {
  beforeEach(() => {
    logPatientResponsibleChange.mockClear();
  });

  it("não regista se responsável não mudou", async () => {
    await emitPatientResponsibleActivityLog({
      supabase: mockSupabase({}),
      patientId: "p1",
      previousTeamMemberId: "tm-1",
      nextTeamMemberId: "tm-1",
    });
    expect(logPatientResponsibleChange).not.toHaveBeenCalled();
  });

  it("regista assigned na criação", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { full_name: "Ana" },
            }),
          }),
        }),
      }),
    } as never;

    await emitPatientResponsibleActivityLog({
      supabase,
      patientId: "p1",
      previousTeamMemberId: null,
      nextTeamMemberId: "tm-1",
      isCreate: true,
    });

    expect(logPatientResponsibleChange).toHaveBeenCalledWith(
      expect.objectContaining({
        operation: "assigned",
        toTeamMemberName: "Ana",
      }),
    );
  });

  it("regista removed", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { full_name: "Ana" },
            }),
          }),
        }),
      }),
    } as never;

    await emitPatientResponsibleActivityLog({
      supabase,
      patientId: "p1",
      previousTeamMemberId: "tm-1",
      nextTeamMemberId: null,
    });

    expect(logPatientResponsibleChange).toHaveBeenCalledWith(
      expect.objectContaining({ operation: "removed" }),
    );
  });
});
