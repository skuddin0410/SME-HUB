"use server";

import { createClient } from "@/lib/supabase/server";
import { courseMail, siteUrl } from "@/lib/courses-mail";
import { CTOPICS, topicInbox, topicLabel } from "@/lib/contact";
import { headers } from "next/headers";
import { humanOk } from "@/lib/safety/server";

export type ContactInput = { name: string; email: string; business: string; topic: string; message: string; website?: string; human?: string };

/**
 * Update 24: a message from the Contact us page. Saved in the database (only the team can read it), sent to the inbox
 * for its topic (support@smehub.ca or info@canadiansme.ca, replying goes straight to the sender) and a copy is
 * emailed to the sender.
 */
export async function sendContact(input: ContactInput): Promise<{ ok?: boolean; error?: string }> {
  if (input.website) return { ok: true }; // a hidden field only bots fill in
  const name = String(input.name ?? "").trim().slice(0, 120);
  const email = String(input.email ?? "").trim().slice(0, 200);
  const business = String(input.business ?? "").trim().slice(0, 160);
  const topic = CTOPICS.some((t) => t[0] === input.topic) || input.topic === "other" ? input.topic : "";
  const message = String(input.message ?? "").trim().slice(0, 4000);
  if (!name) return { error: "Please add your name." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Please add an email address we can reply to." };
  if (!topic) return { error: "Please choose what your message is about." };
  if (message.length < 5) return { error: "Please write a short message." };
  // Update 41: the invisible human check
  const ip = ((await headers()).get("x-forwarded-for") ?? "").split(",")[0]?.trim() || "unknown";
  if (!(await humanOk(input.human, ip))) return { error: "We couldn’t confirm you’re a person. Wait for the human check, then send it again." };

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;
  const { error } = await supabase.from("contact_messages").insert({ name, email, business, topic, message, user_id: userId });
  if (error) return { error: error.message.includes("too many") ? "You’ve sent a few messages already. Please wait an hour, or email support@smehub.ca." : "Your message could not be sent. Please email support@smehub.ca." };

  const label = topicLabel(topic);
  const key = `contact-${email}-${Date.now()}`;
  await Promise.all([
    courseMail("contact-inbox", { email: topicInbox(topic), name: "SME Hub" }, {
      ct_topic: label, ct_name: name, ct_email: email, ct_business: business ? `, ${business}` : "", ct_message: message, admin_url: `${siteUrl()}/cms`,
    }, `${key}-in`, email),
    courseMail("contact-copy", { email, name }, { ct_topic: label.toLowerCase(), ct_message: message }, `${key}-copy`),
  ]);
  return { ok: true };
}
