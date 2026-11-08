export type Citation = { id: string; title: string; version?: string; section?: string; url?: string };
export type ChatAnswer = { answer: string; citations: Citation[]; fallback: boolean };
export type Pagination = { page: number; pageSize: number; total: number };
