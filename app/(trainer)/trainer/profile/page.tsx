import { requireTrainerRecord } from "@/lib/trainer";
import { PageHeader, InitialsAvatar, Pill } from "@/components/ui/primitives";
import {
  TrainerProfileForm,
  type TrainerProfileFormValues,
} from "@/components/trainer/profile-form";
import { relativeFromNow } from "@/lib/format";

export const metadata = { title: "Profile" };

export default async function TrainerProfilePage() {
  const { profile, trainer } = await requireTrainerRecord();

  const initial: TrainerProfileFormValues = {
    fullName: profile.full_name,
    phone: profile.phone ?? "",
    specialization: trainer.specialization ?? "",
    qualifications: trainer.qualifications ?? "",
    experienceYears: trainer.experience_years ?? 0,
    bio: trainer.bio ?? "",
    contactEmail: trainer.contact_email ?? "",
    contactPhone: trainer.contact_phone ?? "",
  };

  return (
    <div className="grid gap-7">
      <PageHeader
        title="Profile"
        subtitle="Shown to customers when they look at your classes."
        slot={<Pill tone="brandSoft">Trainer</Pill>}
      />

      <div className="surface flex items-center gap-3.5 p-4">
        <InitialsAvatar name={profile.full_name} className="size-12 text-base" />
        <div className="min-w-0">
          <p className="text-[0.95rem] font-semibold text-ink">{profile.full_name}</p>
          <p className="text-[0.76rem] text-subtle">
            {profile.email} · joined {relativeFromNow(profile.created_at)}
          </p>
        </div>
      </div>

      <div className="surface p-5">
        <TrainerProfileForm initial={initial} />
      </div>
    </div>
  );
}
