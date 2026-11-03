import { ScreenPage } from "@/components/screen-page";
import { StudentHome } from "@/features/student/home";

export default function Page() {
  return (
    <ScreenPage screen="home">
      <StudentHome />
    </ScreenPage>
  );
}
