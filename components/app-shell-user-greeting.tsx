export function AppShellUserGreeting({ firstName }: { firstName: string | null }) {
  if (!firstName) {
    return null;
  }

  return (
    <div className="bg-primary mx-2 rounded-md px-3 py-2.5">
      <p className="text-primary-foreground text-sm leading-snug">
        Olá,{" "}
        <span className="text-primary-foreground text-base font-bold tracking-tight">
          {firstName}
        </span>
      </p>
    </div>
  );
}
