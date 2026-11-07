import { ScreenPage } from "@/components/screen-page";
import { DocumentManagement } from "@/features/documents/document-management";

export default function Page() {
  return (
    <ScreenPage screen="documents">
      <DocumentManagement />
    </ScreenPage>
  );
}
