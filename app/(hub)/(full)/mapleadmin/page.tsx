import { teamViewer, TeamWrap } from "@/components/zip/team";
import { MapleAdmin, type MaAnswer, type MaRepeated, type MaReport } from "@/components/maple/admin";
import { mapleEdge } from "@/lib/maple-server";

export const metadata = { title: "Maple answer library | SME Hub team", robots: { index: false } };

/** Update 47: the Hub team's answer library and token report, through the maple-admin Edge Function. */
export default async function MapleAdminPage() {
  const { supabase, gate } = await teamViewer("The Maple answer library");
  if (gate) return gate;
  const [list, rep, report] = await Promise.all([
    mapleEdge<{ answers?: MaAnswer[] }>(supabase, "maple-admin", { action: "list" }),
    mapleEdge<{ questions?: MaRepeated[] }>(supabase, "maple-admin", { action: "repeated" }),
    mapleEdge<MaReport & { error?: string }>(supabase, "maple-admin", { action: "report" }),
  ]);
  const ok = (r: { status: number } | null) => !!r && r.status === 200;
  return (
    <TeamWrap>
      <MapleAdmin
        answers={ok(list) ? list!.data.answers ?? [] : []}
        repeated={ok(rep) ? rep!.data.questions ?? [] : []}
        report={ok(report) ? report!.data : null}
        setUp={ok(list)}
      />
    </TeamWrap>
  );
}
