// Mục đích file: Tạo vector cho câu hỏi hoặc nội dung tài liệu để hỗ trợ tìm kiếm theo ngữ nghĩa.
// Chỉ nhập kiểu của pipeline; thư viện chạy mô hình được tải động khi thật sự cần.
import type { FeatureExtractionPipeline } from "@huggingface/transformers";
import path from "node:path";
import { existsSync } from "node:fs";
import { dataDir, embeddingModel } from "../config";

// Đặt model trong volume dữ liệu, không tải lại chỉ vì container được tạo lại.
const cacheDir = path.join(dataDir, "models");
// Ghim revision để truy vấn và tài liệu không vô tình dùng hai phiên bản model khác nhau.
const modelRevision = "761b726dd34fb83930e26aab4e9ac3899aa1fa78";
// Giữ một pipeline cho mỗi tiến trình; các tiến trình worker/API vẫn có RAM riêng.
const runtime = globalThis as unknown as {
  dtuEmbedder?: Promise<FeatureExtractionPipeline>;
};
async function extractor() {
  // Tái sử dụng promise khởi tạo để các yêu cầu đồng thời không tải mô hình nhiều lần.
  if (!runtime.dtuEmbedder) {
    // Đường dẫn trùng cấu trúc model được phục hồi từ bộ bàn giao.
    const localModel = path.join(cacheDir, embeddingModel, modelRevision);
    // Chỉ coi cache đầy đủ khi có cả cấu hình, tokenizer và trọng số lượng tử hóa.
    const cached = [
      "config.json",
      "tokenizer.json",
      "tokenizer_config.json",
      "onnx/model_quantized.onnx",
    ].every((file) => existsSync(path.join(localModel, file)));
    // Khi bộ nhớ đệm đủ file, dùng đường dẫn local để tránh phụ thuộc mạng.
    runtime.dtuEmbedder = (async () => {
      // Import muộn giúp các API không dùng RAG tránh phải nạp ONNX ngay lúc khởi động.
      const { pipeline, env } = await import("@huggingface/transformers");
      // Chỉ định nơi tải/lưu model; môi trường local đã có đủ file sẽ không cần mạng.
      env.cacheDir = cacheDir;
      // Cho phép pipeline đọc model từ đường dẫn trên ổ đĩa.
      env.allowLocalModels = true;
      // Khi phải tải, yêu cầu đúng revision đã ghim thay vì bản mới nhất trên Hugging Face.
      env.remotePathTemplate = `{model}/resolve/${modelRevision}/`;
      return pipeline(
        // feature-extraction trả biểu diễn số của văn bản, không sinh câu trả lời.
        "feature-extraction",
        // Dùng thư mục local khi đủ file, nếu thiếu mới dùng tên model để resolve.
        cached ? localModel : embeddingModel,
        {
          revision: modelRevision,
          cache_dir: cacheDir,
          local_files_only: cached,
          // q8 giảm kích thước trọng số/RAM; không phải thay đổi số chiều đầu ra.
          dtype: "q8",
          // Backend local sử dụng CPU, không yêu cầu GPU của máy sinh viên.
          device: "cpu",
          // Giới hạn số luồng ONNX để tránh mỗi request chiếm toàn bộ CPU.
          session_options: { intraOpNumThreads: 2, interOpNumThreads: 1 },
        },
      );
    })().catch((error) => {
      // Xóa promise lỗi để một lần gọi sau có thể thử khởi tạo lại.
      runtime.dtuEmbedder = undefined;
      // Giữ lỗi để caller báo thất bại; không trả vector giả khi khởi tạo model lỗi.
      throw error;
    });
  }
  // Caller await cùng promise cho tới khi pipeline sẵn sàng.
  return runtime.dtuEmbedder;
}
// Chuyển câu hỏi hoặc đoạn tài liệu thành vector để so sánh mức độ liên quan.
export async function embedTexts(texts: string[], kind: "query" | "passage") {
  // Xử lý theo nhóm tối đa tám đoạn để hạn chế bộ nhớ; dùng tiền tố phù hợp loại dữ liệu.
  const extract = await extractor();
  // Gom kết quả theo đúng thứ tự đầu vào để ID chunk không bị gắn nhầm vector.
  const result: number[][] = [];
  for (let i = 0; i < texts.length; i += 8) {
    const tensor = await extract(
      // Model E5 phân biệt câu hỏi và nội dung tài liệu qua tiền tố query/passage.
      texts.slice(i, i + 8).map((t) => `${kind}: ${t}`),
      // Trung bình các token và chuẩn hóa vector trước khi so độ tương đồng cosine.
      { pooling: "mean", normalize: true },
    );
    // Chuyển tensor đã chuẩn hóa thành mảng số để bộ lưu vector có thể sử dụng.
    result.push(...(tensor.tolist() as number[][]));
  }
  // Mỗi phần tử là vector ứng với một chuỗi đầu vào; hàm này không ghi database.
  return result;
}
