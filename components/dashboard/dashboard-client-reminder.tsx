import { getServerContext } from "@/lib/supabase/get-server-user";
import { countClientsForOwner } from "@/lib/supabase/profile";
import { FirstClientReminderToast } from "@/components/dashboard/first-client-reminder-toast";

export async function DashboardClientReminder() {
  const { supabase, workspaceOwnerId } = await getServerContext();
  if (!workspaceOwnerId) return null;

  const clientCount = await countClientsForOwner(supabase, workspaceOwnerId);
  return <FirstClientReminderToast hasClients={clientCount > 0} />;
}
