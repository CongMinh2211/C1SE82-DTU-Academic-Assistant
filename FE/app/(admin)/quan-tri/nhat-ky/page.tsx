import { ScreenPage } from "@/components/screen-page";
import { HistoryAudit } from "@/features/audit/history-audit";

export default function Page() {
  return (
    <ScreenPage screen="audit">
      <HistoryAudit />
    </ScreenPage>
  );
}
