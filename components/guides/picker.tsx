"use client";
import { useRouter } from "next/navigation";

/** On phones the province menu becomes a drop-down (Update 13). */
export function ProvincePicker({ current, options }: { current: string; options: [string, string][] }) {
  const router = useRouter();
  return (
    <label className="pgmsel" htmlFor="pgmsel">
      <span>Province or territory</span>
      <select id="pgmsel" value={current} onChange={(e) => router.push(`/guides/${e.target.value}`)}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}
