import { academicTopics } from "./academic-topics";
export const usageTopics = [
  ...academicTopics.map((topic) => topic.label),
  "Hỗ trợ học tập",
  "Trò chuyện",
  "Thông tin DTU / khác",
];
export type UsageReport = {
  days: number;
  from: string;
  to: string;
  timeZone: string;
  topic: string;
  total: number;
  daily: { date: string; count: number }[];
  topics: { label: string; count: number; percentage: number }[];
  outcomes: { status: string; count: number; percentage: number }[];
};
