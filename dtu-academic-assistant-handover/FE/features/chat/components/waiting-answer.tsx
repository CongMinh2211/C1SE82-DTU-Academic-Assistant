// Mục đích file: Hiển thị trạng thái chờ khi hệ thống đang xử lý câu hỏi.
"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

export function WaitingAnswer({ onStop }: { onStop: () => void }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const start = Date.now();
    const timer = window.setInterval(
      () => setElapsed(Math.floor((Date.now() - start) / 1000)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, []);
  return (
    <div className="answer-bubble loading-answer" role="status">
      <div className="waiting-copy">
        <span className="typing-dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span>
          Mình đang xử lý câu hỏi… <small aria-hidden="true">{elapsed}s</small>
        </span>
      </div>
      <Button variant="outline" onClick={onStop}>
        Dừng chờ
      </Button>
      {elapsed >= 12 && (
        <p className="waiting-detail">
          Câu hỏi cần đối chiếu nguồn hoặc lập kế hoạch có thể mất thêm thời
          gian. Bạn có thể tiếp tục chờ hoặc dừng yêu cầu.
        </p>
      )}
    </div>
  );
}
