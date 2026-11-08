import { requireTrainerRecord, listTrainerInquiries, listCustomerProfileLabels } from "@/lib/trainer";
import { PageHeader, EmptyState } from "@/components/ui/primitives";
import { InquiriesList } from "@/components/trainer/inquiries-list";
import type { InquiryCardData } from "@/components/trainer/inquiry-card";

export const metadata = { title: "Inquiries" };

export default async function InquiriesPage() {
  const { profile, trainer, supabase } = await requireTrainerRecord();
  void profile;
  void trainer;

  const inquiries = await listTrainerInquiries(supabase, trainer.id);
  const labels = await listCustomerProfileLabels(supabase, inquiries.map((i) => i.customer_id));

  const data: InquiryCardData[] = inquiries.map((inquiry) => {
    const label = labels.get(inquiry.customer_id);
    return {
      id: inquiry.id,
      subject: inquiry.subject,
      message: inquiry.message,
      reply: inquiry.reply,
      inquiry_status: inquiry.inquiry_status,
      created_at: inquiry.created_at,
      replied_at: inquiry.replied_at,
      classTitle: inquiry.classTitle,
      customerName: label?.full_name ?? "Customer",
      customerEmail: label?.email ?? "",
    };
  });

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Inquiries"
        subtitle="Pre-enrollment questions from customers. Replies notify the customer."
      />
      {data.length ? (
        <InquiriesList inquiries={data} />
      ) : (
        <EmptyState
          className="border-dashed"
          title="No inquiries yet"
          description="When a customer asks about one of your classes before enrolling, the question shows up here."
        />
      )}
    </div>
  );
}
