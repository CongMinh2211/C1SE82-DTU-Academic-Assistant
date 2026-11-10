import { endpoint } from "@/server/http";
import { uploadToken } from "@/server/cloud-uploads";
export const runtime = "nodejs";
export const POST = endpoint(uploadToken);
