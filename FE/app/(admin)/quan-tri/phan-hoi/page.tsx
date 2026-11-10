import { ScreenPage } from "@/components/screen-page";
import { FeedbackReview } from "@/features/feedback/admin-review";

export default function Page() {
  return (
    <ScreenPage screen="review">
      <FeedbackReview />
    </ScreenPage>
  );
}
