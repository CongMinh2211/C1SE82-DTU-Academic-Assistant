import { ScreenPage } from "@/components/screen-page";
import { StudentFaq } from "@/features/faqs/student-faq";

export default function Page() {
  return (
    <ScreenPage screen="faq">
      <StudentFaq />
    </ScreenPage>
  );
}
