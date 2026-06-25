export function createOnboardingActionTimer(action: string) {
  const startedAt = Date.now();
  const marks: { step: string; ms: number }[] = [];

  return {
    mark(step: string) {
      marks.push({ step, ms: Date.now() - startedAt });
    },
    finish() {
      if (process.env.NODE_ENV === "production") return;
      const total = Date.now() - startedAt;
      const breakdown = marks.map((m) => `${m.step}=${m.ms}ms`).join(" ");
      console.info(`[onboarding:${action}] total=${total}ms ${breakdown}`);
    },
  };
}
