"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function AppShellUserGreeting() {
  const [firstName, setFirstName] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserName() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user?.id) return;

        const { data, error } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!error && data?.full_name) {
          const first = data.full_name.split(" ")[0];
          setFirstName(first);
        }
      } catch (error) {
        console.error("Erro ao carregar nome do usuário:", error);
      }
    }

    loadUserName();
  }, []);

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
