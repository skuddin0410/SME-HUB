import { getMe } from "@/lib/hub";
import { fieldClass } from "@/components/hub";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { updateProfile } from "@/app/(hub)/actions";

export default async function EditProfilePage() {
  const { profile } = await getMe();
  const fields = [
    { name: "full_name", label: "Full name", required: true, max: 80 },
    { name: "headline", label: "Headline (e.g. Founder, Maple Bakery)", max: 120 },
    { name: "location", label: "City and province", max: 80 },
    { name: "website", label: "Website", max: 200 },
  ] as const;

  return (
    <Card className="p-6">
      <h1 className="mb-4 text-xl font-bold">Edit profile</h1>
      <form action={updateProfile} className="flex flex-col gap-4">
        {fields.map((f) => (
          <div key={f.name} className="grid gap-1.5">
            <Label htmlFor={f.name}>{f.label}</Label>
            <input
              id={f.name}
              name={f.name}
              defaultValue={profile?.[f.name] ?? ""}
              required={"required" in f}
              maxLength={f.max}
              className={fieldClass}
            />
          </div>
        ))}
        <div className="grid gap-1.5">
          <Label htmlFor="bio">About</Label>
          <textarea id="bio" name="bio" rows={5} maxLength={2000} defaultValue={profile?.bio ?? ""} className={fieldClass} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="avatar">Profile photo (up to 2 MB)</Label>
          <input id="avatar" name="avatar" type="file" accept="image/*" className="text-sm" />
        </div>
        <Button type="submit" className="self-start">
          Save profile
        </Button>
      </form>
    </Card>
  );
}
