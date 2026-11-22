"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { BarChart3, CalendarClock, ImagePlus, Lock, Plus, X } from "lucide-react";
import { useImageUpload } from "@/lib/upload";
import { FEED } from "@/lib/feed-rules";

const FIELD = "w-full rounded-lg bg-white border border-[#E5E5E8] px-2.5 py-1.5 text-xs text-zinc-900 focus:outline-none focus:border-blue-600";
const TOGGLE = "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 hover:bg-[#F5F5F6] aria-pressed:bg-blue-50 aria-pressed:text-blue-700";

/** The optional parts of a post: cover picture, poll, schedule and closing comments. Sent along with the form. */
export function ComposerOptions({ onBusy }: { onBusy?: (busy: boolean) => void }) {
  const cover = useImageUpload("cover");
  const [poll, setPoll] = useState(false);
  const [options, setOptions] = useState(["", ""]);
  const [schedule, setSchedule] = useState(false);
  const [offset, setOffset] = useState(0);

  const busy = cover.busy;
  useEffect(() => onBusy?.(busy), [busy, onBusy]);

  return (
    <div className="space-y-3">
      <input type="hidden" name="cover_url" value={cover.url} />
      {schedule && <input type="hidden" name="tz_offset" value={offset} />}

      <div className="flex flex-wrap items-center gap-1">
        <label className={`${TOGGLE} cursor-pointer`}>
          <ImagePlus className="h-3.5 w-3.5 text-blue-600" />
          {cover.preview ? "Change cover" : "Add cover"}
          <input type="file" accept="image/*" className="sr-only" aria-label="Cover picture" onChange={(e) => cover.pick(e.target.files?.[0])} />
        </label>
        <button type="button" aria-pressed={poll} onClick={() => setPoll((v) => !v)} className={TOGGLE}>
          <BarChart3 className="h-3.5 w-3.5" /> Poll
        </button>
        <button
          type="button"
          aria-pressed={schedule}
          onClick={() => {
            setSchedule((v) => !v);
            setOffset(new Date().getTimezoneOffset());
          }}
          className={TOGGLE}
        >
          <CalendarClock className="h-3.5 w-3.5" /> Schedule
        </button>
        <label className={`${TOGGLE} cursor-pointer`}>
          <Lock className="h-3.5 w-3.5" />
          <input type="checkbox" name="comments_closed" value="1" className="h-3 w-3" />
          Close comments
        </label>
      </div>

      {cover.error && <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-700">{cover.error}</p>}
      {cover.preview && (
        <div className="relative overflow-hidden rounded-xl border border-[#E5E5E8] bg-zinc-100">
          <img src={cover.preview} alt="Cover preview" className="h-32 w-full object-cover" />
          <button type="button" aria-label="Remove cover" onClick={cover.clear} className="absolute right-2 top-2 rounded-full bg-zinc-900/70 p-1.5 text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {poll && (
        <fieldset className="space-y-2 rounded-xl border border-[#E5E5E8] bg-[#F5F5F6]/50 p-3">
          <legend className="px-1 text-[11px] font-semibold text-zinc-700">Poll options</legend>
          {options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                name="poll_option"
                value={o}
                maxLength={FEED.pollOptionMax}
                onChange={(e) => setOptions((all) => all.map((x, j) => (j === i ? e.target.value : x)))}
                placeholder={`Option ${i + 1}`}
                aria-label={`Poll option ${i + 1}`}
                className={FIELD}
              />
              {options.length > FEED.pollMin && (
                <button type="button" aria-label={`Remove option ${i + 1}`} onClick={() => setOptions((all) => all.filter((_, j) => j !== i))} className="text-zinc-400 hover:text-rose-600">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {options.length < FEED.pollMax ? (
              <button type="button" onClick={() => setOptions((all) => [...all, ""])} className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline">
                <Plus className="h-3 w-3" /> Add option
              </button>
            ) : (
              <span className="text-[11px] text-zinc-500">Up to {FEED.pollMax} options</span>
            )}
            <label className="flex items-center gap-1.5 text-xs text-zinc-600">
              Closes after
              <select name="poll_days" defaultValue="3" className="rounded-lg border border-[#E5E5E8] bg-white px-2 py-1 text-xs">
                {[1, 3, 7, 14, 30].map((d) => (
                  <option key={d} value={d}>
                    {d} {d === 1 ? "day" : "days"}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>
      )}

      {schedule && (
        <label className="flex flex-wrap items-center gap-2 text-xs text-zinc-700">
          Publish on
          <input type="datetime-local" name="scheduled_local" required className={`${FIELD} !w-auto`} aria-label="Publish date and time" />
          <span className="text-[11px] text-zinc-500">Up to {FEED.scheduleMaxDays} days ahead, in your time zone.</span>
        </label>
      )}
    </div>
  );
}
