import { createClient } from "@/lib/supabase/server";

// Downloads everything the signed-in member has on SMB Hub as one JSON file.
export async function GET() {
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
