import { ScreenPage } from "@/components/screen-page";
import { AdminDashboard } from "@/features/admin/dashboard";

export default function Page() {
  return (
    <ScreenPage screen="dashboard">
      <AdminDashboard />
    </ScreenPage>
  );
}
