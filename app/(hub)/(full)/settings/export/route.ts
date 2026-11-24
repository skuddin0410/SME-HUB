import { createClient } from "@/lib/supabase/server";
import { getHubSettings } from "@/lib/zip/settings-load";

// Downloads everything the signed-in member has on SME Hub as one JSON file.
export async function GET() {
  if (!(await getHubSettings("profiles")).exportData) return new Response("Downloading your data is turned off. Ask the Hub team.", { status: 403 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("export_my_data");
  if (error || !data) return new Response("Sign in to download your data.", { status: 401 });
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json",
      "content-disposition": 'attachment; filename="smb-hub-my-data.json"',
      "cache-control": "no-store",
    },
  });
}
