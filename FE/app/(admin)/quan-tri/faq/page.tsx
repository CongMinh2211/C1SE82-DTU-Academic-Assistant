import { ScreenPage } from "@/components/screen-page";
import { FaqManagement } from "@/features/faqs/management";

export default function Page() {
  return (
    <ScreenPage screen="adminFaq">
      <FaqManagement />
    </ScreenPage>
  );
}
