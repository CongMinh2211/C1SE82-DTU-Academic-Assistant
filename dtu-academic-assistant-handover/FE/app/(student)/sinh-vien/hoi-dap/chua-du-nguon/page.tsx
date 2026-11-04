import { ScreenPage } from "@/components/screen-page";
import { ChatPage } from "@/features/chat/chat-page";

export default function Page() {
  return (
    <ScreenPage screen="fallback">
      <ChatPage />
    </ScreenPage>
  );
}
