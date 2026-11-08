"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs-dialog";
import { EmptyState } from "@/components/ui/primitives";
import { InquiryCard, type InquiryCardData } from "@/components/trainer/inquiry-card";

export function InquiriesList({ inquiries }: { inquiries: InquiryCardData[] }) {
  const router = useRouter();
  const open = inquiries.filter((i) => i.inquiry_status === "open");
  const answered = inquiries.filter((i) => i.inquiry_status === "answered");
  const closed = inquiries.filter((i) => i.inquiry_status === "closed");

  return (
    <Tabs defaultValue="open" onValueChange={() => router.refresh}>
      <TabsList>
        <TabsTrigger value="open">Open ({open.length})</TabsTrigger>
        <TabsTrigger value="answered">Answered ({answered.length})</TabsTrigger>
        <TabsTrigger value="closed">Closed ({closed.length})</TabsTrigger>
      </TabsList>

      <TabsContent value="open" className="grid gap-2.5">
        {open.length ? (
          open.map((inquiry) => <InquiryCard key={inquiry.id} inquiry={inquiry} />)
        ) : (
          <EmptyState
            className="border-dashed"
            title="No open inquiries"
            description="New pre-enrollment questions from customers appear here."
          />
        )}
      </TabsContent>
      <TabsContent value="answered" className="grid gap-2.5">
        {answered.length ? (
          answered.map((inquiry) => <InquiryCard key={inquiry.id} inquiry={inquiry} />)
        ) : (
          <EmptyState className="border-dashed" title="Nothing answered yet" />
        )}
      </TabsContent>
      <TabsContent value="closed" className="grid gap-2.5">
        {closed.length ? (
          closed.map((inquiry) => <InquiryCard key={inquiry.id} inquiry={inquiry} />)
        ) : (
          <EmptyState className="border-dashed" title="No closed inquiries" />
        )}
      </TabsContent>
    </Tabs>
  );
}
