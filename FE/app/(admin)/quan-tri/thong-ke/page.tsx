import { ScreenPage } from "@/components/screen-page";
import { UsageAnalytics } from "@/components/admin-usage";

export default function Page() {
  return (
    <ScreenPage screen="analytics">
      <UsageAnalytics />
    </ScreenPage>
  );
}
