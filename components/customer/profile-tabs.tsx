"use client";

import { Activity, KeyRound, ShieldAlert, UserRound } from "lucide-react";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs-dialog";
import {
  FitnessForm,
  type CustomerFitnessFormValues,
} from "@/components/customer/fitness-form";
import { DeleteAccountCard } from "@/components/customer/delete-account-card";
import { PasswordForm } from "@/components/customer/password-form";
import {
  PersonalDetailsForm,
  type CustomerProfileFormValues,
} from "@/components/customer/personal-details-form";

export function CustomerProfileTabs({
  personal,
  fitness,
}: {
  personal: CustomerProfileFormValues;
  fitness: CustomerFitnessFormValues;
}) {
  return (
    <Tabs defaultValue="personal" className="surface p-4 sm:p-5">
      <TabsList>
        <TabsTrigger value="personal">
          <UserRound className="size-3.5" />
          Personal
        </TabsTrigger>
        <TabsTrigger value="fitness">
          <Activity className="size-3.5" />
          Fitness
        </TabsTrigger>
        <TabsTrigger value="security">
          <KeyRound className="size-3.5" />
          Security
        </TabsTrigger>
        <TabsTrigger value="account">
          <ShieldAlert className="size-3.5" />
          Account
        </TabsTrigger>
      </TabsList>

      <TabsContent value="personal">
        <PersonalDetailsForm initial={personal} />
      </TabsContent>

      <TabsContent value="fitness">
        <FitnessForm initial={fitness} />
      </TabsContent>

      <TabsContent value="security">
        <PasswordForm />
      </TabsContent>

      <TabsContent value="account">
        <DeleteAccountCard />
      </TabsContent>
    </Tabs>
  );
}
