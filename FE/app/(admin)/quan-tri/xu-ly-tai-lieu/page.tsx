import { ScreenPage } from "@/components/screen-page";
import { IndexingStatus } from "@/features/documents/indexing-status";

export default function Page() {
  return (
    <ScreenPage screen="indexing">
      <IndexingStatus />
    </ScreenPage>
  );
}
