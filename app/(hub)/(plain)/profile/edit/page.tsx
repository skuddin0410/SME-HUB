import { customFields } from "@/lib/zip/profile-fields";
import { getHubSettings } from "@/lib/zip/settings-load";
import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/hub";
import { ProfileForm } from "@/components/hub-client";
import { DetailsForm } from "@/components/profile-extras";
import { loadOwnDetails } from "@/lib/profile-data";

export default async function EditProfilePage() {
  const { profile, supabase, userId } = await requireUser();
  if (!profile) redirect("/feed");
  const details = await loadOwnDetails(supabase, userId);
  const type = (profile as unknown as { profile_type?: string }).profile_type ?? "owner";
  return (
    <>
      <section className="panel p-6">
        <h1 className="mb-5 text-2xl font-bold">Edit profile</h1>
        <ProfileForm profile={profile} />
      </section>
      <section className="panel mt-3 p-6">
        <h2 className="mb-1 text-xl font-semibold">How you can help</h2>
        <p className="mb-5 text-sm text-muted-foreground">
          This is what members search for in the directory. You choose who sees each part in <Link href="/settings" className="font-semibold text-primary hover:underline">privacy settings</Link>.
        </p>
        <DetailsForm details={details} profileType={type} nets={(await getHubSettings("profiles")).nets as Record<string, boolean>} extra={customFields((await getHubSettings("profiles")).fields).filter((f) => !f.lock)} />
      </section>
    </>
  );
}
