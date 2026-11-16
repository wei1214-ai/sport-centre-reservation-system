import { requireRole } from "@/lib/auth";
import { getCustomerFitnessProfile } from "@/lib/customer";
import { InitialsAvatar, PageHeader, Pill } from "@/components/ui/primitives";
import {
  CustomerProfileTabs,
} from "@/components/customer/profile-tabs";
import type {
  CustomerFitnessFormValues,
} from "@/components/customer/fitness-form";
import type {
  CustomerProfileFormValues,
} from "@/components/customer/personal-details-form";
import { relativeFromNow } from "@/lib/format";

export const metadata = { title: "My profile" };

export default async function CustomerProfilePage() {
  const profile = await requireRole("customer");
  const fitness = await getCustomerFitnessProfile(profile.id);

  const personal: CustomerProfileFormValues = {
    fullName: profile.full_name,
    email: profile.email,
    phone: profile.phone ?? "",
    gender:
      profile.gender === "Male" || profile.gender === "Female"
        ? profile.gender
        : "",
    dateOfBirth: profile.date_of_birth ?? "",
  };

  const fitnessValues: CustomerFitnessFormValues = {
    heightCm: fitness?.height_cm != null ? String(fitness.height_cm) : "",
    weightKg: fitness?.weight_kg != null ? String(fitness.weight_kg) : "",
    fitnessLevel: fitness?.fitness_level ?? "",
    fitnessGoals: fitness?.fitness_goals ?? "",
    medicalConditions: fitness?.medical_conditions ?? "",
    emergencyContactName: fitness?.emergency_contact_name ?? "",
    emergencyContactPhone: fitness?.emergency_contact_phone ?? "",
  };

  return (
    <div className="grid gap-7">
      <PageHeader
        title="My profile"
        subtitle="Manage your personal details, fitness profile and account security."
        slot={<Pill tone="brandSoft">Customer</Pill>}
      />

      <div className="surface flex items-center gap-3.5 p-4">
        <InitialsAvatar name={profile.full_name} className="size-12 text-base" />
        <div className="min-w-0">
          <p className="truncate text-[0.95rem] font-semibold text-ink">
            {profile.full_name}
          </p>
          <p className="truncate text-[0.76rem] text-subtle">
            {profile.email} · joined {relativeFromNow(profile.created_at)}
          </p>
        </div>
      </div>

      <CustomerProfileTabs
        personal={personal}
        fitness={fitnessValues}
      />
    </div>
  );
}
