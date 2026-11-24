"use client";
import { useRouter } from "next/navigation";

/** On phones the province menu becomes a drop-down (Update 13). */
export function ProvincePicker({ current, options, base = "/guides", label = "Province or territory" }: { current: string; options: [string, string][]; base?: string; label?: string }) {
  const router = useRouter();
  return (
    <label className="pgmsel" htmlFor="pgmsel">
      <span>{label}</span>
      <select id="pgmsel" value={current} onChange={(e) => router.push(`${base}/${e.target.value}`)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
