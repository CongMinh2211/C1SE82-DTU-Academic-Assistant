import { ScreenPage } from "@/components/screen-page";
import { SourceDetail } from "@/features/sources/source-detail";

export default function Page() {
  return (
    <ScreenPage screen="source">
      <SourceDetail />
    </ScreenPage>
  );
}
