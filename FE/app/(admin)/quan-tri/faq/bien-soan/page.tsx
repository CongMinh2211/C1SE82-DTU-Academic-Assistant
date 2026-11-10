import { ScreenPage } from "@/components/screen-page";
import { FaqEditor } from "@/features/faqs/editor";

export default function Page() {
  return (
    <ScreenPage screen="faqEditor">
      <FaqEditor />
    </ScreenPage>
  );
}
