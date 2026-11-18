import { redirect } from "next/navigation";
import { requireUser } from "@/lib/hub";
import { ProfileForm } from "@/components/hub-client";

export default async function EditProfilePage() {
  const { profile } = await requireUser();
  if (!profile) redirect("/feed");
  return (
    <section className="panel p-6">
      <h1 className="mb-5 text-2xl font-bold">Edit profile</h1>
      <ProfileForm profile={profile} />
    </section>
  );
}
