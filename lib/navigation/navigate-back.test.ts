import { describe, expect, it, vi } from "vitest";

import { navigateBack } from "./navigate-back";

describe("navigateBack", () => {
  it("usa router.back quando há histórico", () => {
    const back = vi.fn();
    const push = vi.fn();
    vi.stubGlobal("window", { history: { length: 3 } });

    navigateBack({ back, push } as never, "/ficha-tecnica");

    expect(back).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("usa fallback quando não há histórico", () => {
    const back = vi.fn();
    const push = vi.fn();
    vi.stubGlobal("window", { history: { length: 1 } });

    navigateBack({ back, push } as never, "/ficha-tecnica");

    expect(back).not.toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith("/ficha-tecnica");
    vi.unstubAllGlobals();
  });
});
