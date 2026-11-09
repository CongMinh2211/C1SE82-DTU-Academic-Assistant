import { ScreenPage } from "@/components/screen-page";
import { StudentHistory } from "@/features/conversations/history";

export default function Page() {
  return (
    <ScreenPage screen="history">
      <StudentHistory />
    </ScreenPage>
  );
}
