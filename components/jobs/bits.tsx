import { bizColour, bizInitials, type JobBiz } from "@/lib/jobs-shared";

/** A business's logo, or its initials on its colour (as the guide's bzLogo). */
export function BizLogo({ b, size = "l" }: { b: Pick<JobBiz, "id" | "name" | "logo">; size?: "l" | "s" }) {
  return b.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <span className={`av ${size} bzav`} aria-hidden="true"><img src={b.logo} alt="" /></span>
  ) : (
    <span className={`av ${size} bzav`} aria-hidden="true" style={{ background: bizColour(b.id), color: "#fff", fontWeight: 800 }}>{bizInitials(b.name)}</span>
  );
}
