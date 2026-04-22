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
    <div className="px-4 py-3 text-sm">
      <p className="text-sidebar-foreground">
        Olá, <span className="font-medium">{firstName}</span>
      </p>
    </div>
  );
}
